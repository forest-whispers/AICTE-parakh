import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { reportListingService } from "../src/services/report-listing.service.js";
import { getReportById, downloadReportPdf } from "../src/controllers/report.controller.js";
import { prisma } from "../src/lib/prisma.js";
import type { AuthenticatedUser } from "../src/services/auth.service.js";
import { Writable } from "node:stream";

describe("Scrutiny Reports Register, Detail & PDF Export Tests", () => {
  const officer1: AuthenticatedUser = {
    id: "officer-uuid-1",
    name: "Dr. Ananya Rao",
    email: "ananya.rao@aicte.gov.in",
    role: "OFFICER",
    designation: "Senior Scrutiny Officer",
  };

  const officer2: AuthenticatedUser = {
    id: "officer-uuid-2",
    name: "Dr. Rajesh Verma",
    email: "rajesh.verma@aicte.gov.in",
    role: "OFFICER",
    designation: "Scrutiny Officer",
  };

  const ministryAdmin: AuthenticatedUser = {
    id: "admin-uuid-1",
    name: "Ministry Director",
    email: "director@ministry.gov.in",
    role: "MINISTRY_ADMIN",
    designation: "Director of Technical Education",
  };

  // Mock dataset:
  // App 1 (Assigned to Officer 1): Has 2 reports (historical rep-1-old, latest rep-1-new)
  // App 2 (Assigned to Officer 2): Has 1 report (rep-2)
  // App 3 (Assigned to Officer 1): Has NO reports (unassessed)
  const mockReports = [
    {
      id: "rep-1-new",
      applicationId: "app-1",
      evaluationDate: new Date("2026-10-28T14:00:00Z"),
      overallStatus: "DEFICIENCIES_DETECTED",
      totalRulesRun: 15,
      passedCount: 13,
      deficiencyCount: 2,
      reviewCount: 0,
      missingCount: 0,
      createdAt: new Date("2026-10-28T14:00:00Z"),
      findings: [
        {
          ruleId: "DOC01_TRUST_VALIDITY",
          ruleName: "Trust Legal Status & Validity",
          aphClause: "APH 2024-27 Clause 2.1.1",
          outcome: "FAIL_DEFICIENCY",
          severity: "CRITICAL",
          summary: "Trust registration has expired",
          details: "Validity date 2024-01-01 is prior to evaluation date",
          remediationNote: "Upload renewed registration certificate",
          evidence: [
            {
              documentId: "doc-1",
              documentType: "TRUST_DEED",
              fieldName: "validityDate",
              extractedValue: "2024-01-01",
              pageNumber: 1,
              excerpt: "Valid up to 01-Jan-2024",
              isOfficerReviewed: false,
            },
          ],
        },
      ],
      application: {
        id: "app-1",
        applicationNumber: "AICTE-2026-0001",
        institutionName: "Aryabhata Engineering College",
        programCategory: "ENGINEERING_AND_TECHNOLOGY",
        proposedIntake: 300,
        status: "DEFICIENCIES_DETECTED",
        assignedOfficerId: "officer-uuid-1",
        assignedOfficer: {
          id: "officer-uuid-1",
          name: "Dr. Ananya Rao",
          email: "ananya.rao@aicte.gov.in",
          designation: "Senior Scrutiny Officer",
        },
        documents: [],
      },
    },
    {
      id: "rep-1-old",
      applicationId: "app-1",
      evaluationDate: new Date("2026-10-20T10:00:00Z"),
      overallStatus: "COMPLIANT",
      totalRulesRun: 15,
      passedCount: 15,
      deficiencyCount: 0,
      reviewCount: 0,
      missingCount: 0,
      createdAt: new Date("2026-10-20T10:00:00Z"),
      findings: [
        {
          ruleId: "DOC01_TRUST_VALIDITY",
          ruleName: "Trust Legal Status & Validity",
          aphClause: "APH 2024-27 Clause 2.1.1",
          outcome: "PASS",
          severity: "CRITICAL",
          summary: "Trust registration compliant",
          details: "Verified against valid certificate",
          evidence: [],
        },
      ],
      application: {
        id: "app-1",
        applicationNumber: "AICTE-2026-0001",
        institutionName: "Aryabhata Engineering College",
        programCategory: "ENGINEERING_AND_TECHNOLOGY",
        proposedIntake: 300,
        status: "PROCESSING_SCRUTINY",
        assignedOfficerId: "officer-uuid-1",
        assignedOfficer: {
          id: "officer-uuid-1",
          name: "Dr. Ananya Rao",
          email: "ananya.rao@aicte.gov.in",
          designation: "Senior Scrutiny Officer",
        },
        documents: [],
      },
    },
    {
      id: "rep-2",
      applicationId: "app-2",
      evaluationDate: new Date("2026-10-25T12:00:00Z"),
      overallStatus: "MANUAL_REVIEW_REQUIRED",
      totalRulesRun: 12,
      passedCount: 10,
      deficiencyCount: 0,
      reviewCount: 2,
      missingCount: 0,
      createdAt: new Date("2026-10-25T12:00:00Z"),
      findings: [
        {
          ruleId: "DOC03_LAND_TITLE",
          ruleName: "Clear Land Title & Encumbrance",
          aphClause: "APH 2024-27 Clause 2.3",
          outcome: "MANUAL_REVIEW_REQUIRED",
          severity: "HIGH",
          summary: "Encumbrance certificate requires manual inspection",
          details: "Stamp blurred",
          evidence: [],
        },
      ],
      application: {
        id: "app-2",
        applicationNumber: "AICTE-2026-0002",
        institutionName: "Bhaskaracharya Institute of Technology",
        programCategory: "MANAGEMENT",
        proposedIntake: 120,
        status: "UNDER_SCRUTINY",
        assignedOfficerId: "officer-uuid-2",
        assignedOfficer: {
          id: "officer-uuid-2",
          name: "Dr. Rajesh Verma",
          email: "rajesh.verma@aicte.gov.in",
          designation: "Scrutiny Officer",
        },
        documents: [],
      },
    },
  ];

  beforeEach(() => {
    // Mock prisma.scrutinyReport
    (prisma.scrutinyReport.count as any) = async ({ where }: any) => {
      let filtered = mockReports;
      if (where?.application?.assignedOfficerId) {
        filtered = filtered.filter(
          (r) => r.application.assignedOfficerId === where.application.assignedOfficerId
        );
      }
      if (where?.overallStatus) {
        filtered = filtered.filter((r) => r.overallStatus === where.overallStatus);
      }
      if (where?.application?.programCategory) {
        filtered = filtered.filter(
          (r) => r.application.programCategory === where.application.programCategory
        );
      }
      if (where?.application?.OR) {
        const query = where.application.OR[0]?.applicationNumber?.contains?.toLowerCase() || "";
        filtered = filtered.filter(
          (r) =>
            r.application.applicationNumber.toLowerCase().includes(query) ||
            r.application.institutionName.toLowerCase().includes(query)
        );
      }
      return filtered.length;
    };

    (prisma.scrutinyReport.findMany as any) = async ({ where, skip = 0, take = 10 }: any) => {
      let filtered = mockReports;
      if (where?.application?.assignedOfficerId) {
        filtered = filtered.filter(
          (r) => r.application.assignedOfficerId === where.application.assignedOfficerId
        );
      }
      if (where?.overallStatus) {
        filtered = filtered.filter((r) => r.overallStatus === where.overallStatus);
      }
      if (where?.application?.programCategory) {
        filtered = filtered.filter(
          (r) => r.application.programCategory === where.application.programCategory
        );
      }
      if (where?.application?.OR) {
        const query = where.application.OR[0]?.applicationNumber?.contains?.toLowerCase() || "";
        filtered = filtered.filter(
          (r) =>
            r.application.applicationNumber.toLowerCase().includes(query) ||
            r.application.institutionName.toLowerCase().includes(query)
        );
      }
      return filtered.slice(skip, skip + take);
    };

    (prisma.scrutinyReport.findUnique as any) = async ({ where }: any) => {
      return mockReports.find((r) => r.id === where.id) || null;
    };
  });

  // Test 1: Role Scoping Isolation
  it("1. Officer Scope Isolation: Officer receives strictly reports for their assigned applications", async () => {
    const res = await reportListingService.listReports(officer1, {
      officerId: "officer-uuid-2", // Attempting client override
    });

    assert.strictEqual(res.pagination.total, 2);
    assert.strictEqual(res.data.length, 2);
    res.data.forEach((r) => {
      assert.strictEqual(r.application.assignedOfficerId, "officer-uuid-1");
    });
  });

  // Test 2: Ministry Scope & Filters
  it("2. Ministry Admin Scope: Accesses all reports across all officers and can filter by officer", async () => {
    const allRes = await reportListingService.listReports(ministryAdmin);
    assert.strictEqual(allRes.pagination.total, 3);
    assert.strictEqual(allRes.data.length, 3);

    const filteredRes = await reportListingService.listReports(ministryAdmin, {
      officerId: "officer-uuid-2",
    });
    assert.strictEqual(filteredRes.pagination.total, 1);
    assert.strictEqual(filteredRes.data[0].id, "rep-2");
  });

  // Test 3: Historical Reports Included
  it("3. Historical Reports: Both older and newer reports for the same application appear as distinct records", async () => {
    const res = await reportListingService.listReports(officer1);
    const reportIds = res.data.map((r) => r.id);
    assert.ok(reportIds.includes("rep-1-new"), "Latest report should be listed");
    assert.ok(reportIds.includes("rep-1-old"), "Historical report should be listed");
  });

  // Test 4: Exact-ID Report Retrieval & Invariance
  it("4. Exact-ID Detail Retrieval: Returns exact requested report without substituting latest report", async () => {
    let statusCode = 0;
    let jsonResult: any = null;

    const req: any = {
      user: officer1,
      params: { id: "rep-1-old" }, // Requesting older report
    };
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        jsonResult = data;
        return this;
      },
    };

    await getReportById(req, res);

    assert.strictEqual(statusCode, 200);
    assert.strictEqual(jsonResult.success, true);
    assert.strictEqual(jsonResult.data.id, "rep-1-old");
    assert.strictEqual(jsonResult.data.overallStatus, "COMPLIANT");
    assert.strictEqual(jsonResult.data.findings[0].outcome, "PASS");
  });

  // Test 5: Exact-ID Authorization Protection
  it("5. Exact-ID Authorization: Officer 1 cannot access Officer 2's report (403 Forbidden)", async () => {
    let statusCode = 0;
    let jsonResult: any = null;

    const req: any = {
      user: officer1,
      params: { id: "rep-2" }, // Report belonging to Officer 2's assigned app
    };
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        jsonResult = data;
        return this;
      },
    };

    await getReportById(req, res);

    assert.strictEqual(statusCode, 403);
    assert.strictEqual(jsonResult.success, false);
    assert.ok(jsonResult.error.includes("Access denied"));
  });

  // Test 6: Non-Existent Report Returns 404
  it("6. Missing Report Handling: Returns 404 Not Found for non-existent report ID", async () => {
    let statusCode = 0;
    let jsonResult: any = null;

    const req: any = {
      user: officer1,
      params: { id: "rep-nonexistent" },
    };
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        jsonResult = data;
        return this;
      },
    };

    await getReportById(req, res);

    assert.strictEqual(statusCode, 404);
    assert.strictEqual(jsonResult.success, false);
  });

  // Test 7: PDF Export Generation & Binary Validity
  it("7. PDF Export: Streams valid multi-page PDF starting with %PDF- and sets proper attachment headers", async () => {
    const chunks: Buffer[] = [];
    const mockWritable = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        callback();
      },
    });

    const headers: Record<string, string> = {};
    const res: any = Object.assign(mockWritable, {
      setHeader(name: string, val: string) {
        headers[name.toLowerCase()] = val;
      },
      status(code: number) {
        assert.strictEqual(code, 200);
        return this;
      },
      headersSent: false,
    });

    const req: any = {
      user: officer1,
      params: { id: "rep-1-new" },
    };

    await downloadReportPdf(req, res);

    // Wait for the PDF stream to finish
    await new Promise((resolve) => mockWritable.on("finish", resolve));

    assert.strictEqual(headers["content-type"], "application/pdf");
    assert.ok(headers["content-disposition"]?.includes("attachment"));
    assert.ok(headers["content-disposition"]?.includes("PARAKH-Scrutiny-Report-AICTE-2026-0001"));

    const fullPdf = Buffer.concat(chunks);
    assert.ok(fullPdf.length > 500, "PDF should have substantial binary content");
    assert.strictEqual(
      fullPdf.subarray(0, 5).toString("utf-8"),
      "%PDF-",
      "Streamed output must begin with standard PDF signature %PDF-"
    );
  });

  // Test 8: Read-Only Invariance Check
  it("8. Read-Only Invariance: Downloading a report does NOT perform database updates or re-runs", async () => {
    let updateCalled = false;
    (prisma.scrutinyReport.update as any) = async () => {
      updateCalled = true;
    };
    (prisma.application.update as any) = async () => {
      updateCalled = true;
    };

    const mockWritable = new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      },
    });
    const res: any = Object.assign(mockWritable, {
      setHeader() {},
      status() { return this; },
      headersSent: false,
    });

    const req: any = {
      user: officer1,
      params: { id: "rep-1-old" },
    };

    await downloadReportPdf(req, res);
    await new Promise((resolve) => mockWritable.on("finish", resolve));

    assert.strictEqual(updateCalled, false, "Database mutation must NOT occur during report download");
  });

  // Test 9: No Blank Pages or Overflow Duplication
  it("9. Page Budget & Compactness: Multi-finding report does not spawn runaway blank pages", async () => {
    const multiFindings = Array.from({ length: 15 }).map((_, i) => ({
      ruleId: `RULE_${i + 1}`,
      ruleName: `Regulatory Compliance Rule ${i + 1}`,
      aphClause: `APH 2026-27 Clause 2.${i + 1}`,
      outcome: i % 2 === 0 ? "PASS" : "FAIL_DEFICIENCY",
      severity: "HIGH",
      summary: `Finding observation for standard ${i + 1}`,
      evidence: [
        {
          documentType: "LAND_DOC",
          fieldName: "landArea",
          extractedValue: "5.5 Acres",
          pageNumber: 1,
          isOfficerReviewed: true,
          reviewedByName: "Dr. Ananya Rao",
        },
      ],
    }));

    const mockMultiReport = {
      ...mockReports[0],
      id: "rep-multi-15",
      findings: multiFindings,
    };

    (prisma.scrutinyReport.findUnique as any) = async () => mockMultiReport;

    const chunks: Buffer[] = [];
    const mockWritable = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        callback();
      },
    });

    const res: any = Object.assign(mockWritable, {
      setHeader() {},
      status() { return this; },
      headersSent: false,
    });

    const req: any = {
      user: officer1,
      params: { id: "rep-multi-15" },
    };

    await downloadReportPdf(req, res);
    await new Promise((resolve) => mockWritable.on("finish", resolve));

    const fullPdf = Buffer.concat(chunks).toString("latin1");
    const pageMatches = fullPdf.match(/\/Type\s*\/Page\b/g);
    const pageCount = pageMatches ? pageMatches.length : 0;

    // 15 findings should fit in 2 to 4 pages, never exploding into 15+ pages
    assert.ok(pageCount >= 2 && pageCount <= 4, `Expected 2 to 4 pages for 15 findings, got ${pageCount}`);
  });
});

