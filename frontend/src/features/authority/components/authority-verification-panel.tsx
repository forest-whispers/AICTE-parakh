import React, { useState, useEffect, useCallback } from "react";
import { Button } from "../../../shared/ui/button";
import { Badge } from "../../../shared/ui/badge";
import { authorityApi } from "../services/authority-api";
import { BankConfirmationDialog } from "./bank-confirmation-dialog";
import type {
  VerificationBatchSummary,
  AuthorityVerificationRecord,
  HistoricalBatchEntry,
  AuthorityCategory,
  VerificationStatus,
} from "../types/authority.types";

interface AuthorityVerificationPanelProps {
  applicationId: string;
  isMinistryAdmin: boolean;
}

const CATEGORY_METADATA: Record<
  AuthorityCategory,
  {
    title: string;
    authorityName: string;
    source: string;
    docCode: string;
  }
> = {
  SOCIETY_REGISTRAR: {
    title: "Sponsoring Body Registration",
    authorityName: "State Registrar of Public Trusts & Societies (Simulated)",
    source: "Simulated M.P. Public Trusts & Societies Portal",
    docCode: "DOC_01",
  },
  REVENUE_DEPARTMENT: {
    title: "Land Title & Revenue Records",
    authorityName: "State Revenue Department & Bhulekh (Simulated)",
    source: "Simulated Bhulekh Land Records & Registration Portal",
    docCode: "DOC_03 / DOC_05",
  },
  FIRE_SERVICES: {
    title: "Fire Safety NOC",
    authorityName: "State Directorate of Fire & Emergency Services (Simulated)",
    source: "Simulated Fire Safety e-NOC Portal",
    docCode: "DOC_09",
  },
  COUNCIL_OF_ARCHITECTURE: {
    title: "CoA Registered Architect",
    authorityName: "Council of Architecture (CoA) National Roll",
    source: "Simulated CoA Statutory Roll of Architects",
    docCode: "DOC_06",
  },
  BANK_BRANCH: {
    title: "Bank / Deposit Confirmation",
    authorityName: "Scheduled Bank / Branch Management",
    source: "Official Bank Branch Inquiry / Branch Confirmation Letter",
    docCode: "DOC_10",
  },
};

const getStatusBadge = (status?: VerificationStatus) => {
  if (!status) {
    return (
      <Badge variant="neutral" className="text-[11px] bg-[#FAFAF8] text-[#5C6F73] border-[#D7DEDA]">
        NOT EVALUATED
      </Badge>
    );
  }

  switch (status) {
    case "VERIFIED_SIMULATED":
      return (
        <Badge variant="pass" className="text-[11px] bg-[#EBF7EE] text-[#1E7E34] border-[#C3E6CB]">
          ✓ VERIFIED (SIMULATED)
        </Badge>
      );
    case "FORMAT_VALID_UNVERIFIED":
      return (
        <Badge variant="info" className="text-[11px] bg-[#EBF2F1] text-[#165A60] border-[#D7DEDA]">
          ℹ FORMAT VALID (UNVERIFIED)
        </Badge>
      );
    case "MISMATCH_DETECTED":
      return (
        <Badge variant="critical" className="text-[11px] bg-[#FDF2F2] text-[#9E2A2B] border-[#E8C5C5]">
          ⚠️ MISMATCH DETECTED
        </Badge>
      );
    case "EXPIRED_AT_SOURCE":
      return (
        <Badge variant="critical" className="text-[11px] bg-[#FDF2F2] text-[#9E2A2B] border-[#E8C5C5]">
          ⌛ EXPIRED AT SOURCE
        </Badge>
      );
    case "RECORD_NOT_FOUND":
      return (
        <Badge variant="high" className="text-[11px] bg-[#FEF7EC] text-[#8D6B00] border-[#FFE58F]">
          🔍 RECORD NOT FOUND (MOCK)
        </Badge>
      );
    case "FORMAT_INVALID":
      return (
        <Badge variant="critical" className="text-[11px] bg-[#FDF2F2] text-[#9E2A2B] border-[#E8C5C5]">
          ✕ FORMAT INVALID
        </Badge>
      );
    case "CONFIRMATION_PENDING":
      return (
        <Badge variant="high" className="text-[11px] bg-[#FEF7EC] text-[#8D6B00] border-[#FFE58F]">
          ⏱ CONFIRMATION PENDING
        </Badge>
      );
    case "CONFIRMATION_RECORDED":
      return (
        <Badge variant="pass" className="text-[11px] bg-[#EBF7EE] text-[#165A60] border-[#C3E6CB]">
          ✓ CONFIRMATION RECORDED
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral" className="text-[11px]">
          {status}
        </Badge>
      );
  }
};

const getModeBadge = (mode?: string) => {
  if (!mode) return null;
  switch (mode) {
    case "SIMULATED_REGISTRY":
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EBF2F1] text-[#165A60] border border-[#165A60]/20">
          MODE: SIMULATED REGISTRY
        </span>
      );
    case "FORMAT_REGISTRY_CHECK":
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F4F4F2] text-[#5C6F73] border border-[#D7DEDA]">
          MODE: FORMAT VALIDATION ONLY
        </span>
      );
    case "MANUAL_CONFIRMATION_ROUTED":
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EBF7EE] text-[#1E7E34] border border-[#C3E6CB]">
          MODE: OFFICER MANUAL CONFIRMATION
        </span>
      );
    case "SIMULATED_BRANCH_INQUIRY":
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FEF7EC] text-[#8D6B00] border border-[#FFE58F]">
          MODE: BRANCH MANAGEMENT INQUIRY
        </span>
      );
    default:
      return <span className="text-[10px] font-mono text-[#5C6F73]">{mode}</span>;
  }
};

export const AuthorityVerificationPanel: React.FC<AuthorityVerificationPanelProps> = ({
  applicationId,
  isMinistryAdmin,
}) => {
  const [summary, setSummary] = useState<VerificationBatchSummary | null>(null);
  const [history, setHistory] = useState<HistoricalBatchEntry[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [isBankModalOpen, setIsBankModalOpen] = useState<boolean>(false);

  const loadBatch = useCallback(
    async (batchId?: string) => {
      try {
        setIsLoading(true);
        const [batchData, historyData] = await Promise.all([
          authorityApi.getVerifications(applicationId, batchId),
          authorityApi.getHistory(applicationId),
        ]);
        setSummary(batchData);
        setHistory(historyData);
        setSelectedBatchId(batchId || batchData?.batchId || null);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to load authority verification results.";
        setErrorMsg(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [applicationId]
  );

  useEffect(() => {
    let ignore = false;
    Promise.all([
      authorityApi.getVerifications(applicationId),
      authorityApi.getHistory(applicationId),
    ])
      .then(([batchData, historyData]) => {
        if (!ignore) {
          setSummary(batchData);
          setHistory(historyData);
          setSelectedBatchId(batchData?.batchId || null);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const msg =
            err instanceof Error ? err.message : "Failed to load authority verification results.";
          setErrorMsg(msg);
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [applicationId]);

  const handleRunVerification = async () => {
    if (isMinistryAdmin || isVerifying) return;
    setIsVerifying(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await authorityApi.runVerification(applicationId);
      setSummary(res);
      setSelectedBatchId(res.batchId);
      setSuccessMsg(
        `Verification executed successfully: ${res.verifiedSimulatedCount} verified, ${res.mismatchCount} mismatches detected across ${res.totalRun} authorities.`
      );
      // Refresh history
      const historyData = await authorityApi.getHistory(applicationId);
      setHistory(historyData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification execution failed.";
      setErrorMsg(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  const toggleExpand = (cat: string) => {
    setExpandedCards((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Map latest records by authority category
  const verificationMap = new Map<AuthorityCategory, AuthorityVerificationRecord>();
  if (summary?.verifications) {
    for (const v of summary.verifications) {
      verificationMap.set(v.authorityCategory, v);
    }
  }

  const isHistorical =
    selectedBatchId && history.length > 0 && selectedBatchId !== history[0]?.batchId;

  if (isLoading && !summary) {
    return (
      <div className="mt-8 bg-white border border-[#D7DEDA] rounded-[3px] p-8 text-center animate-pulse">
        <div className="inline-block text-[#165A60] font-mono text-sm mb-2">◌ Loading authority verification data...</div>
        <p className="text-xs text-[#5C6F73] m-0">Connecting to statutory registry logs and verification records.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 bg-white border border-[#D7DEDA] rounded-[3px] shadow-sm overflow-hidden select-none">
      {/* Panel Top Navigation & Header Bar */}
      <div className="p-5 sm:p-6 bg-[#FAFAF8] border-b border-[#D7DEDA] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#165A60] font-bold">
              Parallel Statutory Verification Track
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EBEAE5] text-[#5C6F73] font-mono">
              INDEPENDENT DETERMINATION
            </span>
          </div>
          <h2 className="text-[20px] font-bold text-[#172E33] tracking-tight m-0">
            Authority &amp; Registry Cross-Verification
          </h2>
          <p className="text-[12px] text-[#5C6F73] mt-0.5 m-0 max-w-3xl">
            Simulated cross-referencing against State Public Trust Registrars, Bhulekh Land Records, Fire Safety NOCs, Council of Architecture National Rolls, and Scheduled Bank confirmation logs.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* History Batch Selector */}
          {history.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#5C6F73] font-mono">Batch:</span>
              <select
                value={selectedBatchId || ""}
                onChange={(e) => loadBatch(e.target.value)}
                className="text-[11px] font-mono bg-white border border-[#D7DEDA] rounded-[2px] px-2 py-1.5 text-[#172E33]"
              >
                {history.map((h, idx) => (
                  <option key={h.batchId} value={h.batchId}>
                    {idx === 0 ? "Latest Run" : `Batch ${h.batchId.slice(-8)}`} (
                    {new Date(h.verifiedAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Run Verification Button (Assigned Officer Only) */}
          {!isMinistryAdmin && (
            <Button
              type="button"
              onClick={handleRunVerification}
              disabled={isVerifying}
              className="text-[12px] bg-[#165A60] hover:bg-[#124B50] text-white px-4 py-2 rounded-[2px] font-medium shadow-xs inline-flex items-center gap-1.5"
            >
              {isVerifying ? (
                <>
                  <span className="animate-spin text-sm">◌</span>
                  <span>Verifying Registries...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Run Authority Verification</span>
                </>
              )}
            </Button>
          )}

          {isMinistryAdmin && (
            <span className="text-[11px] font-mono px-2.5 py-1.5 bg-[#EBF2F1] text-[#165A60] rounded border border-[#165A60]/20">
              👁️ READ-ONLY OVERSIGHT
            </span>
          )}
        </div>
      </div>

      {/* Historical Batch Notice Pill */}
      {isHistorical && (
        <div className="px-6 py-2.5 bg-[#FEF7EC] border-b border-[#FFE58F] text-[12px] text-[#8D6B00] flex items-center justify-between">
          <span>
            ⚠️ <strong>Viewing Historical Verification Batch ({selectedBatchId}):</strong> Results below reflect this historical snapshot and are not mutated by latest data.
          </span>
          <button
            type="button"
            onClick={() => loadBatch()}
            className="text-[11px] font-bold text-[#165A60] hover:underline cursor-pointer"
          >
            ← Return to Latest Run
          </button>
        </div>
      )}

      {/* Status Alert Banners */}
      {errorMsg && (
        <div className="m-4 p-3 bg-[#FDF2F2] border border-[#E8C5C5] rounded-[2px] text-[12px] text-[#9E2A2B] flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-xs font-bold hover:underline"
          >
            ✕
          </button>
        </div>
      )}
      {successMsg && (
        <div className="m-4 p-3 bg-[#EBF7EE] border border-[#C3E6CB] rounded-[2px] text-[12px] text-[#1E7E34] flex items-center justify-between">
          <span>{successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-xs font-bold hover:underline"
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary KPI Counters (if run) */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-0 border-b border-[#D7DEDA] bg-[#FAFAF8]">
          <div className="p-3.5 border-r border-[#D7DEDA] text-center">
            <div className="text-[10px] font-mono uppercase text-[#5C6F73]">Total Verified</div>
            <div className="text-xl font-bold text-[#172E33] mt-0.5">{summary.totalRun}</div>
          </div>
          <div className="p-3.5 border-r border-[#D7DEDA] text-center">
            <div className="text-[10px] font-mono uppercase text-[#1E7E34]">Simulated Match</div>
            <div className="text-xl font-bold text-[#1E7E34] mt-0.5">
              {summary.verifiedSimulatedCount}
            </div>
          </div>
          <div className="p-3.5 border-r border-[#D7DEDA] text-center">
            <div className="text-[10px] font-mono uppercase text-[#9E2A2B]">Mismatches</div>
            <div className="text-xl font-bold text-[#9E2A2B] mt-0.5">{summary.mismatchCount}</div>
          </div>
          <div className="p-3.5 border-r border-[#D7DEDA] text-center">
            <div className="text-[10px] font-mono uppercase text-[#8D6B00]">Pending Action</div>
            <div className="text-xl font-bold text-[#8D6B00] mt-0.5">
              {summary.pendingCount + summary.expiredCount}
            </div>
          </div>
          <div className="p-3.5 text-center col-span-2 sm:col-span-1">
            <div className="text-[10px] font-mono uppercase text-[#165A60]">Recorded Letters</div>
            <div className="text-xl font-bold text-[#165A60] mt-0.5">{summary.recordedCount}</div>
          </div>
        </div>
      )}

      {/* Authority Categories List / Cards */}
      <div className="divide-y divide-[#D7DEDA]">
        {(
          [
            "SOCIETY_REGISTRAR",
            "REVENUE_DEPARTMENT",
            "FIRE_SERVICES",
            "COUNCIL_OF_ARCHITECTURE",
            "BANK_BRANCH",
          ] as AuthorityCategory[]
        ).map((cat) => {
          const meta = CATEGORY_METADATA[cat];
          const record = verificationMap.get(cat);
          const isExpanded = Boolean(expandedCards[cat]);
          const hasDiscrepancies = record?.discrepancies && record.discrepancies.length > 0;
          const isBankCategory = cat === "BANK_BRANCH";

          return (
            <div key={cat} className="p-5 hover:bg-[#FAFAF8]/50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-[11px] font-mono font-bold text-[#5C6F73] bg-[#EBEAE5] px-2 py-0.5 rounded">
                      {meta.docCode}
                    </span>
                    <h3 className="text-[15px] font-bold text-[#172E33] m-0">{meta.title}</h3>
                    {getStatusBadge(record?.status)}
                    {getModeBadge(record?.verificationMode)}
                  </div>

                  <div className="text-[12px] text-[#5C6F73] mt-1.5 flex items-center gap-2 flex-wrap">
                    <span>
                      <strong>Registry Authority:</strong> {meta.authorityName}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-[11px] text-[#165A60]">
                      <strong>Source:</strong> {record?.sourceName || meta.source}
                    </span>
                  </div>

                  {/* Summary / Observation snippet */}
                  {record ? (
                    <div className="mt-2 text-[12px] text-[#172E33] bg-[#F6F5F0] p-2.5 rounded-[2px] border border-[#D7DEDA]/60">
                      <strong>Observation:</strong> {record.summary}
                      {record.scrutinyActionPrompt && (
                        <div className="mt-1 text-[11px] text-[#165A60] font-medium">
                          ↳ <em>Guidance:</em> {record.scrutinyActionPrompt}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 text-[12px] text-[#8A9B9D] italic">
                      Verification not yet executed for this application. Click &apos;Run Authority Verification&apos; to query simulated registry.
                    </div>
                  )}
                </div>

                {/* Right Column: Actions (Expand Details, Record Bank Letter) */}
                <div className="flex items-center gap-2 self-start sm:self-center">
                  {isBankCategory && !isMinistryAdmin && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setIsBankModalOpen(true)}
                      className="text-[11px] bg-white text-[#165A60] border-[#165A60]/40 hover:bg-[#EBF2F1] px-3 py-1.5"
                    >
                      📝 Record Branch Letter
                    </Button>
                  )}

                  {record && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => toggleExpand(cat)}
                      className="text-[11px] text-[#5C6F73] hover:text-[#172E33] px-2 py-1"
                    >
                      {isExpanded ? "▲ Hide Fields" : "▼ Inspect Fields"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Collapsible Field Discrepancy & Submitted Values Drawer */}
              {isExpanded && record && (
                <div className="mt-4 pt-4 border-t border-[#D7DEDA] space-y-4 animate-in fade-in duration-100">
                  {/* Discrepancy Alert Table (if mismatches exist) */}
                  {hasDiscrepancies && (
                    <div className="p-3 bg-[#FDF2F2] border border-[#E8C5C5] rounded-[2px]">
                      <div className="text-[11px] font-mono uppercase font-bold text-[#9E2A2B] mb-2">
                        Detected Discrepancies vs Authoritative Records
                      </div>
                      <div className="space-y-2">
                        {record.discrepancies?.map((d, dIdx) => (
                          <div
                            key={dIdx}
                            className="text-[12px] p-2 bg-white rounded border border-[#E8C5C5]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div>
                              <strong className="text-[#9E2A2B]">{d.label || d.field}:</strong>{" "}
                              <span className="text-[#5C6F73]">{d.observation}</span>
                            </div>
                            <div className="text-[11px] font-mono flex items-center gap-2">
                              <span className="bg-[#FEF7EC] text-[#8D6B00] px-1.5 py-0.5 rounded">
                                Sub: {String(d.submitted ?? "N/A")}
                              </span>
                              <span>≠</span>
                              <span className="bg-[#EBF7EE] text-[#1E7E34] px-1.5 py-0.5 rounded">
                                Auth: {String(d.authoritative ?? "N/A")}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submitted Fields vs Authoritative Fields Comparison Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Submitted Snapshot */}
                    <div className="p-3 bg-[#FAFAF8] border border-[#D7DEDA] rounded-[2px]">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-[#5C6F73] mb-2 font-semibold flex items-center justify-between">
                        <span>Submitted Application Evidence</span>
                        {Boolean(record.submittedFields._provenance) && (
                          <span className="text-[9px] bg-[#EBF2F1] text-[#165A60] px-1.5 py-0.2 rounded font-sans">
                            Officer Reviewed Overlays Active
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {Object.entries(record.submittedFields).map(([key, val]) => {
                          if (key === "_provenance") return null;
                          const provenanceMap = record.submittedFields._provenance as
                            | Record<string, { isOfficerReviewed?: boolean; originalExtracted?: unknown } | undefined>
                            | undefined;
                          const prov = provenanceMap?.[key];
                          return (
                            <div
                              key={key}
                              className="text-[11px] flex items-start justify-between border-b border-[#D7DEDA]/40 pb-1"
                            >
                              <span className="text-[#5C6F73] font-mono">{key}:</span>
                              <div className="text-right">
                                <span className="font-semibold text-[#172E33]">
                                  {val !== null && val !== undefined ? String(val) : "—"}
                                </span>
                                {prov?.isOfficerReviewed && (
                                  <div className="text-[9px] text-[#165A60] font-mono">
                                    [Reviewed: was {String(prov.originalExtracted ?? "")}]
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Authoritative Registry Snapshot */}
                    <div className="p-3 bg-[#FAFAF8] border border-[#D7DEDA] rounded-[2px]">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-[#165A60] mb-2 font-semibold">
                        Simulated Registry Record
                      </div>
                      {record.authoritativeFields ? (
                        <div className="space-y-1.5">
                          {Object.entries(record.authoritativeFields).map(([key, val]) => (
                            <div
                              key={key}
                              className="text-[11px] flex items-start justify-between border-b border-[#D7DEDA]/40 pb-1"
                            >
                              <span className="text-[#5C6F73] font-mono">{key}:</span>
                              <span className="font-semibold text-[#172E33] text-right">
                                {val !== null && val !== undefined
                                  ? Array.isArray(val)
                                    ? val.join(", ")
                                    : String(val)
                                  : "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-[#8A9B9D] italic py-2">
                          No matching authoritative record returned from simulated registry (query: {record.queryReference || "N/A"}).
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Dialog for Recording Physical Bank Letter */}
      <BankConfirmationDialog
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        applicationId={applicationId}
        onSuccess={() => {
          setSuccessMsg("Manual bank confirmation letter successfully recorded on official file.");
          loadBatch();
        }}
      />
    </div>
  );
};
