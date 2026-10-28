import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma.js";
import { authService } from "../src/services/auth.service.js";
import {
  authenticate,
  requireRole,
  requireApplicationAccess,
} from "../src/middlewares/auth.middleware.js";
import { login } from "../src/controllers/auth.controller.js";
import { getMyNotifications } from "../src/controllers/notification.controller.js";
import { getCaseWorkspaceData, updateDocumentValidationStatus } from "../src/controllers/application.controller.js";

// Helper to create mock Express request and response objects
function createMockContext(options: {
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  query?: Record<string, string>;
  user?: any;
} = {}) {
  const req: any = {
    headers: options.headers || {},
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    user: options.user,
    socket: { remoteAddress: "127.0.0.1" },
  };

  let statusCode = 200;
  let responseData: any = null;
  let nextCalled = false;
  let nextError: any = null;

  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      responseData = data;
      return res;
    },
  };

  const next = (err?: any) => {
    nextCalled = true;
    nextError = err;
  };

  return {
    req,
    res,
    next,
    getStatusCode: () => statusCode,
    getData: () => responseData,
    wasNextCalled: () => nextCalled,
    getNextError: () => nextError,
  };
}

const pwdHash = authService.hashPassword("Officer@AICTE2026!");
const adminHash = authService.hashPassword("Admin@AICTE2026!");

const mockUsers = [
  {
    id: "usr-admin-1",
    email: "admin@aicte.gov.in",
    role: "MINISTRY_ADMIN",
    name: "Dr. Sanjay Sharma",
    designation: "Director",
    department: "AICTE HQ",
    isActive: true,
    passwordHash: adminHash.hash,
    salt: adminHash.salt,
    failedLoginAttempts: 0,
    lockedUntil: null,
  },
  {
    id: "usr-off-1",
    email: "officer1@aicte.gov.in",
    role: "OFFICER",
    name: "Er. Rajiv Malhotra",
    designation: "Senior Officer",
    department: "Northern",
    isActive: true,
    passwordHash: pwdHash.hash,
    salt: pwdHash.salt,
    failedLoginAttempts: 0,
    lockedUntil: null,
  },
  {
    id: "usr-off-2",
    email: "officer2@aicte.gov.in",
    role: "OFFICER",
    name: "Dr. Sunita Deshmukh",
    designation: "Regional Officer",
    department: "Western",
    isActive: true,
    passwordHash: pwdHash.hash,
    salt: pwdHash.salt,
    failedLoginAttempts: 0,
    lockedUntil: null,
  },
];

const mockApps = [
  {
    id: "app-1",
    applicationNumber: "AICTE-DEMO-01-COMPLIANT",
    institutionName: "Vidyapeeth Institute",
    assignedOfficerId: "usr-off-1",
    status: "PROCESSING_EXTRACTION",
    documents: [
      {
        id: "doc-1",
        documentType: "DOC_01_REGISTRATION",
        originalName: "registration.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        extractionStatus: "SUCCESS",
        pageCount: 2,
        extractedMetadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    scrutinyReports: [
      {
        id: "rep-1",
        overallStatus: "COMPLIANT",
        evaluationDate: new Date(),
      },
    ],
  },
  {
    id: "app-3",
    applicationNumber: "AICTE-DEMO-03-UNCERTAIN-EVIDENCE",
    institutionName: "Apex Engineering",
    assignedOfficerId: "usr-off-2",
    status: "PROCESSING_EXTRACTION",
    documents: [],
    scrutinyReports: [],
  },
  {
    id: "app-8",
    applicationNumber: "AICTE-DEMO-08-COMPOUND-ISSUES",
    institutionName: "National Research",
    assignedOfficerId: null,
    status: "PROCESSING_EXTRACTION",
    documents: [],
    scrutinyReports: [],
  },
];

const mockNotifications = [
  {
    id: "notif-1",
    recipientId: "usr-off-1",
    title: "Assigned",
    message: "Assigned to app 1",
    isRead: false,
    createdAt: new Date(),
  },
  {
    id: "notif-2",
    recipientId: "usr-off-2",
    title: "Assigned",
    message: "Assigned to app 3",
    isRead: false,
    createdAt: new Date(),
  },
];

describe("Phase 1: API Route Security & Authorization Boundaries", () => {
  before(() => {
    // Setup Prisma in-memory mocks
    (prisma.user as any).findUnique = async ({ where }: any) => {
      if (where.id) return mockUsers.find((u) => u.id === where.id) || null;
      if (where.email) return mockUsers.find((u) => u.email.toLowerCase() === where.email.toLowerCase()) || null;
      return null;
    };

    (prisma.user as any).update = async ({ where, data }: any) => {
      const u = mockUsers.find((user) => user.id === where.id);
      if (u) Object.assign(u, data);
      return u;
    };

    (prisma.application as any).findUnique = async ({ where }: any) => {
      return mockApps.find((a) => a.id === where.id) || null;
    };

    (prisma.application as any).findMany = async ({ where }: any) => {
      if (where && "assignedOfficerId" in where) {
        return mockApps.filter((a) => a.assignedOfficerId === where.assignedOfficerId);
      }
      return mockApps;
    };

    (prisma.notification as any).findMany = async ({ where }: any) => {
      return mockNotifications.filter((n) => n.recipientId === where.recipientId);
    };

    (prisma.notification as any).count = async ({ where }: any) => {
      return mockNotifications.filter((n) => n.recipientId === where.recipientId && (!where.isRead || n.isRead === false)).length;
    };

    (prisma.auditLog as any).create = async ({ data }: any) => {
      return { id: "audit-test-id", ...data, createdAt: new Date() };
    };

    (prisma.document as any).findFirst = async ({ where }: any) => {
      const app = mockApps.find((a) => a.id === where.applicationId);
      return app?.documents?.find((d: any) => d.id === where.id) || null;
    };

    (prisma.document as any).update = async ({ where, data }: any) => {
      for (const app of mockApps) {
        const doc = app.documents?.find((d: any) => d.id === where.id);
        if (doc) {
          Object.assign(doc, data);
          return doc;
        }
      }
      return null;
    };

    (prisma.authorityVerification as any).findMany = async ({ where }: any) => {
      return [
        {
          id: "auth-v-1",
          applicationId: where.applicationId,
          authorityCategory: "LAND_REGISTRY",
          status: "VERIFIED_SIMULATED",
        },
      ];
    };

    (prisma.auditLog as any).findMany = async ({ where }: any) => {
      return [
        {
          id: "audit-log-1",
          applicationId: where?.applicationId,
          action: "SCRUTINY_EVALUATION_COMPLETED",
          actorRole: "SYSTEM",
          createdAt: new Date(),
        },
      ];
    };
  });

  it("rejects unauthenticated requests to protected endpoints with 401", async () => {
    const { req, res, next, getStatusCode, getData, wasNextCalled } = createMockContext({
      headers: {},
    });

    await authenticate(req, res, next);
    assert.equal(wasNextCalled(), false, "next() must not be called without token");
    assert.equal(getStatusCode(), 401);
    assert.equal(getData().success, false);
    assert.ok(getData().error.includes("Authentication required"));
  });

  it("authenticates valid credentials and returns JWT token & sanitized user", async () => {
    const { req, res, getStatusCode, getData } = createMockContext({
      body: {
        email: "officer1@aicte.gov.in",
        password: "Officer@AICTE2026!",
      },
    });

    await login(req, res);
    assert.equal(getStatusCode(), 200);
    assert.equal(getData().success, true);
    assert.ok(getData().data.token);
    assert.equal(getData().data.user.email, "officer1@aicte.gov.in");
    assert.equal(getData().data.user.role, "OFFICER");
    assert.equal(getData().data.user.passwordHash, undefined);
    assert.equal(getData().data.user.salt, undefined);
  });

  it("rejects invalid login credentials with 401 without leaking user existence", async () => {
    const { req, res, getStatusCode, getData } = createMockContext({
      body: {
        email: "officer1@aicte.gov.in",
        password: "WrongPassword123!",
      },
    });

    await login(req, res);
    assert.equal(getStatusCode(), 401);
    assert.equal(getData().success, false);
    assert.ok(getData().error.includes("Invalid email or password"));
  });

  it("enforces officer ownership: Officer 1 cannot access Officer 2's application (403 Forbidden)", async () => {
    const officer1 = mockUsers[1];
    const { req, res, next, getStatusCode, getData, wasNextCalled } = createMockContext({
      params: { id: "app-3" }, // app-3 is assigned to usr-off-2
      user: {
        id: officer1.id,
        email: officer1.email,
        name: officer1.name,
        role: "OFFICER",
      },
    });

    const guard = requireApplicationAccess("read");
    await guard(req, res, next);

    assert.equal(wasNextCalled(), false);
    assert.equal(getStatusCode(), 403);
    assert.equal(getData().success, false);
    assert.ok(getData().error.includes("Access denied"));
  });

  it("permits Ministry Admin operational oversight read across any application", async () => {
    const admin = mockUsers[0];
    const { req, res, next, wasNextCalled } = createMockContext({
      params: { id: "app-3" }, // app-3 is assigned to usr-off-2
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: "MINISTRY_ADMIN",
      },
    });

    const guard = requireApplicationAccess("read");
    await guard(req, res, next);

    assert.equal(wasNextCalled(), true, "Ministry Admin must be allowed read oversight");
  });

  it("prevents Ministry Admin from executing regulatory scrutiny write operations (403 Forbidden)", async () => {
    const admin = mockUsers[0];
    const { req, res, next, getStatusCode, getData, wasNextCalled } = createMockContext({
      params: { id: "app-1" },
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: "MINISTRY_ADMIN",
      },
    });

    const guard = requireApplicationAccess("write");
    await guard(req, res, next);

    assert.equal(wasNextCalled(), false);
    assert.equal(getStatusCode(), 403);
    assert.equal(getData().success, false);
    assert.ok(
      getData().error.includes("Ministry Administrators have operational oversight only")
    );
  });

  it("restricts unassigned queue to Ministry Admin and rejects Officer access with 403", async () => {
    const officer1 = mockUsers[1];
    const { req, res, next, getStatusCode, getData, wasNextCalled } = createMockContext({
      user: {
        id: officer1.id,
        email: officer1.email,
        name: officer1.name,
        role: "OFFICER",
      },
    });

    const guard = requireRole("MINISTRY_ADMIN");
    guard(req, res, next);

    assert.equal(wasNextCalled(), false);
    assert.equal(getStatusCode(), 403);
    assert.equal(getData().success, false);
    assert.ok(getData().error.includes("Access denied"));
  });

  it("isolates notifications: Officer receives only their notifications, never another officer's", async () => {
    const officer1 = mockUsers[1];
    const { req, res, getStatusCode, getData } = createMockContext({
      user: {
        id: officer1.id,
        email: officer1.email,
        name: officer1.name,
        role: "OFFICER",
      },
    });

    await getMyNotifications(req, res);
    assert.equal(getStatusCode(), 200);
    assert.equal(getData().success, true);
    assert.equal(getData().data.length, 1);
    assert.equal(getData().data[0].id, "notif-1");
    assert.equal(getData().data[0].recipientId, "usr-off-1");
  });

  it("delivers consolidated case workspace payload to assigned officer under read guard", async () => {
    const officer1 = mockUsers[1];
    const { req, res, next, getStatusCode, getData, wasNextCalled } = createMockContext({
      params: { id: "app-1" },
      user: {
        id: officer1.id,
        email: officer1.email,
        name: officer1.name,
        role: "OFFICER",
      },
    });

    const guard = requireApplicationAccess("read");
    await guard(req, res, next);
    assert.equal(wasNextCalled(), true, "Assigned officer should pass read access guard");

    await getCaseWorkspaceData(req, res);
    assert.equal(getStatusCode(), 200);
    assert.equal(getData().success, true);
    assert.ok(getData().data.application);
    assert.equal(getData().data.application.id, "app-1");
    assert.ok(getData().data.documents);
    assert.equal(getData().data.documents.length, 1);
    assert.ok(getData().data.scrutinyReport);
    assert.equal(getData().data.scrutinyReport.id, "rep-1");
    assert.ok(getData().data.authorityVerifications);
    assert.equal(getData().data.authorityVerifications.length, 1);
    assert.ok(getData().data.auditTrail);
    assert.equal(getData().data.auditTrail.length, 1);
  });

  it("blocks unassigned officer from accessing another officer's case workspace with 403", async () => {
    const officer1 = mockUsers[1]; // usr-off-1
    const { req, res, next, getStatusCode, getData, wasNextCalled } = createMockContext({
      params: { id: "app-3" }, // assigned to usr-off-2
      user: {
        id: officer1.id,
        email: officer1.email,
        name: officer1.name,
        role: "OFFICER",
      },
    });

    const guard = requireApplicationAccess("read");
    await guard(req, res, next);
    assert.equal(wasNextCalled(), false);
    assert.equal(getStatusCode(), 403);
    assert.equal(getData().success, false);
    assert.ok(getData().error.includes("assigned to this application"));
  });

  it("permits ministry admin to access case workspace for operational oversight", async () => {
    const admin = mockUsers[0];
    const { req, res, next, getStatusCode, getData, wasNextCalled } = createMockContext({
      params: { id: "app-1" },
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: "MINISTRY_ADMIN",
      },
    });

    const guard = requireApplicationAccess("read");
    await guard(req, res, next);
    assert.equal(wasNextCalled(), true, "Ministry Admin has oversight read access");

    await getCaseWorkspaceData(req, res);
    assert.equal(getStatusCode(), 200);
    assert.equal(getData().success, true);
    assert.equal(getData().data.application.id, "app-1");
  });

  it("permits assigned officer to update document validation status and records audit log", async () => {
    const officer1 = mockUsers[1];
    const { req, res, next, getStatusCode, getData, wasNextCalled } = createMockContext({
      params: { id: "app-1", documentId: "doc-1" },
      body: { status: "PASS", notes: "Verified land resolution seals." },
      user: {
        id: officer1.id,
        email: officer1.email,
        name: officer1.name,
        role: "OFFICER",
      },
    });

    const guard = requireApplicationAccess("write");
    await guard(req, res, next);
    assert.equal(wasNextCalled(), true);

    await updateDocumentValidationStatus(req, res);
    assert.equal(getStatusCode(), 200);
    assert.equal(getData().success, true);
    assert.equal(getData().data.officerValidation.status, "PASS");
    assert.equal(getData().data.officerValidation.notes, "Verified land resolution seals.");
  });

  it("blocks ministry admin from modifying document validation status with 403", async () => {
    const admin = mockUsers[0];
    const { req, res, next, getStatusCode, getData, wasNextCalled } = createMockContext({
      params: { id: "app-1", documentId: "doc-1" },
      body: { status: "DEFICIENCY", notes: "Admin tamper test" },
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: "MINISTRY_ADMIN",
      },
    });

    const guard = requireApplicationAccess("write");
    await guard(req, res, next);
    assert.equal(wasNextCalled(), false);
    assert.equal(getStatusCode(), 403);
    assert.equal(getData().success, false);
    assert.ok(getData().error.includes("operational oversight only"));
  });

  it("blocks unassigned officer from modifying document validation status with 403", async () => {
    const officer2 = mockUsers[2]; // not assigned to app-1
    const { req, res, next, getStatusCode, getData, wasNextCalled } = createMockContext({
      params: { id: "app-1", documentId: "doc-1" },
      body: { status: "PASS" },
      user: {
        id: officer2.id,
        email: officer2.email,
        name: officer2.name,
        role: "OFFICER",
      },
    });

    const guard = requireApplicationAccess("write");
    await guard(req, res, next);
    assert.equal(wasNextCalled(), false);
    assert.equal(getStatusCode(), 403);
    assert.equal(getData().success, false);
    assert.ok(getData().error.includes("assigned to this application"));
  });

  it("rejects invalid status string with 400 Bad Request", async () => {
    const officer1 = mockUsers[1];
    const { req, res, next, getStatusCode, getData, wasNextCalled } = createMockContext({
      params: { id: "app-1", documentId: "doc-1" },
      body: { status: "INVALID_STATUS" },
      user: {
        id: officer1.id,
        email: officer1.email,
        name: officer1.name,
        role: "OFFICER",
      },
    });

    const guard = requireApplicationAccess("write");
    await guard(req, res, next);
    assert.equal(wasNextCalled(), true);

    await updateDocumentValidationStatus(req, res);
    assert.equal(getStatusCode(), 400);
    assert.equal(getData().success, false);
    assert.ok(getData().error.includes("Invalid status"));
  });
});
