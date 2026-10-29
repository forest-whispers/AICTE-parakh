import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Setup global fetch & sessionStorage mocks for testing API client logic
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

import { authorityApi } from "../src/features/authority/services/authority-api";
import { tokenManager } from "../src/shared/api/token-manager";

describe("Authority Verification Client & Integration", () => {
  it("executes verification and delivers batch summary", async () => {
    tokenManager.setToken("mock_bearer_token");

    (globalThis as any).fetch = async (url: string, init?: RequestInit) => {
      assert.equal(url, "/api/applications/app-123/verify");
      assert.equal(init?.method, "POST");
      assert.equal(
        (init?.headers as Headers).get("Authorization"),
        "Bearer mock_bearer_token"
      );

      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          message: "Authority verification completed successfully.",
          data: {
            batchId: "batch_test_101",
            applicationId: "app-123",
            verifiedAt: new Date().toISOString(),
            totalRun: 5,
            verifiedSimulatedCount: 4,
            mismatchCount: 1,
            formatOnlyCount: 0,
            expiredCount: 0,
            notFoundCount: 0,
            pendingCount: 0,
            recordedCount: 0,
            verifications: [
              {
                id: "auth-1",
                applicationId: "app-123",
                batchId: "batch_test_101",
                authorityCategory: "SOCIETY_REGISTRAR",
                authorityName: "State Registrar of Public Trusts (Simulated)",
                verificationMode: "SIMULATED_REGISTRY",
                sourceName: "Simulated M.P. Public Trusts Portal",
                queryReference: "REG/BPL/2018/01992",
                status: "VERIFIED_SIMULATED",
                submittedFields: { registrationNumber: "REG/BPL/2018/01992" },
                authoritativeFields: { registrationNumber: "REG/BPL/2018/01992" },
                discrepancies: [],
                summary: "Registration verified in simulated registry.",
                scrutinyActionPrompt: "Proceed with standard review.",
                verifiedAt: new Date().toISOString(),
              },
            ],
          },
        }),
      };
    };

    const res = await authorityApi.runVerification("app-123");
    assert.equal(res.batchId, "batch_test_101");
    assert.equal(res.totalRun, 5);
    assert.equal(res.verifications[0].status, "VERIFIED_SIMULATED");
  });

  it("submits manual bank confirmation with required schema", async () => {
    (globalThis as any).fetch = async (url: string, init?: RequestInit) => {
      assert.equal(url, "/api/applications/app-123/verify/bank-confirmation");
      assert.equal(init?.method, "POST");
      const body = JSON.parse(init?.body as string);
      assert.equal(body.letterReference, "SBI/CONF/2026/01");
      assert.equal(body.confirmedAmountLakhs, 100);
      assert.equal(body.isUnencumbered, true);

      return {
        ok: true,
        status: 201,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          data: {
            id: "auth-bank-conf-1",
            applicationId: "app-123",
            batchId: "officer_conf_1",
            authorityCategory: "BANK_BRANCH",
            authorityName: "Scheduled Bank / Branch Management",
            verificationMode: "MANUAL_CONFIRMATION_ROUTED",
            sourceName: "Official Bank Branch Inquiry / Branch Confirmation Letter",
            queryReference: "SBI/CONF/2026/01",
            status: "CONFIRMATION_RECORDED",
            submittedFields: {},
            authoritativeFields: { letterReference: "SBI/CONF/2026/01" },
            discrepancies: [],
            summary: "Physical confirmation letter recorded on file.",
            scrutinyActionPrompt: "Manual confirmation on record.",
            verifiedAt: new Date().toISOString(),
          },
        }),
      };
    };

    const res = await authorityApi.recordBankConfirmation("app-123", {
      letterReference: "SBI/CONF/2026/01",
      letterDate: "2026-10-25",
      recordingOfficer: "Officer Test",
      confirmedAmountLakhs: 100,
      isUnencumbered: true,
    });

    assert.equal(res.status, "CONFIRMATION_RECORDED");
    assert.equal(res.verificationMode, "MANUAL_CONFIRMATION_ROUTED");
  });

  it("fetches historical verification batches", async () => {
    (globalThis as any).fetch = async (url: string) => {
      assert.equal(url, "/api/applications/app-123/verifications/history");
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          data: [
            {
              batchId: "batch_new",
              verifiedAt: new Date().toISOString(),
              count: 5,
              statuses: ["VERIFIED_SIMULATED"],
            },
            {
              batchId: "batch_old",
              verifiedAt: new Date().toISOString(),
              count: 5,
              statuses: ["MISMATCH_DETECTED"],
            },
          ],
        }),
      };
    };

    const history = await authorityApi.getHistory("app-123");
    assert.equal(history.length, 2);
    assert.equal(history[0].batchId, "batch_new");
    assert.equal(history[1].batchId, "batch_old");
  });
});

