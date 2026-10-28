import React from "react";
import type { OfficerNotification } from "../types/workbench.types";
import { ArrowRight, Check, BellRing } from "lucide-react";

interface NotificationsPreviewCardProps {
  notifications: OfficerNotification[];
  totalUnread: number;
  onMarkRead: (id: string) => void;
  onViewAllClick: () => void;
}

function formatNotificationTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export const NotificationsPreviewCard: React.FC<NotificationsPreviewCardProps> = ({
  notifications,
  totalUnread,
  onMarkRead,
  onViewAllClick,
}) => {
  return (
    <div className="bg-white border border-[#D7DEDA] rounded-[3px] shadow-subtle p-5 sm:p-6 mb-6">
      <div className="flex items-center justify-between pb-3 border-b border-[#D7DEDA] mb-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-bold text-[#172E33] tracking-tight m-0">Unread for you</h3>
          <span className="text-xs font-mono text-[#165A60] font-semibold">/ {totalUnread}</span>
        </div>
        <BellRing className="w-3.5 h-3.5 text-[#5C6F73]" />
      </div>

      {notifications.length === 0 ? (
        <div className="py-6 text-center text-xs text-[#5C6F73]">
          No unread notifications at this time.
        </div>
      ) : (
        <div className="divide-y divide-[#D7DEDA]">
          {notifications.map((n) => {
            const time = formatNotificationTime(n.createdAt);
            const appRef = n.application?.applicationNumber || "";

            return (
              <div key={n.id} className="py-3 group relative">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-xs text-[#172E33] leading-snug">
                    {n.title}
                  </div>
                  <button
                    type="button"
                    onClick={() => onMarkRead(n.id)}
                    className="shrink-0 p-1 rounded hover:bg-[#EEF4F1] text-[#5C6F73] hover:text-[#376850] transition-colors"
                    title="Mark as read"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-[11px] font-mono text-[#5C6F73] mt-0.5 flex items-center gap-1.5">
                  {appRef && <span className="font-medium text-[#172E33]">{appRef}</span>}
                  {appRef && <span>·</span>}
                  <span>{time}</span>
                </div>

                <div className="text-xs text-[#5C6F73] mt-1 leading-relaxed">{n.message}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="pt-3 border-t border-[#D7DEDA] text-right">
        <button
          type="button"
          onClick={onViewAllClick}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#165A60] hover:text-[#12494E] hover:underline transition-colors select-none"
        >
          <span>All notifications</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
