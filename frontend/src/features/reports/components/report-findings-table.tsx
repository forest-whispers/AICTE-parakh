import React, { useState, useMemo } from "react";
import type { RuleFinding, RuleOutcome } from "../types/reports.types";

interface ReportFindingsTableProps {
  findings: RuleFinding[];
}

export const ReportFindingsTable: React.FC<ReportFindingsTableProps> = ({ findings }) => {
  const [filterType, setFilterType] = useState<"ALL" | "DEFICIENCIES" | "REVIEW" | "PASS" | "MISSING">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const counts = useMemo(() => {
    let defs = 0;
    let revs = 0;
    let passes = 0;
    let missings = 0;

    findings.forEach((f) => {
      if (
        f.outcome === "FAIL_DEFICIENCY" ||
        f.outcome === "EXPIRED" ||
        f.outcome === "MISMATCH_DETECTED"
      ) {
        defs++;
      } else if (
        f.outcome === "MANUAL_REVIEW_REQUIRED" ||
        f.outcome === "EXTRACTION_UNCERTAIN"
      ) {
        revs++;
      } else if (f.outcome === "PASS") {
        passes++;
      } else if (
        f.outcome === "EVIDENCE_MISSING" ||
        f.outcome === "INSUFFICIENT_INPUT"
      ) {
        missings++;
      }
    });

    return { defs, revs, passes, missings, total: findings.length };
  }, [findings]);

  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      // 1. Tab outcome filter
      if (filterType === "DEFICIENCIES") {
        const isDef =
          f.outcome === "FAIL_DEFICIENCY" ||
          f.outcome === "EXPIRED" ||
          f.outcome === "MISMATCH_DETECTED";
        if (!isDef) return false;
      } else if (filterType === "REVIEW") {
        const isRev =
          f.outcome === "MANUAL_REVIEW_REQUIRED" ||
          f.outcome === "EXTRACTION_UNCERTAIN";
        if (!isRev) return false;
      } else if (filterType === "PASS") {
        if (f.outcome !== "PASS") return false;
      } else if (filterType === "MISSING") {
        const isMiss =
          f.outcome === "EVIDENCE_MISSING" ||
          f.outcome === "INSUFFICIENT_INPUT";
        if (!isMiss) return false;
      }

      // 2. Text query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRule = f.ruleName?.toLowerCase().includes(q);
        const matchId = f.ruleId?.toLowerCase().includes(q);
        const matchClause = f.aphClause?.toLowerCase().includes(q);
        const matchSummary = f.summary?.toLowerCase().includes(q);
        const matchDetails = f.details?.toLowerCase().includes(q);
        if (!matchRule && !matchId && !matchClause && !matchSummary && !matchDetails) {
          return false;
        }
      }

      return true;
    });
  }, [findings, filterType, searchQuery]);

  const getOutcomeBadge = (outcome: RuleOutcome) => {
    switch (outcome) {
      case "PASS":
        return (
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-[2px] border bg-[#EAF3EE] text-[#245E3F] border-[#C8E6C9]">
            ✓ PASS
          </span>
        );
      case "FAIL_DEFICIENCY":
      case "EXPIRED":
      case "MISMATCH_DETECTED":
        return (
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-[2px] border bg-[#FDF2F2] text-[#9E2A2B] border-[#E8C5C5]">
            ! {outcome.replace(/_/g, " ")}
          </span>
        );
      case "MANUAL_REVIEW_REQUIRED":
      case "EXTRACTION_UNCERTAIN":
        return (
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-[2px] border bg-[#FFF9E6] text-[#8D6B00] border-[#FFE58F]">
            △ {outcome.replace(/_/g, " ")}
          </span>
        );
      case "EVIDENCE_MISSING":
      case "INSUFFICIENT_INPUT":
        return (
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-[2px] border bg-[#F0F2F2] text-[#5C6F73] border-[#D7DEDA]">
            ○ {outcome.replace(/_/g, " ")}
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-[2px] border bg-[#F0F2F2] text-[#5C6F73] border-[#D7DEDA]">
            {outcome}
          </span>
        );
    }
  };

  const getSeverityBadge = (severity?: string) => {
    if (!severity) return null;
    let bg = "bg-[#F0F2F2] text-[#5C6F73]";
    if (severity === "CRITICAL") bg = "bg-[#FDF2F2] text-[#9E2A2B] border-[#E8C5C5]";
    else if (severity === "HIGH") bg = "bg-[#FFF9E6] text-[#8D6B00] border-[#FFE58F]";
    else if (severity === "ADVISORY") bg = "bg-[#EBF1F0] text-[#165A60] border-[#C2D6D8]";

    return (
      <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-[2px] border ${bg}`}>
        {severity}
      </span>
    );
  };

  return (
    <div className="bg-white border border-[#D7DEDA] rounded-[2px] shadow-xs overflow-hidden">
      {/* Section Header & Tabs */}
      <div className="px-5 pt-4 pb-3 border-b border-[#D7DEDA] bg-[#FAFAF8]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-bold text-[#172E33] m-0">
              Statutory Findings &amp; Rule Audit
            </h3>
            <p className="text-[12px] text-[#5C6F73] m-0 mt-0.5">
              Complete catalog of evaluated rules, statutory determinations, and supporting evidence.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter findings..."
              className="w-full text-[12px] pl-7 pr-3 py-1.5 border border-[#D7DEDA] rounded-[2px] text-[#172E33] placeholder-[#8A9B9D] focus:outline-none focus:border-[#165A60] bg-white"
            />
            <span className="absolute left-2 top-1.5 text-[#8A9B9D] text-xs pointer-events-none">
              🔍
            </span>
          </div>
        </div>

        {/* Filter Chips / Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-[#D7DEDA]">
          <button
            type="button"
            onClick={() => setFilterType("ALL")}
            className={`text-[12px] font-medium px-3 py-1 rounded-[2px] border transition-colors ${
              filterType === "ALL"
                ? "bg-[#165A60] text-white border-[#165A60]"
                : "bg-white text-[#5C6F73] border-[#D7DEDA] hover:bg-[#F6F5F0]"
            }`}
          >
            All Findings ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("DEFICIENCIES")}
            className={`text-[12px] font-medium px-3 py-1 rounded-[2px] border transition-colors ${
              filterType === "DEFICIENCIES"
                ? "bg-[#9E2A2B] text-white border-[#9E2A2B]"
                : "bg-white text-[#9E2A2B] border-[#E8C5C5] hover:bg-[#FDF2F2]"
            }`}
          >
            Deficiencies ({counts.defs})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("REVIEW")}
            className={`text-[12px] font-medium px-3 py-1 rounded-[2px] border transition-colors ${
              filterType === "REVIEW"
                ? "bg-[#8D6B00] text-white border-[#8D6B00]"
                : "bg-white text-[#8D6B00] border-[#FFE58F] hover:bg-[#FFF9E6]"
            }`}
          >
            Manual Review ({counts.revs})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("PASS")}
            className={`text-[12px] font-medium px-3 py-1 rounded-[2px] border transition-colors ${
              filterType === "PASS"
                ? "bg-[#245E3F] text-white border-[#245E3F]"
                : "bg-white text-[#245E3F] border-[#C8E6C9] hover:bg-[#EAF3EE]"
            }`}
          >
            Compliant ({counts.passes})
          </button>
          {counts.missings > 0 && (
            <button
              type="button"
              onClick={() => setFilterType("MISSING")}
              className={`text-[12px] font-medium px-3 py-1 rounded-[2px] border transition-colors ${
                filterType === "MISSING"
                  ? "bg-[#5C6F73] text-white border-[#5C6F73]"
                  : "bg-white text-[#5C6F73] border-[#D7DEDA] hover:bg-[#F0F2F2]"
              }`}
            >
              Missing Docs ({counts.missings})
            </button>
          )}
        </div>
      </div>

      {/* Findings List */}
      <div className="divide-y divide-[#D7DEDA]">
        {filteredFindings.length === 0 ? (
          <div className="py-12 text-center text-[#8A9B9D]">
            <div className="text-xl mb-1">📋</div>
            <div className="text-[13px] font-semibold text-[#172E33]">
              No rule findings match the selected filter criteria.
            </div>
          </div>
        ) : (
          filteredFindings.map((finding, idx) => (
            <div
              key={`${finding.ruleId}-${idx}`}
              className="p-5 hover:bg-[#FAFAF8] transition-colors space-y-3"
            >
              {/* Finding Title & Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <span className="font-mono text-[11px] font-bold text-[#165A60]">
                    #{idx + 1}
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-[#5C6F73] bg-[#F0F2F2] px-1.5 py-0.5 rounded-[2px]">
                    {finding.ruleId}
                  </span>
                  <h4 className="text-[14px] font-bold text-[#172E33] m-0">
                    {finding.ruleName}
                  </h4>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  {getSeverityBadge(finding.severity)}
                  {getOutcomeBadge(finding.outcome)}
                </div>
              </div>

              {/* Regulatory Clause / APH Reference */}
              {finding.aphClause && (
                <div className="text-[11px] font-mono text-[#5C6F73]">
                  Statutory Reference:{" "}
                  <span className="text-[#172E33] font-semibold">
                    {finding.aphClause}
                  </span>
                </div>
              )}

              {/* Finding Observation */}
              <div className="text-[13px] text-[#172E33] leading-relaxed">
                <span className="font-semibold text-[#165A60]">Observation: </span>
                {finding.summary}
              </div>

              {/* Detailed Reasoning */}
              {finding.details && finding.details !== finding.summary && (
                <div className="text-[12px] text-[#5C6F73] leading-relaxed bg-[#FAFAF8] p-3 rounded-[2px] border border-[#D7DEDA]">
                  <span className="font-semibold text-[#172E33]">Statutory Analysis: </span>
                  {finding.details}
                </div>
              )}

              {/* Remediation Note */}
              {finding.remediationNote && (
                <div className="text-[12px] text-[#9E2A2B] bg-[#FDF2F2] p-2.5 rounded-[2px] border border-[#E8C5C5]">
                  <strong>Remediation Guidance: </strong>
                  {finding.remediationNote}
                </div>
              )}

              {/* Supporting Evidence Provenance */}
              {Array.isArray(finding.evidence) && finding.evidence.length > 0 && (
                <div className="pt-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#8A9B9D] mb-1.5">
                    SUPPORTING EVIDENCE &amp; PROVENANCE ({finding.evidence.length})
                  </div>
                  <div className="space-y-1.5">
                    {finding.evidence.map((ev, evIdx) => {
                      const extractedDisplay =
                        ev.extractedValue !== undefined && ev.extractedValue !== null
                          ? typeof ev.extractedValue === "object"
                            ? JSON.stringify(ev.extractedValue)
                            : String(ev.extractedValue)
                          : ev.rawText || "Value verified";

                      return (
                        <div
                          key={evIdx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-[#F6F5F0] rounded-[2px] text-[11px] font-mono border border-[#E5E9E7]"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#165A60]">
                              [{ev.documentType || "DOCUMENT"}]
                            </span>
                            <span className="text-[#172E33] font-semibold">
                              {ev.fieldName || "Field"}:
                            </span>
                            <span className="text-[#334155]">
                              {extractedDisplay}
                            </span>
                            {ev.pageNumber && (
                              <span className="text-[#8A9B9D]">
                                (Page {ev.pageNumber})
                              </span>
                            )}
                          </div>

                          {ev.isOfficerReviewed && (
                            <span className="shrink-0 text-[10px] text-[#245E3F] bg-[#EAF3EE] border border-[#C8E6C9] px-2 py-0.5 rounded-[2px]">
                              ✓ Officer-Reviewed by {ev.reviewedByName || "Desk Officer"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

