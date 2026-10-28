import { apiClient } from "../../../shared/api/client";
import type { ApiResponse } from "../../../shared/types/api.types";
import type {
  WorkbenchDashboardData,
  OfficerNotification,
} from "../types/workbench.types";

export const workbenchApi = {
  /**
   * Retrieves unified workbench dashboard data:
   * Overview metrics, prioritized action queue, review buckets,
   * assigned applications preview, and recent activity in a single consolidated call.
   */
  async getDashboard(): Promise<WorkbenchDashboardData> {
    const response = await apiClient<ApiResponse<WorkbenchDashboardData>>(
      "/api/workbench/dashboard"
    );

    if (!response.data) {
      throw new Error(response.error || "Failed to retrieve workbench dashboard.");
    }

    return response.data;
  },

  /**
   * Retrieves current officer's notifications with optional unread filter.
   */
  async getNotifications(options?: {
    unreadOnly?: boolean;
    limit?: number;
  }): Promise<OfficerNotification[]> {
    const query = new URLSearchParams();
    if (options?.unreadOnly) query.set("unread", "true");
    if (options?.limit) query.set("limit", String(options.limit));

    const qs = query.toString();
    const endpoint = `/api/notifications${qs ? `?${qs}` : ""}`;

    const response = await apiClient<ApiResponse<OfficerNotification[]>>(endpoint);

    return response.data || [];
  },

  /**
   * Marks an individual notification as read.
   */
  async markNotificationAsRead(id: string): Promise<OfficerNotification> {
    const response = await apiClient<ApiResponse<OfficerNotification>>(
      `/api/notifications/${id}/read`,
      { method: "PATCH" }
    );

    if (!response.data) {
      throw new Error(response.error || "Failed to mark notification as read.");
    }

    return response.data;
  },
};
