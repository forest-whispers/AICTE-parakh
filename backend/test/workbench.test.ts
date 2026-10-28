import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma.js";
import { workbenchService } from "../src/services/workbench.service.js";
import { requireRole } from "../src/middlewares/auth.middleware.js";

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

const mockOfficer1Apps = [
  {
    id: "app-1",
    applicationNumber: "AICTE-DEMO-01",
    institutionName: "Vidyapeeth College of Engineering",
    programCategory: "ENGINEERING_AND_TECHNOLOGY",
    proposedIntake: 300,
    status: "COMPLIANT",
    createdAt: new Date("2026-10-01"),
    updatedAt: new Date("2026-10-05"),
    assignedOfficerId: "usr-off-1",
    documents: [
      { id: "doc-1", extractionStatus: "SUCCESS", documentType: "DOC_01_REGISTRATION" },
    ],
    scrutinyReports: [
      {
        id: "rep-1",
        overallStatus: "COMPLIANT",
        passedCount: 24,
        deficiencyCount: 0,
        reviewCount: 0,
        missingCount: 0,
        findings: [],
        createdAt: new Date("2026-10-05"),
        evaluationDate: new Date("2026-10-05"),
      },
    ],
    authorityVerifications: [],
  },
  {
    id: "app-2",
    applicationNumber: "AICTE-DEMO-02",
    institutionName: "Apex Technical Institute",
    programCategory: "ENGINEERING_AND_TECHNOLOGY",
    proposedIntake: 300,
    status: "DEFICIENCIES_DETECTED",
    createdAt: new Date("2026-10-02"),
    updatedAt: new Date("2026-10-06"),
    assignedOfficerId: "usr-off-1",
    documents: [
      { id: "doc-3", extractionStatus: "SUCCESS", documentType: "DOC_10_BANK_FUNDS" },
    ],
    scrutinyReports: [
      {
        id: "rep-2",
        overallStatus: "DEFICIENCIES_DETECTED",
        passedCount: 22,
        deficiencyCount: 1,
        reviewCount: 0,
        missingCount: 1,
        findings: [
          {
            ruleId: "RULE_MIN_FD_AMOUNT",
            ruleName: "Minimum Mandatory Fund Requirement",
            aphClause: "Clause 4.1",
            outcome: "FAIL_DEFICIENCY",
            severity: "CRITICAL",
            summary: "Extracted FDR ₹60 Lakhs below required ₹100 Lakhs.",
            details: "Shortfall of ₹40 Lakhs.",
            remediationNote: "Requisition supplementary unencumbered deposit.",
            evidence: [{ documentType: "DOC_10_BANK_FUNDS", excerpt: "FDR Amount: Rs. 60,00,000" }],
          },
          {
            ruleId: "RULE_MANDATORY_DOCUMENTS",
            ruleName: "Submission of Mandatory Annexures (APH 3.1)",
            aphClause: "Annexure 3.1",
            outcome: "EVIDENCE_MISSING",
            severity: "HIGH",
            summary: "Missing DOC-07 Occupancy Certificate.",
            details: "Occupancy certificate required.",
            remediationNote: "Upload approved occupancy certificate.",
            evidence: [],
          },
        ],
        createdAt: new Date("2026-10-06"),
        evaluationDate: new Date("2026-10-06"),
      },
    ],
    authorityVerifications: [
      {
        id: "v-2",
        status: "CONFIRMATION_PENDING",
        authorityCategory: "BANK_BRANCH",
        authorityName: "Official Bank Branch Inquiry",
        sourceName: "SBI Branch 00412",
        queryReference: "FDR-2024-9981",
        summary: "Awaiting bank branch manager written confirmation.",
        scrutinyActionPrompt: "Follow up with bank branch.",
        createdAt: new Date("2026-10-06"),
      },
    ],
  },
];

const mockOfficer2Apps = [
  {
    id: "app-4",
    applicationNumber: "AICTE-DEMO-04",
    institutionName: "National Polytechnic Institute",
    programCategory: "ENGINEERING_AND_TECHNOLOGY",
    proposedIntake: 300,
    status: "EXTRACTION_FAILED",
    createdAt: new Date("2026-10-04"),
    updatedAt: new Date("2026-10-08"),
    assignedOfficerId: "usr-off-2",
    documents: [
      { id: "doc-6", extractionStatus: "FAILED", documentType: "DOC_01_REGISTRATION" },
    ],
    scrutinyReports: [],
    authorityVerifications: [],
  },
];

const allApps = [...mockOfficer1Apps, ...mockOfficer2Apps];

describe("Phase 2: My Workbench Service & Security Boundaries", () => {
  before(() => {
    (prisma.application as any).findMany = async (args: any) => {
      const officerId = args?.where?.assignedOfficerId;
      if (officerId === "usr-off-1") return mockOfficer1Apps;
      if (officerId === "usr-off-2") return mockOfficer2Apps;
      return allApps;
    };

    (prisma.notification as any).count = async (args: any) => {
      if (args?.where?.recipientId === "usr-off-1") return 3;
      return 0;
    };

    (prisma.auditLog as any).count = async () => 1;
    (prisma.auditLog as any).findMany = async (args: any) => {
      return [
        {
          id: "log-off-1",
          action: "SCRUTINY_EVALUATED",
          actorId: "usr-off-1",
          actorName: "Er. Rajiv Malhotra",
          actorRole: "OFFICER",
          resourceType: "APPLICATION",
          resourceId: "app-2",
          status: "SUCCESS",
          details: "Scrutiny evaluated: DEFICIENCIES_DETECTED (1 deficiency)",
          createdAt: new Date("2026-10-06"),
          application: { id: "app-2", applicationNumber: "AICTE-DEMO-02", institutionName: "Apex Technical" },
        },
      ];
    };
  });

  it("enforces role guard: rejects MINISTRY_ADMIN from accessing Officer Workbench with 403 Forbidden", async () => {
    const { req, res, next, getStatusCode, getData, wasNextCalled } = createMockContext({
      user: { id: "usr-admin-1", role: "MINISTRY_ADMIN", name: "Dr. Sanjay Sharma" },
    });

    const guard = requireRole("OFFICER");
    guard(req, res, next);

    assert.equal(wasNextCalled(), false, "Ministry Admin must not be permitted into Officer Workbench");
    assert.equal(getStatusCode(), 403);
    assert.equal(getData().success, false);
    assert.ok(getData().error.includes("Access denied"));
  });

  it("provides personalized workbench overview isolated to the authenticated officer's assignments", async () => {
    const overview = await workbenchService.getWorkbenchOverview("usr-off-1");

    assert.equal(overview.totalAssigned, 2, "Officer 1 has exactly 2 assigned applications");
    assert.equal(overview.activeAssigned, 1);
    assert.equal(overview.compliantCount, 1);
    assert.equal(overview.deficienciesCount, 1);
    assert.equal(overview.pendingConfirmationsCount, 1);
    assert.equal(overview.unreadNotificationsCount, 3);
  });

  it("strictly enforces application ownership: Officer 1 cannot see Officer 2's applications in the register", async () => {
    const result = await workbenchService.getAssignedApplications("usr-off-1", {});

    assert.equal(result.data.length, 2);
    for (const app of result.data) {
      assert.notEqual(app.applicationNumber, "AICTE-DEMO-04", "Officer 2's app must never leak to Officer 1");
    }

    // Verify search functionality
    const searchResult = await workbenchService.getAssignedApplications("usr-off-1", {
      search: "Apex",
    });
    assert.equal(searchResult.data.length, 1);
    assert.equal(searchResult.data[0].applicationNumber, "AICTE-DEMO-02");

    // Verify filter by hasDeficiencies
    const defResult = await workbenchService.getAssignedApplications("usr-off-1", {
      hasDeficiencies: true,
    });
    assert.equal(defResult.data.length, 1);
    assert.equal(defResult.data[0].applicationNumber, "AICTE-DEMO-02");
  });

  it("computes a prioritized actionable queue rank-ordered by operational urgency", async () => {
    // For Officer 2: has extraction failure on App 4
    const off2Queue = await workbenchService.getPrioritizedActionQueue("usr-off-2");
    assert.ok(off2Queue.length >= 1);
    assert.equal(off2Queue[0].priorityRank, 1, "Extraction failure must be top priority rank 1");
    assert.equal(off2Queue[0].urgency, "CRITICAL");
    assert.equal(off2Queue[0].issueType, "EXTRACTION_FAILURE");
    assert.ok(off2Queue[0].recommendedAction.includes("re-trigger multimodal extraction"));

    // For Officer 1: has regulatory deficiency (Rank 2) and pending bank confirmation (Rank 5)
    const off1Queue = await workbenchService.getPrioritizedActionQueue("usr-off-1");
    assert.ok(off1Queue.length >= 2);

    const deficiencyItem = off1Queue.find((q) => q.issueType === "REGULATORY_DEFICIENCY");
    assert.ok(deficiencyItem);
    assert.equal(deficiencyItem.priorityRank, 2);
    assert.equal(deficiencyItem.urgency, "CRITICAL");
    assert.ok(deficiencyItem.recommendedAction.includes("deposit"));

    const bankItem = off1Queue.find((q) => q.issueType === "PENDING_BANK_CONFIRMATION");
    assert.ok(bankItem);
    assert.equal(bankItem.priorityRank, 5);
    assert.equal(bankItem.urgency, "MEDIUM");
    assert.ok(bankItem.recommendedAction.includes("confirmation letter"));
  });

  it("preserves distinct regulatory review and verification work buckets without flattening", async () => {
    const buckets = await workbenchService.getReviewAndVerificationWork("usr-off-1");

    assert.ok(buckets.length >= 7);
    const defBucket = buckets.find((b) => b.category === "COMPLIANCE_DEFICIENCIES");
    assert.ok(defBucket);
    assert.equal(defBucket.count, 1);
    assert.equal(defBucket.items[0].itemKey, "RULE_MIN_FD_AMOUNT");

    const missBucket = buckets.find((b) => b.category === "MISSING_EVIDENCE");
    assert.ok(missBucket);
    assert.equal(missBucket.count, 1);

    const bankBucket = buckets.find((b) => b.category === "PENDING_BANK_CONFIRMATIONS");
    assert.ok(bankBucket);
    assert.equal(bankBucket.count, 1);
    assert.ok(bankBucket.items[0].title.includes("Official Bank Branch Inquiry"));
  });

  it("returns recent operational activity strictly relating to the officer's assigned applications", async () => {
    const result = await workbenchService.getAssignedActivity("usr-off-1", {});

    assert.equal(result.activity.length, 1);
    assert.equal(result.activity[0].application.applicationNumber, "AICTE-DEMO-02");
    assert.equal(result.activity[0].action, "SCRUTINY_EVALUATED");
    assert.equal(result.activity[0].actor.name, "Er. Rajiv Malhotra");
  });
});
