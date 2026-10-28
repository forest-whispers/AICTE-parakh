import React from "react";
import type { AssignedActivityItem } from "../types/workbench.types";
import { ArrowRight, History } from "lucide-react";

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
    return "";
  }
}

export const AssignedActivityPreview: React.FC<AssignedActivityPreviewProps> = ({
  activity,
  onOpenAuditClick,
}) => {
  return (
    <div className="bg-white border border-[#D7DEDA] rounded-[3px] shadow-subtle p-5 sm:p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[#D7DEDA] mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#172E33] tracking-tight m-0">
              Assigned-case activity
            </h3>
          </div>
          <button
            type="button"
            onClick={onOpenAuditClick}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#165A60] hover:text-[#12494E] hover:underline transition-colors select-none"
          >
            <span>Open audit</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {activity.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#5C6F73]">
            <History className="w-6 h-6 mx-auto mb-2 text-[#8A9B9D]" />
            No recent activity recorded for your assigned cases.
          </div>
        ) : (
          <div className="divide-y divide-[#D7DEDA]">
            {activity.map((item) => {
              const time = formatActivityTime(item.timestamp);
              const actorLabel = item.actor.isSystem
                ? "System"
                : `${item.actor.name} / ${item.actor.role}`;

              const appRef = item.application?.applicationNumber;

              return (
                <div key={item.id} className="py-3 text-xs">
                  <div className="text-[11px] font-mono text-[#5C6F73] mb-1 flex items-center gap-1.5">
                    <span className="font-semibold text-[#172E33]">{time}</span>
                    <span>·</span>
                    <span className={item.actor.isSystem ? "text-[#165A60]" : "text-[#5C6F73]"}>
                      {actorLabel}
                    </span>
                  </div>

                  <div className="text-xs text-[#172E33] leading-relaxed">
                    {appRef && (
                      <span className="font-mono font-medium text-[#165A60] mr-1.5">{appRef} —</span>
                    )}
                    <span>{item.details}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
