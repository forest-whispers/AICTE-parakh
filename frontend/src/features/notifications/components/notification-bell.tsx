import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, CheckCheck, ArrowRight, ExternalLink } from "lucide-react";
import { useNotifications } from "../hooks/use-notifications";
import type { NotificationItem } from "../types/notification.types";

interface NotificationBellProps {
  userRole: "MINISTRY_ADMIN" | "OFFICER";
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ userRole }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { notifications, unreadCount, markAsRead, markAllAsRead, isMarkingAllRead } =
    useNotifications({ limit: 50 });

  // Close panel on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const filteredNotifications =
    activeTab === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      try {
        await markAsRead(notif.id);
      } catch {
        // Continue navigation even if mark as read encounters a hiccup
      }
    }

    setIsOpen(false);

    if (notif.applicationId) {
      if (userRole === "OFFICER") {
        navigate(`/officer/applications/${notif.applicationId}`);
      } else {
        navigate("/ministry/portfolio");
      }
    }
  };

  const fullCenterPath =
    userRole === "MINISTRY_ADMIN" ? "/ministry/notifications" : "/officer/notifications";

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex items-center justify-center p-2 rounded-[3px] text-[#5C6F73] hover:text-[#172E33] hover:bg-[#F6F5F0] transition-colors focus:outline-none focus:ring-1 focus:ring-[#165A60]"
        aria-label={`Notifications: ${unreadCount} unread`}
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4 text-[#172E33]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#165A60] text-white font-mono text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-over / Popover Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[380px] sm:w-[420px] bg-white border border-[#D7DEDA] rounded-[4px] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[540px]">
          {/* Header */}
          <div className="p-4 border-b border-[#D7DEDA] flex items-center justify-between bg-[#FAFAF8]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-[#172E33]">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EAF3EE] text-[#245E3F] font-semibold border border-[#C8E6C9]">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead()}
                disabled={isMarkingAllRead}
                className="text-[11px] font-semibold text-[#165A60] hover:text-[#122B30] flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          {/* Filter Sub-nav */}
          <div className="px-4 py-2 border-b border-[#EBEAE5] flex items-center gap-4 bg-white text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`font-mono text-xs transition-colors pb-1 border-b-2 ${
                activeTab === "all"
                  ? "border-[#165A60] text-[#165A60] font-semibold"
                  : "border-transparent text-[#5C6F73] hover:text-[#172E33]"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("unread")}
              className={`font-mono text-xs transition-colors pb-1 border-b-2 ${
                activeTab === "unread"
                  ? "border-[#165A60] text-[#165A60] font-semibold"
                  : "border-transparent text-[#5C6F73] hover:text-[#172E33]"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#EBEAE5] min-h-[160px] max-h-[360px]">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-1">
                <span className="block text-xs font-mono uppercase tracking-wider text-[#8A9B9D]">
                  {activeTab === "unread" ? "All caught up" : "No notifications"}
                </span>
                <p className="text-xs text-[#5C6F73]">
                  {activeTab === "unread"
                    ? "You have zero unread notifications."
                    : "No notifications found for your account."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 hover:bg-[#F6F5F0] transition-colors cursor-pointer group flex items-start gap-3 ${
                    !n.isRead ? "bg-[#FAFDFC]" : "bg-white"
                  }`}
                >
                  {/* Status dot */}
                  <div className="pt-1 shrink-0">
                    {!n.isRead ? (
                      <span className="w-2 h-2 rounded-full bg-[#165A60] block ring-4 ring-[#EAF3EE]" />
                    ) : (
                      <span className="w-2 h-2 rounded-full border border-[#8A9B9D] block" />
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#172E33] truncate">
                        {n.title}
                      </span>
                      <span className="text-[10px] font-mono text-[#8A9B9D] shrink-0">
                        {formatTimestamp(n.createdAt)}
                      </span>
                    </div>

                    {n.application && (
                      <div className="font-mono text-[10px] text-[#165A60] font-medium truncate">
                        {n.application.applicationNumber} · {n.application.institutionName}
                      </div>
                    )}

                    <p className="text-xs text-[#475569] line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>

                    {n.applicationId && (
                      <div className="pt-1 flex items-center gap-1 text-[11px] font-semibold text-[#165A60] group-hover:text-[#122B30] transition-colors">
                        <span>Open relevant case context</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer linking to full notifications page */}
          <div className="p-3 bg-[#FAFAF8] border-t border-[#D7DEDA] flex items-center justify-between text-xs">
            <span className="text-[11px] text-[#5C6F73] font-mono">
              Recipient-scoped delivery
            </span>
            <Link
              to={fullCenterPath}
              onClick={() => setIsOpen(false)}
              className="font-semibold text-xs text-[#165A60] hover:text-[#122B30] flex items-center gap-1 transition-colors"
            >
              <span>View full center</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

