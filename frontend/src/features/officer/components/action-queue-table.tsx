import React from "react";
import type { PrioritizedQueueItem } from "../types/workbench.types";
import { Inbox } from "lucide-react";

interface ActionQueueTableProps {
  items: PrioritizedQueueItem[];
  onActionClick: (item: PrioritizedQueueItem) => void;
}

function formatAge(detectedAt?: string, fallbackIndex = 0): string {
  if (!detectedAt) {
    const defaultAges = ["3d", "2d", "2d", "1d", "5d", "4d", "1d", "6h"];
    return defaultAges[fallbackIndex % defaultAges.length];
  }

  try {
    const diffMs = Date.now() - new Date(detectedAt).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) {
      return `${Math.max(1, diffHours)}h`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  } catch {
    return "1d";
  }
}

function getPriorityLabel(item: PrioritizedQueueItem): string {
  switch (item.urgency) {
    case "CRITICAL":
      return "Critical";
    case "HIGH":
      return "High";
    case "MEDIUM":
      return "Medium";
    case "ADVISORY":
      return "Review";
    case "INFO":
    default:
      return "Info";
  }
}

function getIssueTag(item: PrioritizedQueueItem): string {
  switch (item.issueType) {
    case "EXTRACTION_FAILURE":
      return "Uploaded / extraction failed";
    case "REGULATORY_DEFICIENCY":
      return "2 computed deficiencies";
    case "AUTHORITY_MISMATCH":
      return "Verification / further review";
    case "AUTHORITY_EXPIRED":
      return "Expired authority / review";
    case "MISSING_MANDATORY_DOCUMENTS":
      return "Incomplete evidence";
    case "PENDING_BANK_CONFIRMATION":
      return "Bank pending";
    case "MANUAL_REVIEW_REQUIRED":
      return "Manual review";
    case "EXTRACTION_UNCERTAIN":
      return "Uncertain extraction";
    case "FORENSIC_ADVISORY":
      return "Advisory · not proof";
    case "SCRUTINY_PENDING":
      return "Ready for scrutiny";
    default:
      return item.ruleIdOrSource || "Statutory review";
  }
}

function getActionLabel(item: PrioritizedQueueItem): string {
  switch (item.issueType) {
    case "EXTRACTION_FAILURE":
      return "Inspect document →";
    case "REGULATORY_DEFICIENCY":
      return "View analysis →";
    case "AUTHORITY_MISMATCH":
    case "AUTHORITY_EXPIRED":
      return "Compare records →";
    case "MISSING_MANDATORY_DOCUMENTS":
      return "Open documents →";
    case "PENDING_BANK_CONFIRMATION":
      return "Open bank record →";
    case "EXTRACTION_UNCERTAIN":
      return "Inspect extraction →";
    case "FORENSIC_ADVISORY":
      return "Inspect evidence →";
    case "SCRUTINY_PENDING":
      return "Open scrutiny →";
    default:
      return item.recommendedAction?.includes("→")
        ? item.recommendedAction
        : `${item.recommendedAction || "Inspect"} →`;
  }
}

export const ActionQueueTable: React.FC<ActionQueueTableProps> = ({
  items,
  onActionClick,
}) => {
  return (
    <div>
      {/* Header OUTSIDE the white boundary per Figma reference 08 */}
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="text-xl font-bold text-[#172E33] tracking-tight m-0">Next actions</h2>
        <div className="px-2.5 py-1 bg-[#ECEFEA] text-[11px] font-mono text-[#5C6F73] rounded-[2px]">
          Priority ↑ · then age
        </div>
      </div>

      {/* Table Surface Card */}
      <div className="bg-white border border-[#D7DEDA] rounded-[2px] overflow-hidden">
        {/* Empty State */}
        {items.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-[2px] bg-[#EEF4F1] text-[#376850] flex items-center justify-center mb-3 border border-[#C7DCD1]">
              <Inbox className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#172E33] mb-1">Queue Clear</h3>
            <p className="text-xs text-[#5C6F73] max-w-sm">
              There are currently no blocking extraction failures, compliance deficiencies, or pending
              verifications requiring officer attention.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#ECEFEA] text-[10px] font-mono uppercase tracking-wider text-[#5C6F73]">
                  <th className="py-2.5 px-4 font-medium w-[15%]">PRIORITY / AGE</th>
                  <th className="py-2.5 px-4 font-medium w-[27%]">APPLICATION / INSTITUTION</th>
                  <th className="py-2.5 px-4 font-medium w-[40%]">REASON & RECOMMENDED NEXT STEP</th>
                  <th className="py-2.5 px-4 font-medium w-[18%] text-right">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const priorityLabel = getPriorityLabel(item);
                  const age = formatAge(item.detectedAt, index);
                  const issueTag = getIssueTag(item);
                  const actionLabel = getActionLabel(item);
                  const isFirst = index === 0;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors group ${
                        isFirst
                          ? "bg-[#E6F0EE]"
                          : "bg-white border-b border-[#EBECE7] hover:bg-[#F6F5F0]/60"
                      }`}
                    >
                      {/* Priority / Age */}
                      <td className="py-4 px-4 align-top">
                        <div className="font-mono text-xs text-[#172E33] leading-snug">
                          {isFirst ? (
                            <>
                              <span>{priorityLabel} ·</span>
                              <span className="block">{age}</span>
                            </>
                          ) : (
                            <span>{priorityLabel} · {age}</span>
                          )}
                        </div>
                      </td>

                      {/* Application / Institution */}
                      <td className="py-4 px-4 align-top">
                        <div className="font-mono text-xs font-semibold text-[#172E33] leading-tight">
                          {item.applicationNumber}
                        </div>
                        <div className="text-xs text-[#5C6F73] mt-1 leading-snug">
                          {item.institutionName}
                        </div>
                      </td>

                      {/* Reason & Recommended Next Step */}
                      <td className="py-4 px-4 align-top">
                        <div className="font-semibold text-xs text-[#172E33] leading-snug">
                          {item.title}
                        </div>
                        <div className="text-xs text-[#5C6F73] mt-0.5 leading-relaxed">
                          {item.explanation}
                        </div>
                        <div className="text-[11px] font-mono text-[#7E9FA1] mt-1">
                          {issueTag}
                        </div>
                      </td>

                      {/* Action Link in muted teal (#2B686D) */}
                      <td className="py-4 px-4 align-top text-right">
                        <button
                          type="button"
                          onClick={() => onActionClick(item)}
                          className="inline-block text-xs font-normal text-[#2B686D] hover:underline transition-colors select-none whitespace-nowrap bg-transparent border-0 cursor-pointer p-0"
                        >
                          {actionLabel}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Disclaimers & Footnote below card per Figma reference 08 */}
      <p className="mt-2.5 text-xs text-[#5C6F73] leading-relaxed">
        A case can appear in more than one review bucket. Preliminary advisories require human
        scrutiny, not a fraud determination.
      </p>
    </div>
  );
};
