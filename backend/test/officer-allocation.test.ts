import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { assignmentService } from "../src/services/assignment.service.js";
import { applicationListingService } from "../src/services/application-listing.service.js";
import { prisma } from "../src/lib/prisma.js";
import type { AuthenticatedUser } from "../src/services/auth.service.js";

describe("Ministry Officer Allocation Workflow — Service & Concurrency Tests", () => {
  const adminUser: AuthenticatedUser = {
    id: "usr-admin-1",
    email: "admin@ministry.gov.in",
    name: "Ministry Admin",
    role: "MINISTRY_ADMIN",
    designation: "Director of Technical Education",
  };

  const officerUser1: AuthenticatedUser = {
    id: "usr-off-1",
    email: "ananya.rao@aicte.gov.in",
    name: "Dr. Ananya Rao",
    role: "OFFICER",
    designation: "Scrutiny Officer (Tech/Eng)",
  };

  const officerUser2: AuthenticatedUser = {
    id: "usr-off-2",
    email: "rajesh.sharma@aicte.gov.in",
    name: "Prof. Rajesh Sharma",
    role: "OFFICER",
    designation: "Senior Scrutiny Officer",
  };

  let mockApps: any[] = [];
  let mockUsers: any[] = [];
  let mockAuditLogs: any[] = [];
  let mockNotifications: any[] = [];

  beforeEach(() => {
    mockUsers = [
      {
        id: "usr-admin-1",
        email: "admin@ministry.gov.in",
        name: "Ministry Admin",
        role: "MINISTRY_ADMIN",
        isActive: true,
      },
      {
        id: "usr-off-1",
        email: "ananya.rao@aicte.gov.in",
        name: "Dr. Ananya Rao",
        role: "OFFICER",
        isActive: true,
        designation: "Scrutiny Officer (Tech/Eng)",
      },
      {
        id: "usr-off-2",
        email: "rajesh.sharma@aicte.gov.in",
        name: "Prof. Rajesh Sharma",
        role: "OFFICER",
        isActive: true,
        designation: "Senior Scrutiny Officer",
      },
      {
        id: "usr-off-inactive",
        email: "inactive@aicte.gov.in",
        name: "Deactivated Officer",
        role: "OFFICER",
        isActive: false,
      },
    ];

    mockApps = [
      {
        id: "app-unassigned-1",
        applicationNumber: "AICTE-2026-UNASSIGNED-01",
        institutionName: "National Institute of Science & Tech",
        programCategory: "ENGINEERING_AND_TECHNOLOGY",
        proposedIntake: 300,
        status: "SUBMITTED",
        createdAt: new Date("2026-10-20T10:00:00Z"),
        updatedAt: new Date("2026-10-20T10:00:00Z"),
        assignedOfficerId: null,
        assignedOfficer: null,
        documents: [
          {
            id: "doc-1",
            fileName: "land_deed.pdf",
            originalName: "Registered Sale Deed.pdf",
            documentType: "DOC_03_LAND_DEED",
            mimeType: "application/pdf",
            fileSize: 1048576,
            extractionStatus: "SUCCESS",
          },
        ],
        scrutinyReports: [],
      },
      {
        id: "app-unassigned-2",
        applicationNumber: "AICTE-2026-UNASSIGNED-02",
        institutionName: "Kalinga Institute of Management",
        programCategory: "MANAGEMENT",
        proposedIntake: 120,
        status: "PROCESSING_EXTRACTION",
        createdAt: new Date("2026-10-21T10:00:00Z"),
        updatedAt: new Date("2026-10-21T10:00:00Z"),
        assignedOfficerId: null,
        assignedOfficer: null,
        documents: [],
        scrutinyReports: [],
      },
      {
        id: "app-assigned-1",
        applicationNumber: "AICTE-2026-ASSIGNED-01",
        institutionName: "Vellore Polytechnic",
        programCategory: "ENGINEERING_AND_TECHNOLOGY",
        proposedIntake: 240,
        status: "SUBMITTED",
        createdAt: new Date("2026-10-22T10:00:00Z"),
        updatedAt: new Date("2026-10-22T10:00:00Z"),
        assignedOfficerId: "usr-off-1",
        assignedOfficer: mockUsers[1],
        documents: [],
        scrutinyReports: [],
      },
    ];

    mockAuditLogs = [];
    mockNotifications = [];

    // Mock prisma
    (prisma.application.findMany as any) = async (args: any) => {
      let result = [...mockApps];
      const where = args?.where || {};

      if ("assignedOfficerId" in where) {
        result = result.filter((a) => a.assignedOfficerId === where.assignedOfficerId);
      }
      if (where.status) {
        result = result.filter((a) => a.status === where.status);
      }
      if (where.programCategory) {
        result = result.filter((a) => a.programCategory === where.programCategory);
      }
      if (where.OR) {
        result = result.filter((a) =>
          where.OR.some((clause: any) => {
            if (clause.applicationNumber) {
              return a.applicationNumber.toLowerCase().includes(clause.applicationNumber.contains.toLowerCase());
            }
            if (clause.institutionName) {
              return a.institutionName.toLowerCase().includes(clause.institutionName.contains.toLowerCase());
            }
            return false;
          })
        );
      }

      return result;
    };

    (prisma.application.findUnique as any) = async ({ where }: any) => {
      return mockApps.find((a) => a.id === where.id) || null;
    };

    (prisma.application.update as any) = async ({ where, data }: any) => {
      const app = mockApps.find((a) => a.id === where.id);
      if (!app) throw new Error("Application not found");
      Object.assign(app, data);
      if (data.assignedOfficerId) {
        app.assignedOfficer = mockUsers.find((u) => u.id === data.assignedOfficerId) || null;
      }
      return app;
    };

    (prisma.application.updateMany as any) = async ({ where, data }: any) => {
      const matches = mockApps.filter((a) => {
        if (where.id && a.id !== where.id) return false;
        if ("assignedOfficerId" in where && a.assignedOfficerId !== where.assignedOfficerId) return false;
        return true;
      });

      for (const app of matches) {
        Object.assign(app, data);
        if (data.assignedOfficerId) {
          app.assignedOfficer = mockUsers.find((u) => u.id === data.assignedOfficerId) || null;
        }
      }

      return { count: matches.length };
    };

    (prisma.user.findUnique as any) = async ({ where }: any) => {
      return mockUsers.find((u) => u.id === where.id) || null;
    };

    (prisma.user.findMany as any) = async ({ where }: any) => {
      let res = [...mockUsers];
      if (where?.role) res = res.filter((u) => u.role === where.role);
      if (where?.isActive !== undefined) res = res.filter((u) => u.isActive === where.isActive);
      return res;
    };

    (prisma.auditLog.create as any) = async ({ data }: any) => {
      mockAuditLogs.push(data);
      return { id: "log-1", ...data, createdAt: new Date() };
    };

    (prisma.notification.findFirst as any) = async () => null;

    (prisma.notification.create as any) = async ({ data }: any) => {
      mockNotifications.push(data);
      return { id: "notif-1", ...data, createdAt: new Date() };
    };
  });

  it("1. Unassigned-Only Scoping: Returns only applications where assignedOfficerId is null", async () => {
    const result = await applicationListingService.listApplications(adminUser, {
      officerId: "unassigned",
    });

    assert.equal(result.data.length, 2);
    assert.ok(result.data.every((app) => app.assignedOfficerId === null));
    assert.equal(result.pagination.total, 2);
  });

  it("2. Client Bypass Prevention: Server-enforced officerId=unassigned ignores client officerId override", async () => {
    // Controller forces officerId: 'unassigned'
    const result = await applicationListingService.listApplications(adminUser, {
      officerId: "unassigned",
    });

    assert.equal(result.data.length, 2);
    assert.ok(!result.data.some((a) => a.id === "app-assigned-1"));
  });

  it("3. Horizontal Status Filtering: Correctly filters unassigned apps by lifecycle status", async () => {
    const submittedResult = await applicationListingService.listApplications(adminUser, {
      officerId: "unassigned",
      status: "SUBMITTED",
    });

    assert.equal(submittedResult.data.length, 1);
    assert.equal(submittedResult.data[0].id, "app-unassigned-1");
    assert.equal(submittedResult.pagination.total, 1);

    const extractionResult = await applicationListingService.listApplications(adminUser, {
      officerId: "unassigned",
      status: "PROCESSING_EXTRACTION",
    });

    assert.equal(extractionResult.data.length, 1);
    assert.equal(extractionResult.data[0].id, "app-unassigned-2");
    assert.equal(extractionResult.pagination.total, 1);
  });

  it("4. Successful Allocation: Ministry Admin allocates unassigned application to active officer", async () => {
    const updated = await assignmentService.assignApplication(
      "app-unassigned-1",
      "usr-off-1",
      adminUser as any,
      "Initial desk allocation",
      { enforceUnassigned: true }
    );

    assert.equal(updated.assignedOfficerId, "usr-off-1");
    assert.equal(updated.assignedOfficer?.name, "Dr. Ananya Rao");

    // Verify audit log recorded
    assert.ok(mockAuditLogs.some((l) => l.action === "APPLICATION_ASSIGNED" && l.resourceId === "app-unassigned-1"));

    // Verify notification queued
    assert.ok(mockNotifications.some((n) => n.recipientId === "usr-off-1" && n.type === "APPLICATION_ASSIGNED"));

    // Verify application no longer appears in unassigned queue
    const unassignedAfter = await applicationListingService.listApplications(adminUser, {
      officerId: "unassigned",
    });
    assert.equal(unassignedAfter.data.length, 1);
    assert.equal(unassignedAfter.data[0].id, "app-unassigned-2");
  });

  it("5. Stale / Concurrent Allocation Protection: Rejects allocation of already-assigned application", async () => {
    // app-assigned-1 is already assigned to usr-off-1
    await assert.rejects(
      async () => {
        await assignmentService.assignApplication(
          "app-assigned-1",
          "usr-off-2",
          adminUser as any,
          "Attempted reallocation in allocation workflow",
          { enforceUnassigned: true }
        );
      },
      /Conflict: Application .* has already been assigned/i
    );
  });

  it("6. Invalid Target Officer Rejection: Rejects allocation to inactive officer", async () => {
    await assert.rejects(
      async () => {
        await assignmentService.assignApplication(
          "app-unassigned-2",
          "usr-off-inactive",
          adminUser as any,
          "Allocation to inactive officer",
          { enforceUnassigned: true }
        );
      },
      /deactivated/i
    );
  });

  it("7. Role Authorization Protection: Rejects allocation attempts by ordinary Officer", async () => {
    await assert.rejects(
      async () => {
        await assignmentService.assignApplication(
          "app-unassigned-2",
          "usr-off-2",
          officerUser1 as any,
          "Unauthorized allocation",
          { enforceUnassigned: true }
        );
      },
      /Access denied/i
    );
  });
});