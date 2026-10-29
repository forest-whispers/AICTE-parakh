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

import { notificationApi } from "../src/features/notifications/services/notification-api";
import { tokenManager } from "../src/shared/api/token-manager";

describe("Notifications API Client & Actions", () => {
  it("fetches recipient-scoped notifications and supports unread filter", async () => {
    tokenManager.setToken("mock_user_token");

    let requestedUrl = "";

    (globalThis as any).fetch = async (url: string) => {
      requestedUrl = url;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          data: [
            {
              id: "notif_001",
              recipientId: "usr_001",
              applicationId: "app_001",
              type: "APPLICATION_ASSIGNED",
              title: "Application Assigned: PAR/2026/00418",
              message: "You have been assigned as the responsible scrutiny officer.",
              severity: "INFO",
              isRead: false,
              readAt: null,
              dedupKey: "notif_assign_001",
              metadata: null,
              createdAt: "2026-10-28T09:44:00.000Z",
              application: {
                id: "app_001",
                applicationNumber: "PAR/2026/00418",
                institutionName: "Sahyadri Institute of Technology, Pune",
                status: "SCRUTINY_PENDING",
              },
            },
          ],
        }),
      };
    };

    const notifs = await notificationApi.getNotifications({ unreadOnly: true, limit: 20 });

    assert.match(requestedUrl, /\/api\/notifications/);
    assert.match(requestedUrl, /unread=true/);
    assert.match(requestedUrl, /limit=20/);
    assert.equal(notifs.length, 1);
    assert.equal(notifs[0].id, "notif_001");
    assert.equal(notifs[0].isRead, false);
    assert.equal(notifs[0].application?.applicationNumber, "PAR/2026/00418");
  });

  it("marks a single notification as read via PATCH /api/notifications/:id/read", async () => {
    tokenManager.setToken("mock_user_token");

    let method = "";
    let targetUrl = "";

    (globalThis as any).fetch = async (url: string, init?: RequestInit) => {
      targetUrl = url;
      method = init?.method || "GET";
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          message: "Notification marked as read.",
          data: {
            id: "notif_001",
            isRead: true,
            readAt: "2026-10-29T10:00:00.000Z",
          },
        }),
      };
    };

    const updated = await notificationApi.markAsRead("notif_001");

    assert.equal(method, "PATCH");
    assert.match(targetUrl, /\/api\/notifications\/notif_001\/read/);
    assert.equal(updated.id, "notif_001");
    assert.equal(updated.isRead, true);
  });

  it("marks all notifications as read via POST /api/notifications/read-all", async () => {
    tokenManager.setToken("mock_user_token");

    let method = "";
    let targetUrl = "";

    (globalThis as any).fetch = async (url: string, init?: RequestInit) => {
      targetUrl = url;
      method = init?.method || "GET";
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          message: "All notifications marked as read.",
          count: 5,
        }),
      };
    };

    const count = await notificationApi.markAllAsRead();

    assert.equal(method, "POST");
    assert.match(targetUrl, /\/api\/notifications\/read-all/);
    assert.equal(count, 5);
  });
});

