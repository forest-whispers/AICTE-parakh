import React from "react";
import type { MinistryActivityItem } from "../types/ministry.types";

interface RecentActivityCardProps {
  activity: MinistryActivityItem[];
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "—";
  }
}

export const RecentActivityCard: React.FC<RecentActivityCardProps> = ({ activity }) => {
  return (
    <div className="bg-white border border-[#D7DEDA] rounded-[3px] p-5 shadow-2xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-[15px] font-bold text-[#172E33] m-0 tracking-tight">
            Recent ministry activity
          </h3>
          <span className="text-[11px] font-mono text-[#5C6F73] uppercase tracking-wider">
            Operational Audit
          </span>
        </div>

        {/* Activity Items */}
        <div className="space-y-3.5 divide-y divide-[#D7DEDA]/40">
          {activity.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#5C6F73] font-mono">
              No recent operational actions logged.
            </div>
          ) : (
            activity.slice(0, 6).map((item, idx) => {
              const actorLabel = item.actor.isSystem
                ? "System"
                : `${item.actor.name || "User"} · ${item.actor.role || "OFFICER"}`;

              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 text-xs ${idx > 0 ? "pt-3.5" : ""}`}
                >
                  {/* Timestamp */}
                  <span className="font-mono text-[11px] text-[#5C6F73] shrink-0 pt-0.5 w-[42px]">
                    {formatTime(item.timestamp)}
                  </span>

                  {/* Actor & Action Description */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-[#172E33] leading-tight">
                      {actorLabel}
                    </div>
                    <div className="text-[11.5px] text-[#5C6F73] mt-0.5 leading-snug">
                      {item.details}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

