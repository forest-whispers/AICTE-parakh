import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma.js";
import { authService } from "../src/services/auth.service.js";
import { auditService } from "../src/services/audit.service.js";
import { notificationService } from "../src/services/notification.service.js";
import { assignmentService } from "../src/services/assignment.service.js";

// In-memory test store to run unit tests with 100% isolation and zero external network latency
const mockUsers = [
  { id: "usr-admin-1", email: "admin@aicte.gov.in", role: "MINISTRY_ADMIN", name: "Dr. Sanjay Sharma", designation: "Director", department: "HQ", isActive: true },
  { id: "usr-off-1", email: "officer1@aicte.gov.in", role: "OFFICER", name: "Er. Rajiv Malhotra", designation: "Senior Officer", department: "Northern", isActive: true },
  { id: "usr-off-2", email: "officer2@aicte.gov.in", role: "OFFICER", name: "Dr. Sunita Deshmukh", designation: "Regional Officer", department: "Western", isActive: true },
];

let mockNotifications: any[] = [];
let mockAuditLogs: any[] = [];
let mockApps: any[] = [];

function setupMocks() {
  mockNotifications = [];
  mockAuditLogs = [];
  mockApps = [
    {
      id: "app-1",
      applicationNumber: "AICTE-DEMO-01-COMPLIANT",
      institutionName: "Vidyapeeth Institute",
      assignedOfficerId: "usr-off-1",
      assignedOfficer: mockUsers[1],
    },
    {
      id: "app-3",
      applicationNumber: "AICTE-DEMO-03-UNCERTAIN",
      institutionName: "Apex Engineering",
      assignedOfficerId: "usr-off-2",
      assignedOfficer: mockUsers[2],
    },
    {
      id: "app-8",
      applicationNumber: "AICTE-DEMO-08-UNASSIGNED",
      institutionName: "National Research",
      assignedOfficerId: null,
      assignedOfficer: null,
    },
  ];

  // Mock Prisma Notification methods
  (prisma.notification as any).findFirst = async ({ where }: any) => {
    return mockNotifications.find((n) => {
      if (where.recipientId && n.recipientId !== where.recipientId) return false;
      if (where.dedupKey && n.dedupKey !== where.dedupKey) return false;
      return true;
    }) || null;
  };

  (prisma.notification as any).create = async ({ data }: any) => {
    const item = { id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...data, createdAt: new Date() };
    mockNotifications.push(item);
    return item;
  };

  (prisma.notification as any).findUnique = async ({ where }: any) => {
    return mockNotifications.find((n) => n.id === where.id) || null;
  };

  (prisma.notification as any).update = async ({ where, data }: any) => {
    const item = mockNotifications.find((n) => n.id === where.id);
    if (!item) throw new Error("Notification not found");
    Object.assign(item, data);
    return item;
  };

  // Mock Prisma AuditLog methods
  (prisma.auditLog as any).create = async ({ data }: any) => {
    const item = { id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...data, createdAt: new Date() };
    mockAuditLogs.push(item);
    return item;
  };

  (prisma.auditLog as any).findMany = async ({ where }: any) => {
    return mockAuditLogs.filter((a) => {
      if (where?.applicationId && a.applicationId !== where.applicationId) return false;
      if (where?.action && a.action !== where.action) return false;
      return true;
    });
  };

  // Mock Prisma User methods
  (prisma.user as any).findUnique = async ({ where }: any) => {
    if (where.id) return mockUsers.find((u) => u.id === where.id) || null;
    if (where.email) return mockUsers.find((u) => u.email === where.email) || null;
    return null;
  };

  (prisma.user as any).findFirst = async ({ where }: any) => {
    if (where.role) return mockUsers.find((u) => u.role === where.role) || null;
    return null;
  };

  // Mock Prisma Application methods
  (prisma.application as any).findUnique = async ({ where }: any) => {
    return mockApps.find((a) => a.id === where.id) || null;
  };

  (prisma.application as any).findFirst = async ({ where }: any) => {
    if (where.applicationNumber) return mockApps.find((a) => a.applicationNumber === where.applicationNumber) || null;
    return null;
  };

  (prisma.application as any).update = async ({ where, data }: any) => {
    const item = mockApps.find((a) => a.id === where.id);
    if (!item) throw new Error("Application not found");
    Object.assign(item, data);
    if (data.assignedOfficerId) {
      item.assignedOfficer = mockUsers.find((u) => u.id === data.assignedOfficerId);
    }
    return item;
  };
}

describe("Phase 1: Authentication, Authorization, Ownership, Notifications & Audit Trail", () => {
  beforeEach(() => {
    setupMocks();
  });

  describe("1. Authentication & Credential Security", () => {
    it("hashes passwords securely using scrypt with unique salt", () => {
      const pwd = "Officer@AICTE2026!";
      const cred1 = authService.hashPassword(pwd);
      const cred2 = authService.hashPassword(pwd);

      assert.notEqual(cred1.salt, cred2.salt, "Salts must be unique per hash");
      assert.notEqual(cred1.hash, cred2.hash, "Hashes with different salts must differ");
      assert.ok(authService.verifyPassword(pwd, cred1.hash, cred1.salt));
      assert.ok(authService.verifyPassword(pwd, cred2.hash, cred2.salt));
      assert.equal(authService.verifyPassword("WrongPassword123!", cred1.hash, cred1.salt), false);
    });

    it("generates and verifies standard signed HMAC-SHA256 tokens", () => {
      const user = {
        id: "usr-off-1",
        email: "officer1@aicte.gov.in",
        role: "OFFICER",
        name: "Er. Rajiv Malhotra",
        designation: "Senior Scrutiny Officer",
      };

      const token = authService.generateToken(user);
      assert.ok(token);
      assert.equal(token.split(".").length, 3, "JWT must have 3 segments");

      const payload = authService.verifyToken(token);
      assert.ok(payload);
      assert.equal(payload.userId, user.id);
      assert.equal(payload.email, user.email);
      assert.equal(payload.role, "OFFICER");
    });

    it("rejects tampered or malformed tokens", () => {
      const user = {
        id: "usr-off-1",
        email: "officer1@aicte.gov.in",
        role: "OFFICER",
        name: "Er. Rajiv Malhotra",
        designation: "Senior Scrutiny Officer",
      };

      const token = authService.generateToken(user);
      const [h, p, s] = token.split(".");
      const tampered = `${h}.${p}.invalid_sig_abc123`;

      const result = authService.verifyToken(tampered);
      assert.equal(result, null, "Tampered token must fail signature verification");

      assert.equal(authService.verifyToken("invalid.token"), null);
      assert.equal(authService.verifyToken(""), null);
    });

    it("sanitizes user profile to never expose password hashes or salts", () => {
      const rawUser = {
        id: "usr-1",
        email: "test@aicte.gov.in",
        passwordHash: "5f4dcc3b5aa765d61d8327deb882cf99",
        salt: "abcd1234efgh5678",
        name: "Test Officer",
        role: "OFFICER",
        designation: "Scrutiny Officer",
        department: "AICTE HQ",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const sanitized = authService.sanitizeUser(rawUser);
      assert.equal((sanitized as any).passwordHash, undefined);
      assert.equal((sanitized as any).salt, undefined);
      assert.equal(sanitized.email, rawUser.email);
      assert.equal(sanitized.role, "OFFICER");
    });
  });

  describe("2. Internal Notifications & Deduplication", () => {
    it("deduplicates identical notifications based on dedupKey", async () => {
      const officer = mockUsers[1];
      const dedupKey = `notif_deficiency_rule1_${Date.now()}`;

      // First dispatch
      const notif1 = await notificationService.sendNotification({
        recipientId: officer.id,
        type: "DEFICIENCY_DETECTED",
        title: "Rule 1 Deficiency Detected",
        message: "Unencumbered funds shortfall identified.",
        severity: "CRITICAL",
        dedupKey,
      });

      assert.ok(notif1);

      // Repeated dispatch with identical dedupKey (e.g. repeated scrutiny run with unchanged outcome)
      const notif2 = await notificationService.sendNotification({
        recipientId: officer.id,
        type: "DEFICIENCY_DETECTED",
        title: "Rule 1 Deficiency Detected",
        message: "Unencumbered funds shortfall identified.",
        severity: "CRITICAL",
        dedupKey,
      });

      assert.ok(notif2);
      assert.equal(notif1.id, notif2.id, "Repeated notification must return existing instance and prevent duplicate");
      assert.equal(mockNotifications.length, 1, "Database must only store 1 notification record");
    });

    it("dispatches new notification when event signature changes (different dedupKey)", async () => {
      const officer = mockUsers[1];

      const notif1 = await notificationService.sendNotification({
        recipientId: officer.id,
        type: "DEFICIENCY_DETECTED",
        title: "Rule 1 Deficiency Detected",
        message: "Unencumbered funds shortfall.",
        severity: "CRITICAL",
        dedupKey: `notif_def_v1_${Date.now()}`,
      });

      // Deficiency materially changed or updated
      const notif2 = await notificationService.sendNotification({
        recipientId: officer.id,
        type: "DEFICIENCY_DETECTED",
        title: "Rule 1 & Rule 3 Deficiencies Detected",
        message: "Multiple deficiencies identified after re-extraction.",
        severity: "CRITICAL",
        dedupKey: `notif_def_v2_${Date.now()}`,
      });

      assert.ok(notif1 && notif2);
      assert.notEqual(notif1.id, notif2.id, "Materially changed issue must produce a distinct notification");
      assert.equal(mockNotifications.length, 2);
    });

    it("enforces recipient authorization when marking notification as read", async () => {
      const officer1 = mockUsers[1];
      const officer2 = mockUsers[2];

      const notif = await notificationService.sendNotification({
        recipientId: officer1.id,
        type: "APPLICATION_ASSIGNED",
        title: "Application Assigned",
        message: "Application AICTE-DEMO-01 assigned to you.",
      });

      assert.ok(notif);

      // Intruder officer attempts to mark Officer 1's notification as read
      await assert.rejects(
        async () => {
          await notificationService.markAsRead(notif.id, officer2.id);
        },
        /Access denied/i,
        "An officer must not be able to mark another officer's notification as read"
      );

      // Legitimate officer marks own notification as read
      const updated = await notificationService.markAsRead(notif.id, officer1.id);
      assert.equal(updated.isRead, true);
      assert.ok(updated.readAt instanceof Date);
    });
  });

  describe("3. Audit Trail & Sensitive Data Sanitization", () => {
    it("redacts sensitive credential fields from audit metadata", async () => {
      const audit = await auditService.logEvent({
        actorName: "Test Officer",
        actorRole: "OFFICER",
        action: "AUTH_LOGIN_SUCCESS",
        resourceType: "USER",
        resourceId: "usr-1",
        status: "SUCCESS",
        details: "User login event",
        metadata: {
          clientIp: "127.0.0.1",
          password: "SecretPassword123!",
          passwordHash: "hash123",
          salt: "salt456",
          token: "jwt.secret.token",
          authorization: "Bearer 12345",
          safeInfo: "Standard operational log metadata",
        },
      });

      assert.ok(audit);
      const meta = audit.metadata as Record<string, any>;
      assert.equal(meta.password, "[REDACTED]");
      assert.equal(meta.passwordHash, "[REDACTED]");
      assert.equal(meta.salt, "[REDACTED]");
      assert.equal(meta.token, "[REDACTED]");
      assert.equal(meta.authorization, "[REDACTED]");
      assert.equal(meta.safeInfo, "Standard operational log metadata");
      assert.equal(meta.clientIp, "127.0.0.1");
    });
  });

  describe("4. Ownership & Application Assignment Policy", () => {
    it("allows Ministry Admin to reassign an application", async () => {
      const admin = mockUsers[0];
      const officer1 = mockUsers[1];
      const officer2 = mockUsers[2];

      const app = mockApps[0];
      assert.equal(app.assignedOfficerId, officer1.id);

      // Admin reassigns from officer1 to officer2
      const updated = await assignmentService.assignApplication(
        app.id,
        officer2.id,
        admin as any,
        "Load rebalancing"
      );

      assert.equal(updated.assignedOfficerId, officer2.id);
      assert.ok(mockNotifications.some((n) => n.recipientId === officer2.id && n.type === "APPLICATION_ASSIGNED"));
      assert.ok(mockNotifications.some((n) => n.recipientId === officer1.id && n.type === "APPLICATION_REASSIGNED"));
    });

    it("prevents an officer from arbitrarily assigning an application they do not own", async () => {
      const officer1 = mockUsers[1];

      // Scenario 3 (app-3) is assigned to officer2 (usr-off-2)
      const app3 = mockApps[1];
      assert.equal(app3.assignedOfficerId, "usr-off-2");

      // officer1 tries to reassign officer2's application
      await assert.rejects(
        async () => {
          await assignmentService.assignApplication(
            app3.id,
            officer1.id,
            officer1 as any
          );
        },
        /Access denied/i,
        "Officer must not be able to reassign another officer's application"
      );
    });
  });
});
