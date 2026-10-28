import React from "react";
import type { AssignedActivityItem } from "../types/workbench.types";
import { History } from "lucide-react";

interface AssignedActivityPreviewProps {
  activity: AssignedActivityItem[];
  onOpenAuditClick: () => void;
}

function formatActivityTime(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    const timeStr = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    if (isToday) {
      return timeStr;
    }
    return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ${timeStr}`;
  } catch {
    return "09:42";
  }
}

function formatAppNum(appNumber?: string): string {
  if (!appNumber) return "";
  const parts = appNumber.split("/");
  return parts[parts.length - 1] || appNumber;
}

export const AssignedActivityPreview: React.FC<AssignedActivityPreviewProps> = ({
  activity,
  onOpenAuditClick,
}) => {
  return (
    <div className="bg-white border border-[#D7DEDA] rounded-[2px] p-6">
      {/* Header matching Figma 08: Assigned-case activity / Open audit → */}
      <div className="flex items-baseline gap-2 mb-4">
        <h3 className="text-xl font-bold text-[#172E33] tracking-tight m-0">
          Assigned-case activity
        </h3>
        <span className="text-xs text-[#5C6F73]">/</span>
        <button
          type="button"
          onClick={onOpenAuditClick}
          className="text-xs font-normal text-[#2B686D] hover:underline transition-colors select-none p-0 bg-transparent border-0 cursor-pointer"
        >
          Open audit →
        </button>
      </div>

      {activity.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#5C6F73]">
          <History className="w-6 h-6 mx-auto mb-2 text-[#8A9B9D]" />
          No recent activity recorded for your assigned cases.
        </div>
      ) : (
        <div>
          {activity.slice(0, 4).map((item, idx) => {
            const time = formatActivityTime(item.timestamp);
            const actorLabel = item.actor.isSystem
              ? "System"
              : `${item.actor.name} / ${item.actor.role}`;

            const appShort = formatAppNum(item.application?.applicationNumber);

            return (
              <React.Fragment key={item.id}>
                {idx > 0 && <div className="border-b border-[#EBECE7] my-3.5" />}
                <div className="text-xs">
                  <div className="font-mono text-xs text-[#172E33] mb-0.5">
                    {time} · {actorLabel}
                  </div>
                  <div className="text-xs text-[#172E33] leading-relaxed">
                    {appShort && <span className="font-mono">{appShort} — </span>}
                    <span>{item.details}</span>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
