import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { registerOfficer } from "../src/controllers/auth.controller.js";
import { authService } from "../src/services/auth.service.js";
import { prisma } from "../src/lib/prisma.js";

describe("Ministry Admin: Officer Registration API & Lifecycle Tests", () => {
  let mockUsers: any[] = [];
  let mockAuditLogs: any[] = [];

  const adminUser = {
    id: "usr-admin-1",
    email: "admin@ministry.gov.in",
    name: "Ministry Admin",
    role: "MINISTRY_ADMIN",
    designation: "Director of Technical Education",
  };

  const officerUser = {
    id: "usr-off-1",
    email: "ananya.rao@aicte.gov.in",
    name: "Dr. Ananya Rao",
    role: "OFFICER",
    designation: "Scrutiny Officer (Tech/Eng)",
  };

  beforeEach(() => {
    mockUsers = [
      {
        id: "usr-admin-1",
        email: "admin@ministry.gov.in",
        name: "Ministry Admin",
        role: "MINISTRY_ADMIN",
        designation: "Director",
        isActive: true,
      },
      {
        id: "usr-off-1",
        email: "ananya.rao@aicte.gov.in",
        name: "Dr. Ananya Rao",
        role: "OFFICER",
        designation: "Scrutiny Officer",
        isActive: true,
      },
    ];

    mockAuditLogs = [];

    (prisma.user.findUnique as any) = async ({ where }: any) => {
      if (where.email) {
        return mockUsers.find((u) => u.email.toLowerCase() === where.email.toLowerCase()) || null;
      }
      if (where.id) {
        return mockUsers.find((u) => u.id === where.id) || null;
      }
      return null;
    };

    (prisma.user.create as any) = async ({ data }: any) => {
      const created = {
        id: `usr-off-${Date.now()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockUsers.push(created);
      return created;
    };

    (prisma.auditLog.create as any) = async ({ data }: any) => {
      mockAuditLogs.push(data);
      return { id: `log-${Date.now()}`, ...data, createdAt: new Date() };
    };
  });

  const createMockRes = () => {
    const res: any = {
      statusCode: 200,
      jsonPayload: null,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: any) {
        this.jsonPayload = payload;
        return this;
      },
    };
    return res;
  };

  it("1. Successful Registration: Ministry Admin registers an officer with safe response and hashed password", async () => {
    const req: any = {
      user: adminUser,
      body: {
        name: "Dr. Sneha Patil",
        email: "sneha.patil@aicte.gov.in",
        password: "SecurePassword2026!",
        designation: "Technical Scrutiny Officer",
        department: "Engineering & Technology",
      },
    };

    const res = createMockRes();
    await registerOfficer(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.jsonPayload.success, true);
    assert.equal(res.jsonPayload.data.name, "Dr. Sneha Patil");
    assert.equal(res.jsonPayload.data.email, "sneha.patil@aicte.gov.in");
    assert.equal(res.jsonPayload.data.role, "OFFICER");
    assert.equal(res.jsonPayload.data.designation, "Technical Scrutiny Officer");
    assert.equal(res.jsonPayload.data.department, "Engineering & Technology");
    assert.equal(res.jsonPayload.data.isActive, true);

    // Verify sensitive authentication fields are NEVER exposed in response
    assert.equal(res.jsonPayload.data.passwordHash, undefined);
    assert.equal(res.jsonPayload.data.salt, undefined);

    // Verify user persisted with scrypt password hash
    const persisted = mockUsers.find((u) => u.email === "sneha.patil@aicte.gov.in");
    assert.ok(persisted);
    assert.ok(persisted.passwordHash);
    assert.ok(persisted.salt);
    assert.notEqual(persisted.passwordHash, "SecurePassword2026!");

    // Verify password can be validated using authService
    const isValid = authService.verifyPassword("SecurePassword2026!", persisted.passwordHash, persisted.salt);
    assert.equal(isValid, true);

    // Verify audit log
    assert.ok(
      mockAuditLogs.some(
        (l) => l.action === "OFFICER_REGISTERED" && l.resourceId === persisted.id && l.actorId === adminUser.id
      )
    );
  });

  it("2. Role Guard: Ordinary Officer receives 403 Forbidden", async () => {
    const req: any = {
      user: officerUser,
      body: {
        name: "Dr. Unauthorized Officer",
        email: "unauthorized@aicte.gov.in",
        password: "SecurePassword2026!",
        designation: "Scrutiny Officer",
      },
    };

    const res = createMockRes();
    await registerOfficer(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.jsonPayload.success, false);
    assert.match(res.jsonPayload.error, /Only Ministry Administrators/i);
  });

  it("3. Server Role Enforcement: Server forces role to OFFICER even if client passes MINISTRY_ADMIN", async () => {
    const req: any = {
      user: adminUser,
      body: {
        name: "Officer Role Tamper Attempt",
        email: "tamper@aicte.gov.in",
        password: "SecurePassword2026!",
        role: "MINISTRY_ADMIN", // Client attempts to escalate privilege
        designation: "Scrutiny Officer",
      },
    };

    const res = createMockRes();
    await registerOfficer(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.jsonPayload.data.role, "OFFICER");

    const persisted = mockUsers.find((u) => u.email === "tamper@aicte.gov.in");
    assert.equal(persisted.role, "OFFICER");
  });

  it("4. Duplicate Email Rejection: Returns clean 400 Bad Request when email already exists", async () => {
    const req: any = {
      user: adminUser,
      body: {
        name: "Duplicate User Attempt",
        email: "ananya.rao@aicte.gov.in", // Existing email
        password: "SecurePassword2026!",
        designation: "Scrutiny Officer",
      },
    };

    const res = createMockRes();
    await registerOfficer(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonPayload.success, false);
    assert.match(res.jsonPayload.error, /already registered/i);
  });

  it("5. Required Field Validation: Validates email, password length, name, and designation", async () => {
    // Missing name
    const req1: any = {
      user: adminUser,
      body: { email: "test@aicte.gov.in", password: "Password123!", designation: "Officer" },
    };
    const res1 = createMockRes();
    await registerOfficer(req1, res1);
    assert.equal(res1.statusCode, 400);
    assert.match(res1.jsonPayload.error, /name is required/i);

    // Invalid email format
    const req2: any = {
      user: adminUser,
      body: { name: "Test Officer", email: "not-an-email", password: "Password123!", designation: "Officer" },
    };
    const res2 = createMockRes();
    await registerOfficer(req2, res2);
    assert.equal(res2.statusCode, 400);
    assert.match(res2.jsonPayload.error, /Invalid email address format/i);

    // Password too short (< 8 chars)
    const req3: any = {
      user: adminUser,
      body: { name: "Test Officer", email: "valid@aicte.gov.in", password: "short", designation: "Officer" },
    };
    const res3 = createMockRes();
    await registerOfficer(req3, res3);
    assert.equal(res3.statusCode, 400);
    assert.match(res3.jsonPayload.error, /at least 8 characters/i);

    // Missing designation
    const req4: any = {
      user: adminUser,
      body: { name: "Test Officer", email: "valid@aicte.gov.in", password: "Password123!" },
    };
    const res4 = createMockRes();
    await registerOfficer(req4, res4);
    assert.equal(res4.statusCode, 400);
    assert.match(res4.jsonPayload.error, /designation is required/i);
  });
});
