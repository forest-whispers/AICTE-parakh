import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

const storage: Record<string, string> = {};
(globalThis as any).sessionStorage = {
  getItem: (key: string) => storage[key] || null,
  setItem: (key: string, val: string) => {
    storage[key] = val;
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
  clear: () => {
    Object.keys(storage).forEach((k) => delete storage[k]);
  },
};

import { tokenManager } from "../src/shared/api/token-manager.ts";
import { workbenchApi } from "../src/features/officer/api/workbench-api.ts";

describe("Officer Workbench API Client", () => {
  beforeEach(() => {
    tokenManager.clearToken();
    tokenManager.setToken("officer-test-jwt-token");
  });

  it("fetches consolidated workbench dashboard in a single request", async () => {
    const mockDashboardData = {
      overview: {
        totalAssigned: 38,
        activeAssigned: 32,
        compliantCount: 6,
        deficienciesCount: 9,
        manualReviewCount: 6,
        pendingConfirmationsCount: 5,
        extractionFailedCount: 1,
        unreadNotificationsCount: 4,
      },
      actionQueue: [
        {
          id: "queue-1",
          applicationId: "app-1",
          applicationNumber: "PAR/2026/00419",
          institutionName: "Pravara Technical Institute",
          priorityRank: 1,
          urgency: "CRITICAL",
          issueType: "EXTRACTION_FAILURE",
          title: "Multimodal Document Ingestion Failure",
          explanation: "Architect certificate is unreadable.",
          recommendedAction: "Examine raw PDF upload format and re-trigger multimodal extraction.",
          relatedDocumentType: null,
          ruleIdOrSource: "VLM_INGESTION",
        },
      ],
      reviewBuckets: [
        {
          category: "COMPLIANCE_DEFICIENCIES",
          label: "Deterministic Compliance Deficiencies",
          count: 9,
          items: [],
        },
      ],
      assignedApplications: [
        {
          id: "app-1",
          applicationNumber: "PAR/2026/00418",
          institutionName: "Sahyadri Institute of Technology",
          status: "DEFICIENCIES_DETECTED",
          updatedAt: new Date().toISOString(),
        },
      ],
      recentActivity: [
        {
          id: "act-1",
          timestamp: new Date().toISOString(),
          action: "SCRUTINY_EVALUATED",
          actor: { id: null, name: "System", role: "SYSTEM", isSystem: true },
          details: "Scrutiny completed",
          status: "SUCCESS",
        },
      ],
    };

    (globalThis as any).fetch = async (url: string, init?: RequestInit) => {
      assert.equal(url, "/api/workbench/dashboard");
      const authHeader = (init?.headers as Headers)?.get("Authorization");
      assert.equal(authHeader, "Bearer officer-test-jwt-token");

      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          data: mockDashboardData,
        }),
      } as Response;
    };

    const result = await workbenchApi.getDashboard();

    assert.ok(result);
    assert.equal(result.overview.totalAssigned, 38);
    assert.equal(result.overview.activeAssigned, 32);
    assert.equal(result.overview.deficienciesCount, 9);
    assert.equal(result.actionQueue.length, 1);
    assert.equal(result.actionQueue[0].priorityRank, 1);
    assert.equal(result.reviewBuckets[0].count, 9);
    assert.equal(result.assignedApplications.length, 1);
    assert.equal(result.recentActivity.length, 1);
  });

  it("fetches unread notifications and marks notification as read", async () => {
    (globalThis as any).fetch = async (url: string, init?: RequestInit) => {
      if (url.includes("/api/notifications?unread=true&limit=4")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            success: true,
            data: [
              {
                id: "notif-1",
                title: "Authority comparison ready",
                message: "Compare submitted and simulated record values.",
                isRead: false,
                createdAt: new Date().toISOString(),
              },
            ],
          }),
        } as Response;
      }

      if (url.includes("/api/notifications/notif-1/read")) {
        assert.equal(init?.method, "PATCH");
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            success: true,
            data: { id: "notif-1", isRead: true },
          }),
        } as Response;
      }

      throw new Error(`Unhandled URL: ${url}`);
    };

    const notifs = await workbenchApi.getNotifications({ unreadOnly: true, limit: 4 });
    assert.equal(notifs.length, 1);
    assert.equal(notifs[0].id, "notif-1");
    assert.equal(notifs[0].title, "Authority comparison ready");

    const updated = await workbenchApi.markNotificationAsRead("notif-1");
    assert.equal(updated.id, "notif-1");
    assert.equal(updated.isRead, true);
  });
});
