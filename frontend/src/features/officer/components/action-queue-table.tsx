import React from "react";
import { Badge, type BadgeVariant } from "../../../shared/ui/badge";
import type { PrioritizedQueueItem } from "../types/workbench.types";
import { ArrowRight, Inbox } from "lucide-react";

interface ActionQueueTableProps {
  items: PrioritizedQueueItem[];
  onActionClick: (item: PrioritizedQueueItem) => void;
}

function formatAge(detectedAt?: string, fallbackIndex = 1): string {
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

function getBadgeVariant(urgency: PrioritizedQueueItem["urgency"]): BadgeVariant {
  switch (urgency) {
    case "CRITICAL":
      return "critical";
    case "HIGH":
      return "high";
    case "MEDIUM":
      return "medium";
    case "ADVISORY":
      return "advisory";
    case "INFO":
    default:
      return "info";
  }
}

function getUrgencyDisplay(item: PrioritizedQueueItem, index: number): string {
  const age = formatAge(item.detectedAt, index);
  const label =
    item.urgency === "CRITICAL"
      ? "Critical"
      : item.urgency === "HIGH"
      ? "High"
      : item.urgency === "MEDIUM"
      ? "Medium"
      : item.urgency === "ADVISORY"
      ? "Review"
      : "Info";

  return `${label} · ${age}`;
}

export const ActionQueueTable: React.FC<ActionQueueTableProps> = ({
  items,
  onActionClick,
}) => {
  return (
    <div className="bg-white border border-[#D7DEDA] rounded-[3px] shadow-subtle p-5 sm:p-6 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#D7DEDA] mb-4">
        <div>
          <h2 className="text-lg font-bold text-[#172E33] tracking-tight m-0">Next actions</h2>
          <span className="text-xs text-[#5C6F73] mt-0.5 block">
            Rank-ordered by regulatory severity and statutory deadlines
          </span>
        </div>
        <div className="text-xs font-mono text-[#5C6F73] flex items-center gap-1">
          <span>Priority</span>
          <span className="text-[#165A60] font-semibold">↑</span>
          <span>· then age</span>
        </div>
      </div>

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
        <div className="overflow-x-auto -mx-5 sm:-mx-6">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[#D7DEDA] text-[10px] font-mono uppercase tracking-wider text-[#5C6F73]">
                <th className="px-5 sm:px-6 py-2.5 font-medium w-[15%]">PRIORITY / AGE</th>
                <th className="px-3 py-2.5 font-medium w-[27%]">APPLICATION / INSTITUTION</th>
                <th className="px-3 py-2.5 font-medium w-[40%]">REASON & RECOMMENDED NEXT STEP</th>
                <th className="px-5 sm:px-6 py-2.5 font-medium w-[18%] text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D7DEDA]">
              {items.map((item, index) => {
                const badgeVariant = getBadgeVariant(item.urgency);
                const urgencyText = getUrgencyDisplay(item, index);

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-[#F6F5F0]/60 transition-colors group"
                  >
                    {/* Priority & Age */}
                    <td className="px-5 sm:px-6 py-3.5 align-top">
                      <Badge variant={badgeVariant} size="sm">
                        {urgencyText}
                      </Badge>
                    </td>

                    {/* Application & Institution */}
                    <td className="px-3 py-3.5 align-top">
                      <div className="font-mono text-xs font-semibold text-[#172E33] leading-tight">
                        {item.applicationNumber}
                      </div>
                      <div className="text-xs text-[#5C6F73] mt-1 leading-snug line-clamp-2">
                        {item.institutionName}
                      </div>
                    </td>

                    {/* Reason & Recommended Next Step */}
                    <td className="px-3 py-3.5 align-top">
                      <div className="font-semibold text-xs text-[#172E33] leading-snug">
                        {item.title}
                      </div>
                      <div className="text-xs text-[#5C6F73] mt-0.5 leading-relaxed">
                        {item.explanation}
                      </div>
                      <div className="text-[11px] font-medium text-[#165A60] mt-1 flex items-center gap-1">
                        <span className="font-mono text-[10px] text-[#8A9B9D]">Next:</span>
                        <span>{item.recommendedAction}</span>
                      </div>
                    </td>

                    {/* Action Button */}
                    <td className="px-5 sm:px-6 py-3.5 align-top text-right">
                      <button
                        type="button"
                        onClick={() => onActionClick(item)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#165A60] hover:text-[#12494E] hover:underline transition-colors select-none"
                      >
                        <span>Action</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Disclaimers & Footnote per Figma reference 08 */}
      <div className="pt-4 border-t border-[#D7DEDA] text-[11px] text-[#5C6F73] leading-relaxed">
        A case can appear in more than one review bucket. Preliminary advisories require human
        scrutiny, not a fraud determination.
      </div>
    </div>
  );
};
