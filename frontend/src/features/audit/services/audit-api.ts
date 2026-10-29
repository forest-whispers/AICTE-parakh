import { apiClient } from "../../../shared/api/client";
import type { AuditActivityResponse, AuditFilterParams } from "../types/audit.types";

export const auditApi = {
  /**
   * Retrieves ministry-wide operational audit chronology with role scoping,
   * keyword search, action/actor filtering, and database pagination.
   */
  async getOperationalActivity(params: AuditFilterParams = {}): Promise<AuditActivityResponse> {
    const query = new URLSearchParams();

    if (params.action && params.action !== "ALL") {
      query.set("action", params.action);
    }
    if (params.actorRole && params.actorRole !== "ALL") {
      query.set("actorRole", params.actorRole);
    }
    if (params.status && params.status !== "ALL") {
      query.set("status", params.status);
    }
    if (params.search && params.search.trim()) {
      query.set("search", params.search.trim());
    }
    if (params.page) {
      query.set("page", String(params.page));
    }
    if (params.limit) {
      query.set("limit", String(params.limit));
    }

    const qs = query.toString();
    const endpoint = `/api/ministry/activity${qs ? `?${qs}` : ""}`;

    return apiClient<AuditActivityResponse>(endpoint, {
      method: "GET",
    });
  },
};

