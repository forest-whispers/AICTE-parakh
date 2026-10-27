import React, { useState, useEffect } from "react";

interface ExtractedFieldData<T = any> {
  state: "PRESENT" | "NOT_FOUND" | "ILLEGIBLE" | "AMBIGUOUS" | "NOT_APPLICABLE";
  value: T | null;
  rawText: string | null;
  pageNumber: number | null;
  excerpt: string | null;
  uncertaintyReason: string | null;
}

interface DocumentEnvelope {
  documentId: string;
  classifiedType: string;
  classificationConfidence: "HIGH" | "MEDIUM" | "LOW";
  classificationReasoning: string;
  pageCount: number | null;
  extractionStatus: "SUCCESS" | "PARTIAL" | "FAILED";
  generalRemarks: string | null;
  [key: string]: any;
}

interface UploadedDocument {
  id: string;
  originalName: string;
  fileName: string;
  documentType: string;
  mimeType: string;
  fileSize: number;
  extractionStatus: string;
  extractedData?: DocumentEnvelope | { error?: string; batchError?: string } | null;
}

interface ApplicationData {
  id: string;
  institutionName: string;
  applicationNumber: string;
  status: string;
  createdAt: string;
  documents: UploadedDocument[];
}

const DOCUMENT_TYPES = [
  { value: "DOC_01_REGISTRATION", label: "DOC-01: Registration & MoA" },
  { value: "DOC_02_RESOLUTION", label: "DOC-02: Organisation Resolution (Format 3)" },
  { value: "DOC_03_LAND_DEED", label: "DOC-03: Registered Land/Lease Deed" },
  { value: "DOC_04_LEASE_AFFIDAVIT", label: "DOC-04: Irrevocable Lease Joint Affidavit" },
  { value: "DOC_05_LAND_USE", label: "DOC-05: Land Use Certificate (LUC)" },
  { value: "DOC_06_BUILDING_PLAN", label: "DOC-06: Approved Building Plan & Room Schedule" },
  { value: "DOC_07_OCCUPANCY", label: "DOC-07: Occupancy / Completion Certificate" },
  { value: "DOC_08_STRUCTURAL_STABILITY", label: "DOC-08: Structural Stability Certificate" },
  { value: "DOC_09_FIRE_SAFETY", label: "DOC-09: Fire Safety Certificate" },
  { value: "DOC_10_BANK_FUNDS", label: "DOC-10: Bank Certificate of Funds (Certificate 3)" },
  { value: "DOC_11_AFFIDAVIT_2", label: "DOC-11: Affidavit 2 (AICTE Undertaking)" },
  { value: "DOC_14_SITE_MAP", label: "DOC-14: Geo-Tagged Site Map" },
  { value: "UNRECOGNIZED", label: "Unspecified / Auto-Detect" },
];

const API_BASE_URL = "http://localhost:3000";

export default function App() {
  const [institutionName, setInstitutionName] = useState("");
  const [applicationNumber, setApplicationNumber] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileDocTypes, setFileDocTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [activeApplication, setActiveApplication] = useState<ApplicationData | null>(null);

  const fetchApplications = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/applications`);
      const json = await res.json();
      if (json.success) {
        setApplications(json.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch applications:", err);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
      setFileDocTypes(filesArray.map(() => "UNRECOGNIZED"));
    }
  };

  const handleDocTypeChange = (index: number, newType: string) => {
    setFileDocTypes((prev) => {
      const updated = [...prev];
      updated[index] = newType;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setErrorMessage(null);

    if (!institutionName.trim() || !applicationNumber.trim()) {
      setErrorMessage("Please enter both Institution Name and Application Number.");
      return;
    }

    if (selectedFiles.length === 0) {
      setErrorMessage("Please select at least one document (PDF, JPG, or PNG).");
      return;
    }

    const formData = new FormData();
    formData.append("institutionName", institutionName.trim());
    formData.append("applicationNumber", applicationNumber.trim());
    formData.append("documentTypes", JSON.stringify(fileDocTypes));

    for (const file of selectedFiles) {
      formData.append("documents", file);
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/applications`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Upload failed");
      }

      if (json.extractionSuccess === false) {
        setMessage(`Application created, but VLM extraction reported error: ${json.extractionError}`);
      } else {
        setMessage(`Application ${json.data.applicationNumber} created and extracted successfully!`);
      }

      setActiveApplication(json.data);
      setInstitutionName("");
      setApplicationNumber("");
      setSelectedFiles([]);
      setFileDocTypes([]);
      fetchApplications();
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleReExtract = async (appId: string) => {
    setExtracting(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/applications/${appId}/extract`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Extraction failed");
      }
      setActiveApplication(json.data);
      setMessage("VLM Extraction completed!");
      fetchApplications();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to run extraction.");
    } finally {
      setExtracting(false);
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case "PRESENT":
        return "#2e7d32"; // green
      case "NOT_FOUND":
        return "#757575"; // gray
      case "ILLEGIBLE":
        return "#d32f2f"; // red
      case "AMBIGUOUS":
        return "#ed6c02"; // orange
      case "NOT_APPLICABLE":
        return "#9c27b0"; // purple
      default:
        return "#000000";
    }
  };

  // Helper to extract the populated doc-specific block from the envelope
  const getDocSpecificFields = (envelope: DocumentEnvelope) => {
    const docKeyMap: Record<string, string> = {
      DOC_01_REGISTRATION: "doc01Registration",
      DOC_02_RESOLUTION: "doc02Resolution",
      DOC_03_LAND_DEED: "doc03LandDeed",
      DOC_04_LEASE_AFFIDAVIT: "doc04LeaseAffidavit",
      DOC_05_LAND_USE: "doc05LandUse",
      DOC_06_BUILDING_PLAN: "doc06BuildingPlan",
      DOC_07_OCCUPANCY: "doc07Occupancy",
      DOC_08_STRUCTURAL_STABILITY: "doc08StructuralStability",
      DOC_09_FIRE_SAFETY: "doc09FireSafety",
      DOC_10_BANK_FUNDS: "doc10BankFunds",
      DOC_11_AFFIDAVIT_2: "doc11Affidavit2",
      DOC_14_SITE_MAP: "doc14SiteMap",
    };

    const targetKey = docKeyMap[envelope.classifiedType];
    if (targetKey && envelope[targetKey]) {
      return envelope[targetKey] as Record<string, ExtractedFieldData>;
    }
    return null;
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "1100px", margin: "0 auto" }}>
      <h2>AICTE New Institution – Intake & VLM Extraction Inspector</h2>
      <p style={{ color: "#666" }}>
        Verification console for multimodal single-request VLM extraction, APH document classification, and structured field evidence.
      </p>

      {/* Upload Form */}
      <fieldset style={{ marginBottom: "20px", padding: "15px" }}>
        <legend><strong>New Institution Application Submission</strong></legend>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "10px" }}>
            <label><strong>Proposed Institution Name: </strong></label>
            <input
              type="text"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              placeholder="e.g. Apex Institute of Technology"
              style={{ width: "350px", marginLeft: "10px" }}
              required
            />
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label><strong>AICTE Application Number: </strong></label>
            <input
              type="text"
              value={applicationNumber}
              onChange={(e) => setApplicationNumber(e.target.value)}
              placeholder="e.g. AICTE-2026-NEW-901"
              style={{ width: "350px", marginLeft: "10px" }}
              required
            />
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label><strong>Select Documents (PDF, JPG, PNG): </strong></label>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              style={{ marginLeft: "10px" }}
            />
          </div>

          {selectedFiles.length > 0 && (
            <div style={{ marginBottom: "15px" }}>
              <h4>Selected Files:</h4>
              <table border={1} cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Size (KB)</th>
                    <th>MIME Type</th>
                    <th>Claimed Type</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedFiles.map((file, idx) => (
                    <tr key={idx}>
                      <td>{file.name}</td>
                      <td>{(file.size / 1024).toFixed(1)} KB</td>
                      <td>{file.type || "unknown"}</td>
                      <td>
                        <select
                          value={fileDocTypes[idx] || "UNRECOGNIZED"}
                          onChange={(e) => handleDocTypeChange(idx, e.target.value)}
                        >
                          {DOCUMENT_TYPES.map((dt) => (
                            <option key={dt.value} value={dt.value}>
                              {dt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div>
            <button type="submit" disabled={loading} style={{ padding: "8px 18px", fontWeight: "bold" }}>
              {loading ? "Uploading & Running VLM Extraction..." : "Upload & Run Automated Extraction"}
            </button>
          </div>
        </form>
      </fieldset>

      {/* Notifications */}
      {message && <div style={{ color: "green", marginBottom: "15px" }}><strong>{message}</strong></div>}
      {errorMessage && <div style={{ color: "red", marginBottom: "15px" }}><strong>{errorMessage}</strong></div>}

      {/* Active Application Inspector */}
      {activeApplication && (
        <fieldset style={{ marginBottom: "25px", padding: "15px" }}>
          <legend><strong>Inspected Application: {activeApplication.applicationNumber}</strong></legend>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p><strong>Institution:</strong> {activeApplication.institutionName}</p>
              <p><strong>Application Status:</strong> <code>{activeApplication.status}</code></p>
              <p><strong>Documents Count:</strong> {activeApplication.documents.length}</p>
            </div>
            <div>
              <button
                onClick={() => handleReExtract(activeApplication.id)}
                disabled={extracting}
                style={{ padding: "8px 16px" }}
              >
                {extracting ? "Extracting..." : "Re-run VLM Extraction"}
              </button>
            </div>
          </div>

          <h3>Ingested Documents & Extraction Results</h3>

          {activeApplication.documents.map((doc, docIdx) => {
            const envelope = doc.extractedData as DocumentEnvelope | undefined;
            const hasError = (doc.extractedData as any)?.error || (doc.extractedData as any)?.batchError;
            const fieldsObj = envelope ? getDocSpecificFields(envelope) : null;

            return (
              <div
                key={doc.id}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  padding: "15px",
                  marginBottom: "20px",
                  backgroundColor: doc.extractionStatus === "SUCCESS" ? "#fbfdff" : "#fffbfa",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <h4>
                      Doc #{docIdx + 1}: {doc.originalName}{" "}
                      <span style={{ fontSize: "12px", color: "#666" }}>
                        ({(doc.fileSize / 1024).toFixed(1)} KB, {doc.mimeType})
                      </span>
                    </h4>
                    <p style={{ margin: "4px 0" }}>
                      <strong>Recognized Type: </strong>
                      <code>{envelope?.classifiedType || doc.documentType}</code>
                      {envelope?.classificationConfidence && (
                        <span style={{ marginLeft: "10px", fontSize: "13px" }}>
                          (Confidence: <strong>{envelope.classificationConfidence}</strong>)
                        </span>
                      )}
                    </p>
                    {envelope?.classificationReasoning && (
                      <p style={{ margin: "4px 0", fontSize: "13px", color: "#555" }}>
                        <em>Reasoning:</em> {envelope.classificationReasoning}
                      </p>
                    )}
                  </div>
                  <div>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "4px",
                        backgroundColor:
                          doc.extractionStatus === "SUCCESS"
                            ? "#e8f5e9"
                            : doc.extractionStatus === "PENDING"
                            ? "#fff8e1"
                            : "#ffebee",
                        color:
                          doc.extractionStatus === "SUCCESS"
                            ? "#2e7d32"
                            : doc.extractionStatus === "PENDING"
                            ? "#f57f17"
                            : "#c62828",
                        fontWeight: "bold",
                      }}
                    >
                      {doc.extractionStatus}
                    </span>
                    <div style={{ marginTop: "6px", textAlign: "right" }}>
                      <a href={`${API_BASE_URL}/uploads/${doc.fileName}`} target="_blank" rel="noreferrer">
                        View Stored File
                      </a>
                    </div>
                  </div>
                </div>

                {/* Error Banner */}
                {hasError && (
                  <div style={{ color: "#d32f2f", marginTop: "10px", padding: "8px", backgroundColor: "#ffebee" }}>
                    <strong>Extraction Error:</strong> {hasError}
                  </div>
                )}

                {/* General Remarks */}
                {envelope?.generalRemarks && (
                  <p style={{ fontSize: "13px", color: "#666", marginTop: "8px" }}>
                    <strong>Remarks:</strong> {envelope.generalRemarks}
                  </p>
                )}

                {/* Extracted Fields Table */}
                {fieldsObj ? (
                  <div style={{ marginTop: "15px" }}>
                    <h5>Extracted Field Data & Evidence:</h5>
                    <table border={1} cellPadding={6} style={{ borderCollapse: "collapse", width: "100%", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f0f0f0" }}>
                          <th style={{ width: "20%" }}>Field Name</th>
                          <th style={{ width: "12%" }}>State</th>
                          <th style={{ width: "22%" }}>Extracted Value</th>
                          <th style={{ width: "22%" }}>Verbatim Raw Text</th>
                          <th style={{ width: "6%" }}>Page</th>
                          <th style={{ width: "18%" }}>Provenance / Uncertainty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(fieldsObj).map(([fieldName, fieldData]) => {
                          const f = fieldData as ExtractedFieldData;
                          const displayValue =
                            f.value === null || f.value === undefined
                              ? "—"
                              : typeof f.value === "object"
                              ? JSON.stringify(f.value)
                              : String(f.value);

                          return (
                            <tr key={fieldName}>
                              <td><code>{fieldName}</code></td>
                              <td>
                                <strong style={{ color: getStateColor(f.state) }}>{f.state}</strong>
                              </td>
                              <td><strong>{displayValue}</strong></td>
                              <td>{f.rawText || "—"}</td>
                              <td>{f.pageNumber ?? "—"}</td>
                              <td>
                                {f.excerpt && (
                                  <div style={{ fontSize: "11px", color: "#444", marginBottom: "4px" }}>
                                    <em>Excerpt:</em> "{f.excerpt}"
                                  </div>
                                )}
                                {f.uncertaintyReason && (
                                  <div style={{ fontSize: "11px", color: "#d32f2f" }}>
                                    <em>Note:</em> {f.uncertaintyReason}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  doc.extractionStatus === "SUCCESS" && (
                    <p style={{ color: "#777", fontSize: "13px", marginTop: "10px" }}>
                      No type-specific block populated (classified as {envelope?.classifiedType}).
                    </p>
                  )
                )}
              </div>
            );
          })}
        </fieldset>
      )}

      {/* All Applications Directory */}
      <fieldset style={{ padding: "15px" }}>
        <legend>
          <strong>Database Application Directory ({applications.length})</strong>
          <button onClick={fetchApplications} style={{ marginLeft: "10px" }}>Refresh</button>
        </legend>
        {applications.length === 0 ? (
          <p>No applications stored yet.</p>
        ) : (
          <table border={1} cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th>App Number</th>
                <th>Institution</th>
                <th>Status</th>
                <th>Docs</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id}>
                  <td><strong>{app.applicationNumber}</strong></td>
                  <td>{app.institutionName}</td>
                  <td><code>{app.status}</code></td>
                  <td>{app.documents?.length || 0}</td>
                  <td>{new Date(app.createdAt).toLocaleString()}</td>
                  <td>
                    <button onClick={() => setActiveApplication(app)}>Inspect Results</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </fieldset>
    </div>
  );
}
