import { apiClient } from "../../../shared/api/client";
import type { MinistryDashboardData } from "../types/ministry.types";

export const ministryApi = {
  /**
   * Fetch consolidated ministry dashboard payload in a single trip.
   */
  async getDashboard(): Promise<MinistryDashboardData> {
    const res = await apiClient<{ success: boolean; data: MinistryDashboardData }>(
      "/ministry/dashboard"
    );
    if (!res?.data) {
      throw new Error("Failed to retrieve ministry dashboard payload.");
    }
    return res.data;
  },
};

