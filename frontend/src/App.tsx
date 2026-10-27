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

interface FindingEvidence {
  documentId: string;
  documentType: string;
  fieldName: string;
  rawText: string | null;
  extractedValue: any;
  pageNumber: number | null;
  excerpt: string | null;
}

interface RuleFinding {
  ruleId: string;
  ruleName: string;
  aphClause: string;
  outcome:
    | "PASS"
    | "FAIL_DEFICIENCY"
    | "EXPIRED"
    | "MISMATCH_DETECTED"
    | "EVIDENCE_MISSING"
    | "EXTRACTION_UNCERTAIN"
    | "MANUAL_REVIEW_REQUIRED"
    | "INSUFFICIENT_INPUT"
    | "NOT_APPLICABLE";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "ADVISORY";
  summary: string;
  details: string;
  evidence: FindingEvidence[];
  remediationNote?: string;
}

interface ScrutinyReportData {
  id: string;
  evaluationDate: string;
  overallStatus: "COMPLIANT" | "DEFICIENCIES_DETECTED" | "MANUAL_REVIEW_REQUIRED" | "INSUFFICIENT_INPUT";
  totalRulesRun: number;
  passedCount: number;
  deficiencyCount: number;
  reviewCount: number;
  missingCount: number;
  findings: RuleFinding[];
}

interface ApplicationData {
  id: string;
  institutionName: string;
  applicationNumber: string;
  programCategory?: string | null;
  proposedIntake?: number | null;
  status: string;
  createdAt: string;
  documents: UploadedDocument[];
  scrutinyReports?: ScrutinyReportData[];
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

const API_BASE_URL = "http://localhost:5000";

export default function App() {
  const [institutionName, setInstitutionName] = useState("");
  const [applicationNumber, setApplicationNumber] = useState("");
  const [programCategory, setProgramCategory] = useState("ENGINEERING_AND_TECHNOLOGY");
  const [proposedIntake, setProposedIntake] = useState("300");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileDocTypes, setFileDocTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [evaluatingScrutiny, setEvaluatingScrutiny] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [activeApplication, setActiveApplication] = useState<ApplicationData | null>(null);
  const [activeScrutinyReport, setActiveScrutinyReport] = useState<ScrutinyReportData | null>(null);

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

  const loadApplicationDetails = async (appId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/applications/${appId}`);
      const json = await res.json();
      if (json.success) {
        setActiveApplication(json.data);
        if (json.data.scrutinyReports && json.data.scrutinyReports.length > 0) {
          setActiveScrutinyReport(json.data.scrutinyReports[0]);
        } else {
          setActiveScrutinyReport(null);
        }
      }
    } catch (err) {
      console.error("Failed to load application details:", err);
    }
  };

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
    if (programCategory) formData.append("programCategory", programCategory.trim());
    if (proposedIntake) formData.append("proposedIntake", proposedIntake.trim());
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

      setMessage(`Application ${json.data.applicationNumber} created, extracted, and evaluated!`);
      setActiveApplication(json.data);
      if (json.scrutinyReport) {
        setActiveScrutinyReport(json.scrutinyReport);
      } else if (json.data.scrutinyReports && json.data.scrutinyReports.length > 0) {
        setActiveScrutinyReport(json.data.scrutinyReports[0]);
      } else {
        setActiveScrutinyReport(null);
      }

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

  const handleRunScrutiny = async (appId: string) => {
    setEvaluatingScrutiny(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/applications/${appId}/scrutiny`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Scrutiny evaluation failed");
      }
      setActiveScrutinyReport(json.scrutinyReport);
      setActiveApplication(json.data);
      setMessage("Deterministic scrutiny evaluation complete!");
      fetchApplications();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to evaluate scrutiny.");
    } finally {
      setEvaluatingScrutiny(false);
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
      if (json.scrutinyReport) {
        setActiveScrutinyReport(json.scrutinyReport);
      }
      setMessage("VLM Extraction and subsequent scrutiny completed!");
      fetchApplications();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to run extraction.");
    } finally {
      setExtracting(false);
    }
  };

  const getOutcomeBadgeStyle = (outcome: RuleFinding["outcome"]) => {
    switch (outcome) {
      case "PASS":
        return { backgroundColor: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7" };
      case "FAIL_DEFICIENCY":
        return { backgroundColor: "#ffebee", color: "#c62828", border: "1px solid #ef9a9a" };
      case "EXPIRED":
        return { backgroundColor: "#fbe9e7", color: "#d84315", border: "1px solid #ffab91" };
      case "MISMATCH_DETECTED":
        return { backgroundColor: "#fff3e0", color: "#e65100", border: "1px solid #ffcc80" };
      case "EVIDENCE_MISSING":
        return { backgroundColor: "#f5f5f5", color: "#616161", border: "1px solid #e0e0e0" };
      case "EXTRACTION_UNCERTAIN":
        return { backgroundColor: "#fff8e1", color: "#f57f17", border: "1px solid #ffe082" };
      case "MANUAL_REVIEW_REQUIRED":
        return { backgroundColor: "#ede7f6", color: "#4527a0", border: "1px solid #d1c4e9" };
      case "INSUFFICIENT_INPUT":
        return { backgroundColor: "#eceff1", color: "#37474f", border: "1px solid #cfd8dc" };
      case "NOT_APPLICABLE":
        return { backgroundColor: "#fafafa", color: "#9e9e9e", border: "1px solid #e0e0e0" };
      default:
        return { backgroundColor: "#eee", color: "#333", border: "1px solid #ccc" };
    }
  };

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
    <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "1150px", margin: "0 auto" }}>
      <h2>AICTE New Institution – Scrutiny & Compliance Decision-Support</h2>
      <p style={{ color: "#666" }}>
        Deterministic regulatory compliance scrutiny engine based on the AICTE Approval Process Handbook (APH 2024–2027).
      </p>

      {/* Upload Form */}
      <fieldset style={{ marginBottom: "20px", padding: "15px" }}>
        <legend><strong>New Institution Application Intake</strong></legend>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <div>
              <label><strong>Proposed Institution Name: </strong></label><br />
              <input
                type="text"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="e.g. Apex Institute of Technology"
                style={{ width: "95%", padding: "6px" }}
                required
              />
            </div>
            <div>
              <label><strong>AICTE Application Number: </strong></label><br />
              <input
                type="text"
                value={applicationNumber}
                onChange={(e) => setApplicationNumber(e.target.value)}
                placeholder="e.g. AICTE-2026-NEW-901"
                style={{ width: "95%", padding: "6px" }}
                required
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "15px" }}>
            <div>
              <label><strong>Programme Category: </strong></label><br />
              <select
                value={programCategory}
                onChange={(e) => setProgramCategory(e.target.value)}
                style={{ width: "95%", padding: "6px" }}
              >
                <option value="ENGINEERING_AND_TECHNOLOGY">Engineering & Technology (Min ₹100L funds, 750m² admin)</option>
                <option value="OTHER_TECHNICAL_PROGRAMMES">Other Technical Programmes (Min ₹50L funds)</option>
              </select>
            </div>
            <div>
              <label><strong>Proposed Total Intake: </strong></label><br />
              <input
                type="number"
                value={proposedIntake}
                onChange={(e) => setProposedIntake(e.target.value)}
                placeholder="300"
                style={{ width: "95%", padding: "6px" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label><strong>Select Supporting Documents (PDF, JPG, PNG): </strong></label>
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
              <table border={1} cellPadding={6} style={{ borderCollapse: "collapse", width: "100%", fontSize: "13px" }}>
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Size (KB)</th>
                    <th>Claimed Category</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedFiles.map((file, idx) => (
                    <tr key={idx}>
                      <td>{file.name}</td>
                      <td>{(file.size / 1024).toFixed(1)} KB</td>
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
            <button type="submit" disabled={loading} style={{ padding: "8px 20px", fontWeight: "bold" }}>
              {loading ? "Processing Intake & Automated Scrutiny..." : "Submit & Run Automated Scrutiny"}
            </button>
          </div>
        </form>
      </fieldset>

      {/* Notifications */}
      {message && <div style={{ color: "green", marginBottom: "15px" }}><strong>{message}</strong></div>}
      {errorMessage && <div style={{ color: "red", marginBottom: "15px" }}><strong>{errorMessage}</strong></div>}

      {/* Active Application Scrutiny Dashboard */}
      {activeApplication && (
        <fieldset style={{ marginBottom: "25px", padding: "18px", border: "2px solid #3f51b5" }}>
          <legend>
            <strong style={{ fontSize: "16px", color: "#3f51b5" }}>
              Scrutiny Workspace: {activeApplication.applicationNumber} ({activeApplication.institutionName})
            </strong>
          </legend>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <div>
              <p style={{ margin: "3px 0" }}>
                <strong>Programme:</strong> {activeApplication.programCategory || "Not specified"} |{" "}
                <strong>Proposed Intake:</strong> {activeApplication.proposedIntake ?? "Not specified"}
              </p>
              <p style={{ margin: "3px 0" }}>
                <strong>Application Status: </strong>
                <span style={{ fontWeight: "bold", padding: "2px 8px", backgroundColor: "#e0e0e0", borderRadius: "3px" }}>
                  {activeApplication.status}
                </span>
              </p>
            </div>
            <div>
              <button
                onClick={() => handleRunScrutiny(activeApplication.id)}
                disabled={evaluatingScrutiny}
                style={{ padding: "8px 16px", marginRight: "10px", fontWeight: "bold" }}
              >
                {evaluatingScrutiny ? "Evaluating..." : "Re-run Deterministic Scrutiny"}
              </button>
              <button
                onClick={() => handleReExtract(activeApplication.id)}
                disabled={extracting}
                style={{ padding: "8px 16px" }}
              >
                {extracting ? "Extracting..." : "Re-run VLM Extraction"}
              </button>
            </div>
          </div>

          {/* Scrutiny Report Executive Card */}
          {activeScrutinyReport ? (
            <div style={{ border: "1px solid #bbb", borderRadius: "6px", padding: "15px", marginBottom: "20px", backgroundColor: "#fafafa" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #ddd", paddingBottom: "10px" }}>
                <div>
                  <h3 style={{ margin: "0 0 5px 0" }}>
                    Scrutiny Decision-Support Summary:{" "}
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "4px",
                        color:
                          activeScrutinyReport.overallStatus === "COMPLIANT"
                            ? "#2e7d32"
                            : activeScrutinyReport.overallStatus === "DEFICIENCIES_DETECTED"
                            ? "#c62828"
                            : "#e65100",
                        backgroundColor:
                          activeScrutinyReport.overallStatus === "COMPLIANT"
                            ? "#e8f5e9"
                            : activeScrutinyReport.overallStatus === "DEFICIENCIES_DETECTED"
                            ? "#ffebee"
                            : "#fff3e0",
                      }}
                    >
                      {activeScrutinyReport.overallStatus}
                    </span>
                  </h3>
                  <span style={{ fontSize: "12px", color: "#666" }}>
                    Evaluation Date: <strong>{new Date(activeScrutinyReport.evaluationDate).toLocaleString()}</strong> (Reproducible Baseline)
                  </span>
                </div>
                <div style={{ display: "flex", gap: "12px", textAlign: "center" }}>
                  <div style={{ padding: "6px 12px", backgroundColor: "#e8f5e9", borderRadius: "4px" }}>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: "#2e7d32" }}>{activeScrutinyReport.passedCount}</div>
                    <div style={{ fontSize: "11px", color: "#555" }}>Passed</div>
                  </div>
                  <div style={{ padding: "6px 12px", backgroundColor: "#ffebee", borderRadius: "4px" }}>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: "#c62828" }}>{activeScrutinyReport.deficiencyCount}</div>
                    <div style={{ fontSize: "11px", color: "#555" }}>Deficiencies</div>
                  </div>
                  <div style={{ padding: "6px 12px", backgroundColor: "#ede7f6", borderRadius: "4px" }}>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: "#4527a0" }}>{activeScrutinyReport.reviewCount}</div>
                    <div style={{ fontSize: "11px", color: "#555" }}>Reviews</div>
                  </div>
                  <div style={{ padding: "6px 12px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: "#616161" }}>{activeScrutinyReport.missingCount}</div>
                    <div style={{ fontSize: "11px", color: "#555" }}>Missing</div>
                  </div>
                </div>
              </div>

              {/* Scrutiny Findings Table */}
              <h4 style={{ marginTop: "15px", marginBottom: "10px" }}>Detailed Statutory Rule Scrutiny Findings ({activeScrutinyReport.findings.length} Rules Executed):</h4>
              <table border={1} cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", fontSize: "13px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#eaeaea" }}>
                    <th style={{ width: "22%" }}>Rule & Statutory Clause</th>
                    <th style={{ width: "16%" }}>Outcome</th>
                    <th style={{ width: "34%" }}>Summary & Evaluation Findings</th>
                    <th style={{ width: "28%" }}>Evidence Links & Remediation</th>
                  </tr>
                </thead>
                <tbody>
                  {activeScrutinyReport.findings.map((f, fIdx) => {
                    const badge = getOutcomeBadgeStyle(f.outcome);
                    return (
                      <tr key={fIdx} style={{ backgroundColor: fIdx % 2 === 0 ? "#ffffff" : "#fcfcfc" }}>
                        <td>
                          <strong>{f.ruleName}</strong>
                          <div style={{ fontSize: "11px", color: "#666", marginTop: "3px" }}>
                            <em>{f.aphClause}</em>
                          </div>
                          <div style={{ fontSize: "10px", color: "#999", marginTop: "2px" }}>
                            <code>{f.ruleId}</code>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: "bold",
                              ...badge,
                            }}
                          >
                            {f.outcome}
                          </span>
                          <div style={{ fontSize: "10px", color: "#777", marginTop: "4px" }}>
                            Severity: <strong>{f.severity}</strong>
                          </div>
                        </td>
                        <td>
                          <strong>{f.summary}</strong>
                          <p style={{ margin: "4px 0 0 0", color: "#444", fontSize: "12px" }}>{f.details}</p>
                        </td>
                        <td>
                          {f.remediationNote && (
                            <div style={{ fontSize: "11px", color: "#c62828", marginBottom: "6px" }}>
                              <strong>Action Required:</strong> {f.remediationNote}
                            </div>
                          )}
                          {f.evidence && f.evidence.length > 0 ? (
                            <details style={{ fontSize: "11px", color: "#333" }}>
                              <summary style={{ cursor: "pointer", color: "#1976d2", fontWeight: "bold" }}>
                                View Evidence ({f.evidence.length})
                              </summary>
                              <div style={{ marginTop: "4px", padding: "4px", backgroundColor: "#f5f5f5", borderRadius: "3px" }}>
                                {f.evidence.map((ev, evIdx) => (
                                  <div key={evIdx} style={{ marginBottom: "4px", borderBottom: "1px dashed #ccc", paddingBottom: "2px" }}>
                                    <div>
                                      <code>{ev.documentType}</code> &rarr; <code>{ev.fieldName}</code>: <strong>{String(ev.extractedValue ?? 'null')}</strong>
                                      {ev.pageNumber ? ` (p. ${ev.pageNumber})` : ''}
                                    </div>
                                    {ev.excerpt && <div style={{ color: "#555", fontStyle: "italic" }}>"{ev.excerpt}"</div>}
                                  </div>
                                ))}
                              </div>
                            </details>
                          ) : (
                            <span style={{ fontSize: "11px", color: "#999" }}>No document evidence</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: "#777", fontStyle: "italic" }}>No scrutiny report evaluated yet for this application.</p>
          )}

          {/* Collapsible Document Extractions Inspection */}
          <details style={{ marginTop: "15px" }}>
            <summary style={{ cursor: "pointer", fontWeight: "bold", color: "#3f51b5" }}>
              Inspect Extracted Document Records ({activeApplication.documents.length})
            </summary>
            <div style={{ marginTop: "10px" }}>
              {activeApplication.documents.map((doc, docIdx) => {
                const envelope = doc.extractedData as DocumentEnvelope | undefined;
                const fieldsObj = envelope ? getDocSpecificFields(envelope) : null;

                return (
                  <div
                    key={doc.id}
                    style={{
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      padding: "10px",
                      marginBottom: "15px",
                      backgroundColor: "#fff",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <strong>Doc #{docIdx + 1}: {doc.originalName}</strong> ({doc.mimeType})
                        <div>Recognized: <code>{envelope?.classifiedType || doc.documentType}</code></div>
                      </div>
                      <div>
                        <span style={{ fontWeight: "bold" }}>{doc.extractionStatus}</span>
                      </div>
                    </div>

                    {fieldsObj && (
                      <table border={1} cellPadding={4} style={{ borderCollapse: "collapse", width: "100%", fontSize: "12px", marginTop: "8px" }}>
                        <thead>
                          <tr style={{ backgroundColor: "#f0f0f0" }}>
                            <th>Field</th>
                            <th>State</th>
                            <th>Extracted Value</th>
                            <th>Verbatim Raw Text</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(fieldsObj).map(([key, val]) => (
                            <tr key={key}>
                              <td><code>{key}</code></td>
                              <td><strong>{val.state}</strong></td>
                              <td>{val.value === null ? "—" : typeof val.value === "object" ? JSON.stringify(val.value) : String(val.value)}</td>
                              <td>{val.rawText || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          </details>
        </fieldset>
      )}

      {/* Database Application Directory */}
      <fieldset style={{ padding: "15px" }}>
        <legend>
          <strong>All Applications Directory ({applications.length})</strong>
          <button onClick={fetchApplications} style={{ marginLeft: "10px" }}>Refresh</button>
        </legend>
        {applications.length === 0 ? (
          <p>No applications stored yet.</p>
        ) : (
          <table border={1} cellPadding={6} style={{ borderCollapse: "collapse", width: "100%", fontSize: "13px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f0f0f0" }}>
                <th>App Number</th>
                <th>Institution</th>
                <th>Category</th>
                <th>Status</th>
                <th>Docs</th>
                <th>Scrutiny Findings</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => {
                const latestScrutiny = app.scrutinyReports?.[0];
                return (
                  <tr key={app.id}>
                    <td><strong>{app.applicationNumber}</strong></td>
                    <td>{app.institutionName}</td>
                    <td>{app.programCategory || "—"}</td>
                    <td><code>{app.status}</code></td>
                    <td>{app.documents?.length || 0}</td>
                    <td>
                      {latestScrutiny ? (
                        <span style={{ fontSize: "11px" }}>
                          Passed: <strong>{latestScrutiny.passedCount}</strong> | Deficiencies: <strong>{latestScrutiny.deficiencyCount}</strong> | Reviews: <strong>{latestScrutiny.reviewCount}</strong>
                        </span>
                      ) : (
                        <span style={{ fontSize: "11px", color: "#888" }}>Not evaluated</span>
                      )}
                    </td>
                    <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button onClick={() => loadApplicationDetails(app.id)}>Open Scrutiny</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </fieldset>
    </div>
  );
}
