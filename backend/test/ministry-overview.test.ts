import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma.js";
import { ministryService } from "../src/services/ministry.service.js";
import {
  getMinistryOverview,
  getMinistryApplications,
  getMinistryWorkload,
  getMinistryIssues,
  getMinistryActivity,
  getMinistryDashboard,
} from "../src/controllers/ministry.controller.js";
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

const mockApps = [
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
    assignedOfficer: { id: "usr-off-1", name: "Er. Rajiv Malhotra", email: "officer1@aicte.gov.in", designation: "Senior Officer" },
    documents: [
      { id: "doc-1", extractionStatus: "SUCCESS", documentType: "DOC_01_REGISTRATION" },
      { id: "doc-2", extractionStatus: "SUCCESS", documentType: "DOC_03_LAND_DEED" },
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
    authorityVerifications: [
      {
        id: "v-1",
        status: "VERIFIED_SIMULATED",
        authorityCategory: "SOCIETY_REGISTRAR",
        authorityName: "Registrar of Societies",
        sourceName: "State Society Database",
        queryReference: "SOC/2012/991",
        summary: "Verified matches official registry.",
        scrutinyActionPrompt: "Proceed with scrutiny.",
        createdAt: new Date("2026-10-05"),
      },
    ],
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
    assignedOfficer: { id: "usr-off-1", name: "Er. Rajiv Malhotra", email: "officer1@aicte.gov.in", designation: "Senior Officer" },
    documents: [
      { id: "doc-3", extractionStatus: "SUCCESS", documentType: "DOC_01_REGISTRATION" },
      { id: "doc-4", extractionStatus: "SUCCESS", documentType: "DOC_10_BANK_FUNDS" },
    ],
    scrutinyReports: [
      {
        id: "rep-2",
        overallStatus: "DEFICIENCIES_DETECTED",
        passedCount: 22,
        deficiencyCount: 2,
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
            evidence: [{ documentType: "DOC_10_BANK_FUNDS", excerpt: "FDR Amount: Rs. 60,00,000" }],
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
  {
    id: "app-3",
    applicationNumber: "AICTE-DEMO-03",
    institutionName: "Pragati Institute of Technology",
    programCategory: "OTHER_TECHNICAL_PROGRAMMES",
    proposedIntake: 180,
    status: "MANUAL_REVIEW_REQUIRED",
    createdAt: new Date("2026-10-03"),
    updatedAt: new Date("2026-10-07"),
    assignedOfficerId: "usr-off-2",
    assignedOfficer: { id: "usr-off-2", name: "Dr. Sunita Deshmukh", email: "officer2@aicte.gov.in", designation: "Regional Officer" },
    documents: [
      { id: "doc-5", extractionStatus: "SUCCESS", documentType: "DOC_03_LAND_DEED" },
    ],
    scrutinyReports: [
      {
        id: "rep-3",
        overallStatus: "MANUAL_REVIEW_REQUIRED",
        passedCount: 21,
        deficiencyCount: 0,
        reviewCount: 2,
        missingCount: 0,
        findings: [
          {
            ruleId: "RULE_DOC_ANOMALY_FORENSICS",
            ruleName: "Document Structural & Metadata Forensics",
            aphClause: "Forensic Advisory",
            outcome: "MANUAL_REVIEW_REQUIRED",
            severity: "MEDIUM",
            summary: "PDF metadata indicates creation with graphic design software (Photoshop).",
            details: "Producer: Adobe Photoshop 2024.",
            evidence: [{ documentType: "DOC_03_LAND_DEED", excerpt: "Producer: Adobe Photoshop" }],
          },
        ],
        createdAt: new Date("2026-10-07"),
        evaluationDate: new Date("2026-10-07"),
      },
    ],
    authorityVerifications: [
      {
        id: "v-3",
        status: "MISMATCH_DETECTED",
        authorityCategory: "REVENUE_DEPARTMENT",
        authorityName: "Revenue & Land Records",
        sourceName: "Bhulekh Land Portal",
        queryReference: "KHATA-981",
        summary: "Extracted land area diverges from registered revenue record.",
        scrutinyActionPrompt: "Request certified khatian from revenue authority.",
        createdAt: new Date("2026-10-07"),
      },
    ],
  },
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
    assignedOfficer: { id: "usr-off-2", name: "Dr. Sunita Deshmukh", email: "officer2@aicte.gov.in", designation: "Regional Officer" },
    documents: [
      { id: "doc-6", extractionStatus: "FAILED", documentType: "DOC_01_REGISTRATION" },
    ],
    scrutinyReports: [],
    authorityVerifications: [],
  },
  {
    id: "app-8",
    applicationNumber: "AICTE-DEMO-08",
    institutionName: "Shri Siddhivinayak College of Engineering",
    programCategory: "ENGINEERING_AND_TECHNOLOGY",
    proposedIntake: 300,
    status: "SUBMITTED",
    createdAt: new Date("2026-10-05"),
    updatedAt: new Date("2026-10-05"),
    assignedOfficerId: null, // Unassigned exception
    assignedOfficer: null,
    documents: [
      { id: "doc-7", extractionStatus: "SUCCESS", documentType: "DOC_01_REGISTRATION" },
    ],
    scrutinyReports: [],
    authorityVerifications: [],
  },
];

const mockOfficers = [
  {
    id: "usr-off-1",
    name: "Er. Rajiv Malhotra",
    email: "officer1@aicte.gov.in",
    role: "OFFICER",
    designation: "Senior Officer",
    department: "Northern Regional Office",
    isActive: true,
    assignedApplications: [mockApps[0], mockApps[1]],
  },
  {
    id: "usr-off-2",
    name: "Dr. Sunita Deshmukh",
    email: "officer2@aicte.gov.in",
    role: "OFFICER",
    designation: "Regional Officer",
    department: "Western Regional Office",
    isActive: true,
    assignedApplications: [mockApps[2], mockApps[3]],
  },
];

const mockAuditLogs = [
  {
    id: "log-1",
    action: "APPLICATION_CREATED",
    actorId: "usr-admin-1",
    actorName: "Dr. Sanjay Sharma",
    actorRole: "MINISTRY_ADMIN",
    resourceType: "APPLICATION",
    resourceId: "app-1",
    status: "SUCCESS",
    details: "Created application AICTE-DEMO-01",
    metadata: {},
    createdAt: new Date("2026-10-01"),
    application: { id: "app-1", applicationNumber: "AICTE-DEMO-01", institutionName: "Vidyapeeth College" },
  },
  {
    id: "log-2",
    action: "EXTRACTION_FAILED",
    actorId: null,
    actorName: "SYSTEM",
    actorRole: "SYSTEM",
    resourceType: "APPLICATION",
    resourceId: "app-4",
    status: "FAILURE",
    details: "VLM ingestion failed for corrupted PDF",
    metadata: {},
    createdAt: new Date("2026-10-04"),
    application: { id: "app-4", applicationNumber: "AICTE-DEMO-04", institutionName: "National Polytechnic" },
  },
];

describe("Phase 2: Ministry Overview Service & Controllers", () => {
  before(() => {
    (prisma.application as any).findMany = async (args: any) => {
      if (args?.where?.assignedOfficerId === null) {
        return mockApps.filter((a) => a.assignedOfficerId === null);
      }
      return mockApps;
    };

    (prisma.user as any).findMany = async (args: any) => {
      if (args?.where?.role === "OFFICER") {
        return mockOfficers;
      }
      return [];
    };

    (prisma.auditLog as any).count = async () => mockAuditLogs.length;
    (prisma.auditLog as any).findMany = async () => mockAuditLogs;
  });

  it("enforces role guard: rejects OFFICER from accessing Ministry Overview with 403 Forbidden", async () => {
    const { req, res, next, getStatusCode, getData, wasNextCalled } = createMockContext({
      user: { id: "usr-off-1", role: "OFFICER", name: "Er. Rajiv Malhotra" },
    });

    const guard = requireRole("MINISTRY_ADMIN");
    guard(req, res, next);

    assert.equal(wasNextCalled(), false, "Officer must not be permitted into Ministry Overview");
    assert.equal(getStatusCode(), 403);
    assert.equal(getData().success, false);
    assert.ok(getData().error.includes("Access denied"));
  });

  it("calculates accurate, non-conflicting portfolio summary metrics across the application lifecycle", async () => {
    const overview = await ministryService.getPortfolioOverview();

    assert.equal(overview.totalApplications, 5, "Total applications count must match database records");
    assert.equal(overview.metrics.totalApplications, 5);
    assert.equal(overview.metrics.extractionFailures, 1, "App 4 has extraction failure");
    assert.equal(overview.metrics.scrutinyDeficiencies, 1, "App 2 has statutory deficiencies");
    assert.equal(overview.metrics.manualReviewRequired, 1, "App 3 has manual review");
    assert.equal(overview.metrics.incompleteSubmissions, 1, "App 2 is missing mandatory documents");
    assert.equal(overview.metrics.pendingAuthorityConfirmations, 1, "App 2 has pending bank branch letter");
    assert.equal(overview.metrics.unresolvedAuthorityMismatches, 1, "App 3 has land revenue mismatch");
    assert.equal(overview.metrics.unresolvedForensicAnomalies, 1, "App 3 has PDF photoshop advisory");
    assert.equal(overview.metrics.unassignedExceptions, 1, "App 8 is unassigned in exception queue");

    // Verify clear metric definitions exist for every summary key
    assert.ok(overview.metricDefinitions.totalApplications);
    assert.ok(overview.metricDefinitions.scrutinyDeficiencies);
    assert.ok(overview.metricDefinitions.unresolvedAuthorityMismatches);
    assert.equal(overview.metricDefinitions.scrutinyDeficiencies.isMutuallyExclusive, false);

    // Verify pipeline stages
    assert.equal(overview.pipeline.length, 5);
    assert.equal(overview.pipeline[0].stageKey, "STAGE_1_INTAKE");

    // Verify bottlenecks list includes extraction failure and unassigned application
    assert.ok(overview.bottlenecks.length >= 2);
    const exBottleneck = overview.bottlenecks.find((b: any) => b.bottleneckType === "EXTRACTION_FAILURE");
    assert.ok(exBottleneck);
    assert.equal(exBottleneck.applicationNumber, "AICTE-DEMO-04");

    const unassignedBottleneck = overview.bottlenecks.find((b: any) => b.bottleneckType === "UNASSIGNED_EXCEPTION");
    assert.ok(unassignedBottleneck);
    assert.equal(unassignedBottleneck.applicationNumber, "AICTE-DEMO-08");
  });

  it("supports 1-to-1 drill-down from summary metrics to underlying applications", async () => {
    // Drill down into 'scrutiny_deficiencies'
    const defResult = await ministryService.getPortfolioApplications({ metric: "scrutiny_deficiencies" });
    assert.equal(defResult.data.length, 1);
    assert.equal(defResult.data[0].applicationNumber, "AICTE-DEMO-02");

    // Drill down into 'unassigned'
    const unassignedResult = await ministryService.getPortfolioApplications({ metric: "unassigned" });
    assert.equal(unassignedResult.data.length, 1);
    assert.equal(unassignedResult.data[0].applicationNumber, "AICTE-DEMO-08");

    // Drill down into 'pending_confirmations'
    const pendResult = await ministryService.getPortfolioApplications({ metric: "pending_confirmations" });
    assert.equal(pendResult.data.length, 1);
    assert.equal(pendResult.data[0].applicationNumber, "AICTE-DEMO-02");
  });

  it("aggregates officer workload distribution and surfaces the unassigned allocation queue", async () => {
    const workload = await ministryService.getOfficerWorkload();

    assert.equal(workload.officers.length, 2);
    const off1 = workload.officers.find((o) => o.officer.id === "usr-off-1");
    assert.ok(off1);
    assert.equal(off1.totalAssigned, 2);
    assert.equal(off1.compliantCount, 1);
    assert.equal(off1.deficienciesCount, 1);
    assert.equal(off1.pendingConfirmationsCount, 1);

    const off2 = workload.officers.find((o) => o.officer.id === "usr-off-2");
    assert.ok(off2);
    assert.equal(off2.totalAssigned, 2);
    assert.equal(off2.manualReviewCount, 1);

    // Unassigned queue verification
    assert.equal(workload.unassignedQueue.count, 1);
    assert.equal(workload.unassignedQueue.applications[0].applicationNumber, "AICTE-DEMO-08");

    // Workload summary
    assert.equal(workload.distributionSummary.totalOfficers, 2);
    assert.equal(workload.distributionSummary.totalAssignedApplications, 4);
    assert.equal(workload.distributionSummary.avgApplicationsPerOfficer, 2);
  });

  it("aggregates cross-application issues preserving distinct regulatory categories", async () => {
    const issuesResult = await ministryService.getCrossApplicationIssues({});

    assert.ok(issuesResult.issues.length >= 3);
    assert.ok(issuesResult.categoryCounts.COMPLIANCE_DEFICIENCY >= 1);
    assert.ok(issuesResult.categoryCounts.AUTHORITY_MISMATCH >= 1);
    assert.ok(issuesResult.categoryCounts.CONFIRMATION_PENDING >= 1);

    // Filter strictly by COMPLIANCE_DEFICIENCY
    const deficiencyOnly = await ministryService.getCrossApplicationIssues({
      category: "COMPLIANCE_DEFICIENCY",
    });
    assert.equal(deficiencyOnly.issues.length, 1);
    assert.equal(deficiencyOnly.issues[0].ruleIdOrSource, "RULE_MIN_FD_AMOUNT");
    assert.equal(deficiencyOnly.issues[0].severity, "CRITICAL");
  });

  it("returns ministry operational activity distinguishing system vs user actions", async () => {
    const activityResult = await ministryService.getOperationalActivity({});

    assert.equal(activityResult.activity.length, 2);
    const sysAction = activityResult.activity.find((a) => a.actor.isSystem);
    assert.ok(sysAction);
    assert.equal(sysAction.action, "EXTRACTION_FAILED");

    const userAction = activityResult.activity.find((a) => !a.actor.isSystem);
    assert.ok(userAction);
    assert.equal(userAction.actor.role, "MINISTRY_ADMIN");
  });

  it("consolidates ministry dashboard into a single operation returning overview, workload, issues, and activity", async () => {
    const dashboard = await ministryService.getMinistryDashboard();

    assert.ok(dashboard.overview);
    assert.equal(dashboard.overview.totalApplications, 5);
    assert.equal(dashboard.overview.metrics.totalApplications, 5);
    assert.equal(dashboard.overview.metrics.pendingAuthorityConfirmations, 1);

    assert.ok(dashboard.workload);
    assert.equal(dashboard.workload.officers.length, 2);
    assert.equal(dashboard.workload.unassignedQueue.count, 1);

    assert.ok(dashboard.issues);
    assert.ok(dashboard.issues.categoryCounts);
    assert.ok(dashboard.issues.issues.length >= 3);

    assert.ok(Array.isArray(dashboard.recentActivity));
    assert.equal(dashboard.recentActivity.length, 2);

    // Controller test
    const { req, res, getStatusCode, getData } = createMockContext({
      user: {
        id: "usr-admin-1",
        role: "MINISTRY_ADMIN",
      },
    });

    await getMinistryDashboard(req, res);
    assert.equal(getStatusCode(), 200);
    assert.equal(getData().success, true);
    assert.ok(getData().data.overview);
    assert.ok(getData().data.workload);
    assert.ok(getData().data.issues);
    assert.ok(getData().data.recentActivity);
  });
});
