import React from "react";
import type { OfficerNotification } from "../types/workbench.types";

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
    return "09:44";
  }
}

function formatAppRef(appNumber?: string): string {
  if (!appNumber) return "00418";
  const parts = appNumber.split("/");
  return parts[parts.length - 1] || appNumber;
}

export const NotificationsPreviewCard: React.FC<NotificationsPreviewCardProps> = ({
  notifications,
  totalUnread,
  onViewAllClick,
}) => {
  return (
    <div className="bg-white border border-[#D7DEDA] rounded-[2px] p-6">
      {/* Header matching Figma 08: Unread for you / 4 */}
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-xl font-bold text-[#172E33] tracking-tight m-0">Unread for you</h3>
        <span className="text-sm font-mono text-[#2B686D]">/ {totalUnread}</span>
      </div>

      {notifications.length === 0 ? (
        <div className="py-4 text-xs text-[#5C6F73]">
          No unread notifications at this time.
        </div>
      ) : (
        <div>
          {notifications.map((n, idx) => {
            const time = formatNotificationTime(n.createdAt);
            const appRef = formatAppRef(n.application?.applicationNumber);

            return (
              <React.Fragment key={n.id}>
                {idx > 0 && <div className="border-t border-[#EBECE7] my-3.5" />}
                <div className="text-xs">
                  <div className="font-bold text-xs text-[#172E33] leading-snug">
                    {n.title}
                  </div>
                  <div className="text-[11px] font-mono text-[#5C6F73] mt-1 mb-0.5">
                    {appRef} · {time}
                  </div>
                  <div className="text-xs text-[#5C6F73] leading-relaxed">
                    {n.message}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Footer link in exact Figma muted teal */}
      <div className="mt-5">
        <button
          type="button"
          onClick={onViewAllClick}
          className="text-xs font-normal text-[#2B686D] hover:underline transition-colors select-none p-0 bg-transparent border-0 cursor-pointer block"
        >
          All notifications →
        </button>
      </div>
    </div>
  );
};
