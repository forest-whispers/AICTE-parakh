import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/use-auth";
import { useNotifications } from "../hooks/use-notifications";
import type { NotificationItem } from "../types/notification.types";
import { CheckCheck, X, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

interface NotificationsPageProps {
  userRole: "MINISTRY_ADMIN" | "OFFICER";
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ userRole }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read">("all");
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    isMarkingRead,
    markAllAsRead,
    isMarkingAllRead,
  } = useNotifications({ limit: 100 });

  const readCount = notifications.filter((n) => n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "unread") return !n.isRead;
    if (activeTab === "read") return n.isRead;
    return true;
  });

  const handleSelectNotification = async (n: NotificationItem) => {
    setSelectedNotification(n);
  };

  const handleMarkSelectedAsRead = async () => {
    if (!selectedNotification || selectedNotification.isRead) return;
    try {
      await markAsRead(selectedNotification.id);
      setSelectedNotification((prev) => (prev ? { ...prev, isRead: true } : null));
    } catch {
      // Error handled by mutation
    }
  };

  const handleOpenContext = (n: NotificationItem) => {
    if (!n.isRead) {
      markAsRead(n.id).catch(() => {});
    }
    if (n.applicationId) {
      if (userRole === "OFFICER") {
        navigate(`/officer/applications/${n.applicationId}`);
      } else {
        navigate("/ministry/portfolio");
      }
    }
  };

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    const day = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    return `${day} · ${time}`;
  };

  const isOfficer = userRole === "OFFICER";
  const rolePrefix = isOfficer ? "OFFICER" : "MINISTRY";

  return (
    <div className="max-w-[1440px] mx-auto px-6 sm:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="space-y-1">
        <div className="text-xs font-mono uppercase tracking-wider text-[#5C6F73]">
          {rolePrefix} &nbsp;/&nbsp; NOTIFICATIONS
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#172E33]">
          Notifications for {user?.name || (isOfficer ? "Scrutiny Officer" : "Ministry Administrator")}
        </h1>
        <p className="text-xs text-[#5C6F73] max-w-3xl leading-relaxed">
          Recipient-specific attention for your assigned cases. This is not a global broadcast or messaging channel.
        </p>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center justify-between border-b border-[#D7DEDA] pb-2">
        <div className="flex items-center gap-6 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`pb-2 border-b-2 transition-colors ${
              activeTab === "all"
                ? "border-[#165A60] text-[#165A60] font-bold"
                : "border-transparent text-[#5C6F73] hover:text-[#172E33]"
            }`}
          >
            All · {notifications.length}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("unread")}
            className={`pb-2 border-b-2 transition-colors ${
              activeTab === "unread"
                ? "border-[#165A60] text-[#165A60] font-bold"
                : "border-transparent text-[#5C6F73] hover:text-[#172E33]"
            }`}
          >
            Unread · {unreadCount}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("read")}
            className={`pb-2 border-b-2 transition-colors ${
              activeTab === "read"
                ? "border-[#165A60] text-[#165A60] font-bold"
                : "border-transparent text-[#5C6F73] hover:text-[#172E33]"
            }`}
          >
            Read · {readCount}
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllAsRead()}
            disabled={isMarkingAllRead}
            className="text-xs font-semibold text-[#165A60] hover:text-[#122B30] flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Main Container: List + Side Detail Panel */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Notifications List */}
        <div className="flex-1 w-full bg-white border border-[#D7DEDA] rounded-[4px] shadow-sm divide-y divide-[#EBEAE5] overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-4 animate-pulse">
              <div className="h-6 bg-[#EBEAE5] rounded w-1/4" />
              <div className="h-16 bg-[#EBEAE5] rounded" />
              <div className="h-16 bg-[#EBEAE5] rounded" />
              <div className="h-16 bg-[#EBEAE5] rounded" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#8A9B9D] block">
                {activeTab === "unread" ? "No unread notifications" : "No notifications found"}
              </span>
              <p className="text-xs text-[#5C6F73] max-w-sm mx-auto">
                {activeTab === "unread"
                  ? "All attention items have been reviewed. Previously read items remain available under All."
                  : "No notifications have been dispatched to your recipient account yet."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isSelected = selectedNotification?.id === notif.id;

              return (
                <div
                  key={notif.id}
                  onClick={() => handleSelectNotification(notif)}
                  className={`p-4 sm:p-5 cursor-pointer transition-colors flex items-start gap-3.5 ${
                    isSelected
                      ? "bg-[#F0F6F5]"
                      : !notif.isRead
                      ? "bg-[#FAFDFC] hover:bg-[#F6F5F0]"
                      : "bg-white hover:bg-[#FAFAF8]"
                  }`}
                >
                  {/* Status Indicator Dot */}
                  <div className="pt-1 shrink-0">
                    {!notif.isRead ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#165A60] block ring-4 ring-[#EAF3EE]" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full border border-[#8A9B9D] block" />
                    )}
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <span className="font-bold text-xs sm:text-sm text-[#172E33]">
                        {notif.title}
                      </span>
                      <span className="text-[11px] font-mono text-[#8A9B9D] shrink-0">
                        {formatTimestamp(notif.createdAt)}
                      </span>
                    </div>

                    {notif.application && (
                      <div className="font-mono text-xs text-[#5C6F73]">
                        {notif.application.applicationNumber}
                      </div>
                    )}

                    <p className="text-xs text-[#334155] leading-relaxed">
                      {notif.message}
                    </p>

                    {notif.applicationId && (
                      <div className="pt-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenContext(notif);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#165A60] hover:text-[#122B30] transition-colors"
                        >
                          <span>Open relevant case context</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Side Detail Panel matching Figma 24 */}
        {selectedNotification && (
          <aside
            className="w-full lg:w-[380px] shrink-0 bg-white border border-[#D7DEDA] rounded-[4px] p-5 shadow-panel space-y-5 animate-in fade-in duration-150"
            aria-label="Notification details"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#D7DEDA] pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#172E33] font-semibold">
                Opened notification
              </span>
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="text-xs text-[#5C6F73] hover:text-[#172E33] flex items-center gap-1 p-1 rounded hover:bg-[#F6F5F0] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Close</span>
              </button>
            </div>

            {/* Read/Unread Status Badge */}
            <div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono rounded-[2px] ${
                  !selectedNotification.isRead
                    ? "bg-[#EAF3EE] text-[#245E3F] border border-[#C8E6C9]"
                    : "bg-[#F6F5F0] text-[#5C6F73] border border-[#D7DEDA]"
                }`}
              >
                {!selectedNotification.isRead ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#245E3F]" />
                    <span>Unread · {selectedNotification.type.toLowerCase().replace(/_/g, " ")}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#5C6F73]" />
                    <span>Read · {selectedNotification.type.toLowerCase().replace(/_/g, " ")}</span>
                  </>
                )}
              </span>
            </div>

            {/* Title & Case Reference */}
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#172E33] leading-snug">
                {selectedNotification.title}
              </h3>
              {selectedNotification.application && (
                <div className="font-mono text-xs text-[#5C6F73]">
                  <span>{selectedNotification.application.applicationNumber}</span>
                  <span className="block text-[11px] text-[#8A9B9D]">
                    {selectedNotification.application.institutionName}
                  </span>
                </div>
              )}
            </div>

            {/* Message Body */}
            <div className="text-xs text-[#334155] leading-relaxed bg-[#FAFAF8] p-3 border border-[#EBEAE5] rounded-[2px]">
              {selectedNotification.message}
            </div>

            {/* Attention Guidance */}
            <div className="space-y-1">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-[#5C6F73]">
                Recommended attention
              </span>
              <p className="text-xs text-[#475569] leading-relaxed">
                Inspect the submitted evidence and source record details. No fraud determination or regulatory disposition is implied.
              </p>
            </div>

            {/* Metadata */}
            <div className="text-[11px] font-mono text-[#5C6F73] border-t border-[#EBEAE5] pt-3 space-y-1">
              <div>Recipient: {user?.name} · {userRole}</div>
              <div>Created: {new Date(selectedNotification.createdAt).toLocaleString("en-GB")}</div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              {selectedNotification.applicationId && (
                <button
                  type="button"
                  onClick={() => handleOpenContext(selectedNotification)}
                  className="w-full py-2 px-3 text-xs font-semibold bg-[#165A60] text-white rounded-[2px] hover:bg-[#122B30] transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Open application workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {!selectedNotification.isRead && (
                <button
                  type="button"
                  onClick={handleMarkSelectedAsRead}
                  disabled={isMarkingRead}
                  className="w-full py-2 px-3 text-xs font-semibold bg-white border border-[#D7DEDA] text-[#172E33] rounded-[2px] hover:bg-[#F6F5F0] transition-colors disabled:opacity-50"
                >
                  Mark as read
                </button>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Supporting Guidance Cards matching bottom of Figma 24 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="bg-white border border-[#D7DEDA] rounded-[4px] p-4 space-y-1">
          <div className="font-bold text-xs text-[#172E33] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#165A60]" />
            <span>Empty / no notifications</span>
          </div>
          <p className="text-xs text-[#5C6F73] leading-relaxed">
            No notifications for your account yet. Attention items will appear here when relevant to your assigned cases.
          </p>
        </div>

        <div className="bg-white border border-[#D7DEDA] rounded-[4px] p-4 space-y-1">
          <div className="font-bold text-xs text-[#172E33] flex items-center gap-1.5">
            <CheckCheck className="w-4 h-4 text-[#245E3F]" />
            <span>All read / unread filter</span>
          </div>
          <p className="text-xs text-[#5C6F73] leading-relaxed">
            You have no unread notifications. Previously read items remain available under All.
          </p>
        </div>
      </div>
    </div>
  );
};

