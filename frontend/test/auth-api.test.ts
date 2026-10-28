import { describe, it, beforeEach } from "node:test";
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

import { tokenManager } from "../src/shared/api/token-manager.ts";
import { authApi } from "../src/features/auth/services/auth-api.ts";
import { onUnauthorized, buildUrl } from "../src/shared/api/client.ts";

describe("Auth API Transport & Contracts", () => {
  beforeEach(() => {
    tokenManager.clearToken();
  });

  it("builds correct URL without duplicate /api prefix", () => {
    assert.equal(buildUrl("/api/auth/login"), "/api/auth/login");
    assert.equal(buildUrl("/auth/login"), "/api/auth/login");
    assert.equal(buildUrl("http://localhost:5000/api/auth/login"), "http://localhost:5000/api/auth/login");
  });

  it("handles successful sign in and stores token", async () => {
    const mockUser = {
      id: "usr-off-1",
      email: "officer1@aicte.gov.in",
      name: "Er. Rajiv Malhotra",
      role: "OFFICER" as const,
      designation: "Senior Scrutiny Officer",
      department: "Northern",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    (globalThis as any).fetch = async (url: string, init?: RequestInit) => {
      assert.equal(url, "/api/auth/login");
      assert.equal(init?.method, "POST");
      const body = JSON.parse(init?.body as string);
      assert.equal(body.email, "officer1@aicte.gov.in");

      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          message: "Login successful.",
          data: {
            user: mockUser,
            token: "valid-bearer-token-12345",
          },
        }),
      } as Response;
    };

    const res = await authApi.login({
      email: "officer1@aicte.gov.in",
      password: "Officer@AICTE2026!",
    });

    assert.equal(res.user.email, "officer1@aicte.gov.in");
    assert.equal(res.token, "valid-bearer-token-12345");
    assert.equal(tokenManager.getToken(), "valid-bearer-token-12345");
  });

  it("clears token and triggers unauthorized handler on 401", async () => {
    tokenManager.setToken("expired-token-9999");
    let unauthorizedTriggered = false;

    const unsubscribe = onUnauthorized(() => {
      unauthorizedTriggered = true;
    });

    (globalThis as any).fetch = async () => {
      return {
        ok: false,
        status: 401,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: false,
          error: "Session expired or invalid token.",
        }),
      } as Response;
    };

    await assert.rejects(
      async () => {
        await authApi.getMe();
      },
      (err: any) => {
        assert.equal(err.status, 401);
        assert.ok(err.message.includes("Session expired"));
        return true;
      }
    );

    assert.equal(unauthorizedTriggered, true);
    assert.equal(tokenManager.hasToken(), false);
    unsubscribe();
  });
});
