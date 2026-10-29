import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applicationListingService } from "../src/services/application-listing.service.js";
import { prisma } from "../src/lib/prisma.js";
import type { AuthenticatedUser } from "../src/services/auth.service.js";

describe("Application Listing Service — Role Scoping, Scrutiny Freshness & Pagination", () => {
  const officer1: AuthenticatedUser = {
    id: "officer-uuid-1",
    name: "Officer One",
    email: "officer1@aicte.gov.in",
    role: "OFFICER",
    designation: "Scrutiny Officer",
  };

  const officer2: AuthenticatedUser = {
    id: "officer-uuid-2",
    name: "Officer Two",
    email: "officer2@aicte.gov.in",
    role: "OFFICER",
    designation: "Regional Officer",
  };

  const ministryAdmin: AuthenticatedUser = {
    id: "admin-uuid-1",
    name: "Ministry Director",
    email: "director@aicte.gov.in",
    role: "MINISTRY_ADMIN",
    designation: "Director of Technical Education",
  };

  // Mock application dataset with varying assignments, lifecycles, and scrutiny reports
  const mockDataset = [
    // App 1: Assigned to Officer 1. Older report: COMPLIANT, Latest report: DEFICIENCIES_DETECTED
    {
      id: "app-1",
      applicationNumber: "AICTE-2026-0001",
      institutionName: "Aryabhata Engineering College",
      programCategory: "ENGINEERING_AND_TECHNOLOGY",
      proposedIntake: 240,
      status: "DEFICIENCIES_DETECTED",
      assignedOfficerId: "officer-uuid-1",
      createdAt: new Date("2026-10-01T10:00:00Z"),
      assignedOfficer: { id: "officer-uuid-1", name: "Officer One", email: "officer1@aicte.gov.in", designation: "Scrutiny Officer" },
      documents: [],
      scrutinyReports: [
        // Latest report (index 0)
        {
          id: "rep-latest-1",
          overallStatus: "DEFICIENCIES_DETECTED",
          totalRulesRun: 10,
          passedCount: 8,
          deficiencyCount: 2,
          reviewCount: 0,
          missingCount: 0,
          evaluationDate: new Date("2026-10-20T10:00:00Z"),
          createdAt: new Date("2026-10-20T10:00:00Z"),
        },
        // Older historical report (index 1)
        {
          id: "rep-old-1",
          overallStatus: "COMPLIANT",
          totalRulesRun: 10,
          passedCount: 10,
          deficiencyCount: 0,
          reviewCount: 0,
          missingCount: 0,
          evaluationDate: new Date("2026-10-10T10:00:00Z"),
          createdAt: new Date("2026-10-10T10:00:00Z"),
        },
      ],
    },
    // App 2: Assigned to Officer 1. Latest report: COMPLIANT
    {
      id: "app-2",
      applicationNumber: "AICTE-2026-0002",
      institutionName: "Bhaskara Institute of Technology",
      programCategory: "ENGINEERING_AND_TECHNOLOGY",
      proposedIntake: 120,
      status: "COMPLIANT",
      assignedOfficerId: "officer-uuid-1",
      createdAt: new Date("2026-10-02T10:00:00Z"),
      assignedOfficer: { id: "officer-uuid-1", name: "Officer One", email: "officer1@aicte.gov.in", designation: "Scrutiny Officer" },
      documents: [],
      scrutinyReports: [
        {
          id: "rep-2",
          overallStatus: "COMPLIANT",
          totalRulesRun: 10,
          passedCount: 10,
          deficiencyCount: 0,
          reviewCount: 0,
          missingCount: 0,
          evaluationDate: new Date("2026-10-21T10:00:00Z"),
          createdAt: new Date("2026-10-21T10:00:00Z"),
        },
      ],
    },
    // App 3: Assigned to Officer 2. Latest report: MANUAL_REVIEW_REQUIRED
    {
      id: "app-3",
      applicationNumber: "AICTE-2026-0003",
      institutionName: "Chanakya Business School",
      programCategory: "MANAGEMENT",
      proposedIntake: 60,
      status: "MANUAL_REVIEW_REQUIRED",
      assignedOfficerId: "officer-uuid-2",
      createdAt: new Date("2026-10-03T10:00:00Z"),
      assignedOfficer: { id: "officer-uuid-2", name: "Officer Two", email: "officer2@aicte.gov.in", designation: "Regional Officer" },
      documents: [],
      scrutinyReports: [
        {
          id: "rep-3",
          overallStatus: "MANUAL_REVIEW_REQUIRED",
          totalRulesRun: 8,
          passedCount: 6,
          deficiencyCount: 0,
          reviewCount: 2,
          missingCount: 0,
          evaluationDate: new Date("2026-10-22T10:00:00Z"),
          createdAt: new Date("2026-10-22T10:00:00Z"),
        },
      ],
    },
    // App 4: Unassigned. Zero scrutiny reports (AWAITING/UNASSESSED)
    {
      id: "app-4",
      applicationNumber: "AICTE-2026-0004",
      institutionName: "Dronacharya Pharmacy College",
      programCategory: "PHARMACY",
      proposedIntake: 100,
      status: "SUBMITTED",
      assignedOfficerId: null,
      createdAt: new Date("2026-10-04T10:00:00Z"),
      assignedOfficer: null,
      documents: [],
      scrutinyReports: [],
    },
  ];

  it("1. Officer Scope Isolation: Officer receives strictly their assigned cases and cannot bypass via query params", async () => {
    // Intercept prisma.application.findMany
    const origFindMany = prisma.application.findMany;
    (prisma.application as any).findMany = async ({ where }: any) => {
      return mockDataset.filter((app) => {
        if (where.assignedOfficerId !== undefined && app.assignedOfficerId !== where.assignedOfficerId) {
          return false;
        }
        return true;
      });
    };

    try {
      // Officer 1 requests without params
      const res1 = await applicationListingService.listApplications(officer1, {});
      assert.strictEqual(res1.pagination.total, 2);
      assert.deepStrictEqual(res1.data.map((a) => a.id), ["app-1", "app-2"]);

      // Officer 1 attempts to query Officer 2's cases or unassigned via params: must be overridden to Officer 1
      const resBypass = await applicationListingService.listApplications(officer1, {
        officerId: "officer-uuid-2",
      });
      assert.strictEqual(resBypass.pagination.total, 2);
      assert.deepStrictEqual(resBypass.data.map((a) => a.id), ["app-1", "app-2"]);
    } finally {
      prisma.application.findMany = origFindMany;
    }
  });

  it("2. Ministry Scope: Ministry Admin accesses entire portfolio across all officers and unassigned", async () => {
    const origFindMany = prisma.application.findMany;
    (prisma.application as any).findMany = async () => mockDataset;

    try {
      const res = await applicationListingService.listApplications(ministryAdmin, {});
      assert.strictEqual(res.pagination.total, 4);
      assert.strictEqual(res.data.length, 4);
    } finally {
      prisma.application.findMany = origFindMany;
    }
  });

  it("3. Ministry Admin can filter by specific officer or unassigned queue", async () => {
    const origFindMany = prisma.application.findMany;
    (prisma.application as any).findMany = async ({ where }: any) => {
      return mockDataset.filter((app) => {
        if ("assignedOfficerId" in where && app.assignedOfficerId !== where.assignedOfficerId) {
          return false;
        }
        return true;
      });
    };

    try {
      // Filter unassigned
      const unassignedRes = await applicationListingService.listApplications(ministryAdmin, {
        officerId: "unassigned",
      });
      assert.strictEqual(unassignedRes.pagination.total, 1);
      assert.strictEqual(unassignedRes.data[0].id, "app-4");

      // Filter Officer 2
      const officer2Res = await applicationListingService.listApplications(ministryAdmin, {
        officerId: "officer-uuid-2",
      });
      assert.strictEqual(officer2Res.pagination.total, 1);
      assert.strictEqual(officer2Res.data[0].id, "app-3");
    } finally {
      prisma.application.findMany = origFindMany;
    }
  });

  it("4. Safeguard 1 Regression Test: Older report matches COMPLIANT, but latest is DEFICIENCIES_DETECTED", async () => {
    const origFindMany = prisma.application.findMany;
    (prisma.application as any).findMany = async () => {
      // Return apps with their single latest scrutiny report (simulating take: 1, orderBy desc)
      return mockDataset.map((app) => ({
        ...app,
        scrutinyReports: app.scrutinyReports.slice(0, 1),
      }));
    };

    try {
      // Filter by COMPLIANT
      const compliantRes = await applicationListingService.listApplications(ministryAdmin, {
        scrutinyStatus: "COMPLIANT",
      });

      // App 1 must NOT be included even though it had an older COMPLIANT report!
      const ids = compliantRes.data.map((a) => a.id);
      assert.strictEqual(ids.includes("app-1"), false, "App 1 should NOT be in COMPLIANT results");
      assert.strictEqual(ids.includes("app-2"), true, "App 2 must be in COMPLIANT results");
      assert.strictEqual(compliantRes.pagination.total, 1);

      // Filter by DEFICIENCIES_DETECTED: App 1 MUST be returned
      const deficRes = await applicationListingService.listApplications(ministryAdmin, {
        scrutinyStatus: "DEFICIENCIES_DETECTED",
      });
      assert.strictEqual(deficRes.pagination.total, 1);
      assert.strictEqual(deficRes.data[0].id, "app-1");
    } finally {
      prisma.application.findMany = origFindMany;
    }
  });

  it("5. Handles applications with no scrutiny report explicitly via UNASSESSED", async () => {
    const origFindMany = prisma.application.findMany;
    (prisma.application as any).findMany = async () => {
      return mockDataset.map((app) => ({
        ...app,
        scrutinyReports: app.scrutinyReports.slice(0, 1),
      }));
    };

    try {
      const res = await applicationListingService.listApplications(ministryAdmin, {
        scrutinyStatus: "UNASSESSED",
      });
      assert.strictEqual(res.pagination.total, 1);
      assert.strictEqual(res.data[0].id, "app-4");
    } finally {
      prisma.application.findMany = origFindMany;
    }
  });

  it("6. Text search and accurate pagination metadata", async () => {
    const origFindMany = prisma.application.findMany;
    (prisma.application as any).findMany = async ({ where }: any = {}) => {
      return mockDataset.filter((app) => {
        if (where?.OR) {
          const q = where.OR[0].applicationNumber.contains.toLowerCase();
          const matchNum = app.applicationNumber.toLowerCase().includes(q);
          const matchName = app.institutionName.toLowerCase().includes(q);
          return matchNum || matchName;
        }
        return true;
      });
    };

    try {
      // Search by partial text
      const searchRes = await applicationListingService.listApplications(ministryAdmin, {
        search: "Aryabhata",
        page: 1,
        limit: 10,
      });
      assert.strictEqual(searchRes.pagination.total, 1);
      assert.strictEqual(searchRes.pagination.page, 1);
      assert.strictEqual(searchRes.pagination.totalPages, 1);
      assert.strictEqual(searchRes.data[0].institutionName, "Aryabhata Engineering College");

      // Pagination test with limit 1
      const pageRes = await applicationListingService.listApplications(ministryAdmin, {
        page: 2,
        limit: 2,
      });
      assert.strictEqual(pageRes.pagination.total, 4);
      assert.strictEqual(pageRes.pagination.page, 2);
      assert.strictEqual(pageRes.pagination.limit, 2);
      assert.strictEqual(pageRes.pagination.totalPages, 2);
      assert.strictEqual(pageRes.data.length, 2);
    } finally {
      prisma.application.findMany = origFindMany;
    }
  });
});
