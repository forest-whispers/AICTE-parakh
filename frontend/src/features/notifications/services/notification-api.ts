import { apiClient } from "../../../shared/api/client";
import type {
  NotificationItem,
  NotificationListResponse,
  MarkAsReadResponse,
  MarkAllReadResponse,
} from "../types/notification.types";

export const notificationApi = {
  /**
   * Retrieves notifications belonging strictly to the currently authenticated recipient.
   */
  async getNotifications(params?: { unreadOnly?: boolean; limit?: number }): Promise<NotificationItem[]> {
    const query = new URLSearchParams();
    if (params?.unreadOnly) {
      query.set("unread", "true");
    }
    if (params?.limit) {
      query.set("limit", String(params.limit));
    }

    const qs = query.toString();
    const endpoint = `/api/notifications${qs ? `?${qs}` : ""}`;

    const res = await apiClient<NotificationListResponse>(endpoint, {
      method: "GET",
    });

    return res.data || [];
  },

  /**
   * Mark a notification as read with recipient authorization.
   */
  async markAsRead(notificationId: string): Promise<NotificationItem> {
    const res = await apiClient<MarkAsReadResponse>(`/api/notifications/${notificationId}/read`, {
      method: "PATCH",
    });

    return res.data;
  },

  /**
   * Mark all unread notifications as read for current user.
   */
  async markAllAsRead(): Promise<number> {
    const res = await apiClient<MarkAllReadResponse>("/api/notifications/read-all", {
      method: "POST",
    });

    return res.count || 0;
  },
};

