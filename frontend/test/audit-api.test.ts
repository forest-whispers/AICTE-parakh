import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Setup storage mocks
const sessionStore: Record<string, string> = {};
(globalThis as any).sessionStorage = {
  getItem: (key: string) => sessionStore[key] || null,
  setItem: (key: string, val: string) => {
    sessionStore[key] = val;
  },
  removeItem: (key: string) => {
    delete sessionStore[key];
  },
  clear: () => {
    Object.keys(sessionStore).forEach((k) => delete sessionStore[k]);
  },
};
const localStore: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => localStore[key] || null,
  setItem: (key: string, val: string) => {
    localStore[key] = val;
  },
  removeItem: (key: string) => {
    delete localStore[key];
  },
  clear: () => {
    Object.keys(localStore).forEach((k) => delete localStore[k]);
  },
};

import { auditApi } from "../src/features/audit/services/audit-api";
import { tokenManager } from "../src/shared/api/token-manager";

describe("Ministry Audit History API Client", () => {
  it("fetches operational audit activity with proper query params and headers", async () => {
    tokenManager.setToken("mock_admin_audit_token");

    let requestedUrl = "";
    let authHeader = "";

    (globalThis as any).fetch = async (url: string, init?: RequestInit) => {
      requestedUrl = url;
      const headers = new Headers(init?.headers);
      authHeader = headers.get("Authorization") || "";

      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          data: [
            {
              id: "evt_001",
              timestamp: "2026-10-28T09:44:00.000Z",
              action: "AUTHORITY_VERIFICATION_EXECUTED",
              actor: {
                id: null,
                name: "System",
                role: "SYSTEM",
                isSystem: true,
              },
              application: {
                id: "app_418",
                applicationNumber: "PAR/2026/00418",
                institutionName: "Sahyadri Institute of Technology, Pune",
              },
              resourceType: "AUTHORITY_VERIFICATION",
              resourceId: "ver_batch_001",
              status: "SUCCESS",
              details: "Authority verification completed: Sponsoring-body name differs.",
              metadata: { run: "VER-2026-00418-R1" },
            },
          ],
          pagination: {
            total: 64,
            page: 1,
            limit: 25,
            totalPages: 3,
          },
        }),
      };
    };

    const res = await auditApi.getOperationalActivity({
      action: "AUTHORITY_VERIFICATION_EXECUTED",
      actorRole: "SYSTEM",
      search: "Sahyadri",
      page: 1,
      limit: 25,
    });

    assert.equal(authHeader, "Bearer mock_admin_audit_token");
    assert.match(requestedUrl, /\/api\/ministry\/activity/);
    assert.match(requestedUrl, /action=AUTHORITY_VERIFICATION_EXECUTED/);
    assert.match(requestedUrl, /actorRole=SYSTEM/);
    assert.match(requestedUrl, /search=Sahyadri/);
    assert.match(requestedUrl, /page=1/);
    assert.match(requestedUrl, /limit=25/);

    assert.equal(res.success, true);
    assert.equal(res.data.length, 1);
    assert.equal(res.data[0].id, "evt_001");
    assert.equal(res.data[0].actor.isSystem, true);
    assert.equal(res.data[0].application?.applicationNumber, "PAR/2026/00418");
    assert.equal(res.pagination.total, 64);
  });

  it("handles empty filters by excluding 'ALL' sentinels from query string", async () => {
    tokenManager.setToken("mock_admin_audit_token");

    let requestedUrl = "";

    (globalThis as any).fetch = async (url: string) => {
      requestedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          data: [],
          pagination: { total: 0, page: 1, limit: 25, totalPages: 1 },
        }),
      };
    };

    await auditApi.getOperationalActivity({
      action: "ALL",
      actorRole: "ALL",
      status: "ALL",
      page: 2,
    });

    assert.doesNotMatch(requestedUrl, /action=ALL/);
    assert.doesNotMatch(requestedUrl, /actorRole=ALL/);
    assert.doesNotMatch(requestedUrl, /status=ALL/);
    assert.match(requestedUrl, /page=2/);
  });
});

