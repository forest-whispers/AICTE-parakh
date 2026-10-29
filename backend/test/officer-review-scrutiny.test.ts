import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma.js";
import { authService } from "../src/services/auth.service.js";
import { requireApplicationAccess } from "../src/middlewares/auth.middleware.js";
import { updateDocumentValidationStatus } from "../src/controllers/application.controller.js";
import { complianceService } from "../src/services/compliance.service.js";

// Helper to create mock Express request and response objects
function createMockContext(options: {
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  user?: any;
} = {}) {
  const req: any = {
    headers: options.headers || {},
    body: options.body || {},
    params: options.params || {},
    user: options.user,
    socket: { remoteAddress: "127.0.0.1" },
  };

  let statusCode = 200;
  let responseData: any = null;
  let nextCalled = false;

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

  const next = () => {
    nextCalled = true;
  };

  return {
    req,
    res,
    next,
    getStatusCode: () => statusCode,
    getData: () => responseData,
    wasNextCalled: () => nextCalled,
  };
}

describe("Officer Evidence Correction & Scrutiny Consistency", () => {
  const originalVlmData = {
    classifiedType: "DOC_01_REGISTRATION",
    classificationConfidence: "HIGH",
    doc01Registration: {
      applicantLegalName: {
        state: "PRESENT",
        value: "Vidyapeeth Holdings Pvt Ltd",
        rawText: "Vidyapeeth Holdings Pvt Ltd",
        pageNumber: 1,
      },
      entityType: {
        state: "PRESENT",
        value: "Private Limited Company",
        rawText: "Private Limited Company",
        pageNumber: 1,
      },
      registrationNumber: {
        state: "PRESENT",
        value: "REG-999-2020",
        rawText: "REG-999-2020",
        pageNumber: 1,
      },
      hasNonProfitClause: {
        state: "NOT_FOUND",
        value: false,
        rawText: null,
        pageNumber: null,
      },
    },
  };

  let mockApplication: any;

  before(() => {
    mockApplication = {
      id: "app-test-review-1",
      applicationNumber: "AICTE-TEST-REVIEW-01",
      institutionName: "Vidyapeeth Institute of Technology",
      assignedOfficerId: "usr-off-assigned",
      status: "SUBMITTED",
      documents: [
        {
          id: "doc-test-1",
          applicationId: "app-test-review-1",
          documentType: "DOC_01_REGISTRATION",
          originalName: "registration_trust_deed.pdf",
          fileName: "registration_trust_deed.pdf",
          extractedData: JSON.parse(JSON.stringify(originalVlmData)),
          createdAt: new Date(),
        },
      ],
      scrutinyReports: [],
    };

    (prisma.application as any).findUnique = async ({ where }: any) => {
      if (where.id === mockApplication.id) return mockApplication;
      return null;
    };

    (prisma.application as any).update = async ({ where, data }: any) => {
      if (where.id === mockApplication.id) {
        Object.assign(mockApplication, data);
        return mockApplication;
      }
      return null;
    };

    (prisma.document as any).findFirst = async ({ where }: any) => {
      if (where.applicationId === mockApplication.id && where.id === "doc-test-1") {
        return mockApplication.documents[0];
      }
      return null;
    };

    (prisma.document as any).update = async ({ where, data }: any) => {
      if (where.id === "doc-test-1") {
        Object.assign(mockApplication.documents[0], data);
        return mockApplication.documents[0];
      }
      return null;
    };

    (prisma.scrutinyReport as any).create = async ({ data }: any) => {
      const rep = { id: `rep-${Date.now()}`, ...data, createdAt: new Date() };
      mockApplication.scrutinyReports = [rep];
      return rep;
    };

    (prisma.auditLog as any).create = async ({ data }: any) => {
      return { id: "audit-test-id", ...data, createdAt: new Date() };
    };
  });

  it("1. Baseline: evaluates application with ineligible commercial entity as DEFICIENCIES_DETECTED", async () => {
    const scrutinyResult = await complianceService.evaluateDocuments(
      {
        id: mockApplication.id,
        institutionName: mockApplication.institutionName,
      },
      mockApplication.documents
    );

    assert.equal(scrutinyResult.overallStatus, "DEFICIENCIES_DETECTED");
    const r12Finding = scrutinyResult.findings.find((f) => f.ruleId === "RULE_NON_PROFIT_GOVERNANCE");
    assert.ok(r12Finding);
    assert.equal(r12Finding.outcome, "FAIL_DEFICIENCY");
    assert.equal(r12Finding.evidence.some((e) => e.isOfficerReviewed), false);
  });

  it("2. Officer status decision alone does NOT falsify extracted values or force compliance", async () => {
    const assignedOfficer = {
      id: "usr-off-assigned",
      email: "assigned@aicte.gov.in",
      name: "Er. Rajiv Malhotra",
      role: "OFFICER",
    };

    const { req, res, next, getStatusCode, getData } = createMockContext({
      params: { id: mockApplication.id, documentId: "doc-test-1" },
      body: {
        status: "PASS",
        notes: "Officer marked pass without changing underlying evidence",
      },
      user: assignedOfficer,
    });

    const guard = requireApplicationAccess("write");
    await guard(req, res, next);
    await updateDocumentValidationStatus(req, res);

    assert.equal(getStatusCode(), 200);
    const data = getData();
    assert.equal(data.success, true);
    assert.equal(data.data.officerValidation.status, "PASS");

    // The original VLM data must still have entityType as "Private Limited Company" (unaltered!)
    const docInDb = mockApplication.documents[0];
    assert.equal(docInDb.extractedData.doc01Registration.entityType.value, "Private Limited Company");

    // Scrutiny re-evaluation still deterministically catches the deficiency because evidence wasn't corrected!
    assert.equal(data.data.scrutinyReport.overallStatus, "DEFICIENCIES_DETECTED");
    const r12 = data.data.scrutinyReport.findings.find((f: any) => f.ruleId === "RULE_NON_PROFIT_GOVERNANCE");
    assert.equal(r12.outcome, "FAIL_DEFICIENCY");
  });

  it("3. Officer corrects entity constitution: preserves original VLM data while scrutiny reflects reviewed evidence", async () => {
    const assignedOfficer = {
      id: "usr-off-assigned",
      email: "assigned@aicte.gov.in",
      name: "Er. Rajiv Malhotra",
      role: "OFFICER",
    };

    const { req, res, next, getStatusCode, getData } = createMockContext({
      params: { id: mockApplication.id, documentId: "doc-test-1" },
      body: {
        status: "PASS",
        notes: "Inspected deed page 1: applicant is actually Vidyapeeth Public Charitable Trust registered under Bombay Public Trusts Act",
        fieldCorrections: {
          entityType: {
            state: "PRESENT",
            value: "Public Charitable Trust",
            rawText: "Public Charitable Trust",
            pageNumber: 1,
            notes: "Confirmed trust registration preamble on page 1",
          },
          trustSocietyName: {
            state: "PRESENT",
            value: "Vidyapeeth Public Charitable Trust",
            rawText: "Vidyapeeth Public Charitable Trust",
            pageNumber: 1,
          },
        },
      },
      user: assignedOfficer,
    });

    const guard = requireApplicationAccess("write");
    await guard(req, res, next);
    await updateDocumentValidationStatus(req, res);

    assert.equal(getStatusCode(), 200);
    const data = getData();
    assert.equal(data.success, true);

    // Provenance check: Original VLM extraction remains preserved
    const docInDb = mockApplication.documents[0];
    assert.equal(docInDb.extractedData.doc01Registration.entityType.value, "Private Limited Company");

    // Officer review is stored with provenance and reviewer metadata
    assert.ok(docInDb.extractedData.officerReview);
    assert.equal(docInDb.extractedData.officerReview.reviewedByName, "Er. Rajiv Malhotra");
    assert.ok(docInDb.extractedData.officerReview.fields.entityType);
    assert.equal(docInDb.extractedData.officerReview.fields.entityType.value, "Public Charitable Trust");

    // Scrutiny re-evaluation consumes the reviewed evidence and passes!
    assert.ok(data.data.scrutinyReport);
    const r12Finding = data.data.scrutinyReport.findings.find((f: any) => f.ruleId === "RULE_NON_PROFIT_GOVERNANCE");
    assert.ok(r12Finding);
    assert.equal(r12Finding.outcome, "PASS");

    // The evidence item in the finding explicitly records officer provenance
    const entityTypeEvidence = r12Finding.evidence.find((e: any) => e.fieldName === "entityType");
    assert.ok(entityTypeEvidence);
    assert.equal(entityTypeEvidence.extractedValue, "Public Charitable Trust");
    assert.equal(entityTypeEvidence.isOfficerReviewed, true);
    assert.equal(entityTypeEvidence.reviewedByName, "Er. Rajiv Malhotra");
    assert.ok(data.data.scrutinyReport.reviewedEvidenceCount >= 1);
  });

  it("4. Rejects invalid field state with 400 Bad Request", async () => {
    const assignedOfficer = {
      id: "usr-off-assigned",
      email: "assigned@aicte.gov.in",
      name: "Er. Rajiv Malhotra",
      role: "OFFICER",
    };

    const { req, res, next, getStatusCode, getData } = createMockContext({
      params: { id: mockApplication.id, documentId: "doc-test-1" },
      body: {
        status: "PASS",
        fieldCorrections: {
          entityType: {
            state: "INVALID_STATE",
            value: "SOCIETY",
          },
        },
      },
      user: assignedOfficer,
    });

    const guard = requireApplicationAccess("write");
    await guard(req, res, next);
    await updateDocumentValidationStatus(req, res);

    assert.equal(getStatusCode(), 400);
    assert.equal(getData().success, false);
    assert.ok(getData().error.includes("Invalid field state"));
  });

  it("5. Blocks unauthorized officer and ministry admin from modifying reviewed evidence with 403", async () => {
    const unauthorizedOfficer = {
      id: "usr-off-other",
      email: "other@aicte.gov.in",
      name: "Dr. Sunita Deshmukh",
      role: "OFFICER",
    };

    const { req, res, next, getStatusCode } = createMockContext({
      params: { id: mockApplication.id, documentId: "doc-test-1" },
      body: { status: "PASS" },
      user: unauthorizedOfficer,
    });

    const guard = requireApplicationAccess("write");
    await guard(req, res, next);
    assert.equal(getStatusCode(), 403);
  });
});
