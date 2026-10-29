import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Mock sessionStorage & localStorage in Node test runner
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

import { tokenManager } from "../src/shared/api/token-manager.ts";

describe("Session Token Manager", () => {
  beforeEach(() => {
    tokenManager.clearToken();
  });

  it("stores and retrieves auth token across session and local storage", () => {
    assert.equal(tokenManager.hasToken(), false);
    assert.equal(tokenManager.getToken(), null);

    tokenManager.setToken("mock-jwt-token-12345");
    assert.equal(tokenManager.hasToken(), true);
    assert.equal(tokenManager.getToken(), "mock-jwt-token-12345");
    assert.equal(sessionStore["parakh_auth_session_token"], "mock-jwt-token-12345");
    assert.equal(localStore["parakh_auth_session_token"], "mock-jwt-token-12345");
  });

  it("recovers token from localStorage if sessionStorage is empty (e.g. new tab)", () => {
    tokenManager.clearToken();
    localStore["parakh_auth_session_token"] = "cross-tab-token-999";
    assert.equal(tokenManager.hasToken(), true);
    assert.equal(tokenManager.getToken(), "cross-tab-token-999");
  });

  it("clears token completely on logout or expiration", () => {
    tokenManager.setToken("mock-jwt-token-12345");
    assert.equal(tokenManager.hasToken(), true);

    tokenManager.clearToken();
    assert.equal(tokenManager.hasToken(), false);
    assert.equal(tokenManager.getToken(), null);
    assert.equal(sessionStorage.getItem("parakh_auth_session_token"), null);
    assert.equal(localStorage.getItem("parakh_auth_session_token"), null);
  });
});
