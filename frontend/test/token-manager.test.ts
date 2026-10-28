import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Mock sessionStorage in Node test runner
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

describe("Session Token Manager", () => {
  beforeEach(() => {
    tokenManager.clearToken();
  });

  it("stores and retrieves auth token", () => {
    assert.equal(tokenManager.hasToken(), false);
    assert.equal(tokenManager.getToken(), null);

    tokenManager.setToken("mock-jwt-token-12345");
    assert.equal(tokenManager.hasToken(), true);
    assert.equal(tokenManager.getToken(), "mock-jwt-token-12345");
  });

  it("clears token completely on logout or expiration", () => {
    tokenManager.setToken("mock-jwt-token-12345");
    assert.equal(tokenManager.hasToken(), true);

    tokenManager.clearToken();
    assert.equal(tokenManager.hasToken(), false);
    assert.equal(tokenManager.getToken(), null);
    assert.equal(sessionStorage.getItem("parakh_auth_session_token"), null);
  });
});
