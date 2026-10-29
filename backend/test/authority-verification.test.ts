import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma.js";
import {
  runAuthorityVerification,
  getAuthorityVerifications,
  recordBankConfirmation,
  getVerificationHistory,
} from "../src/controllers/authority-verification.controller.js";
import { requireApplicationAccess } from "../src/middlewares/auth.middleware.js";

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

describe("Authority Verification Workflow — Integration & Security Tests", () => {
  let officer1User: any;
  let officer2User: any;
  let ministryUser: any;
  let testApplication: any;
  let doc01: any;
  let doc10: any;

  before(async () => {
    // 1. Ensure test users exist
    officer1User = await prisma.user.upsert({
      where: { email: "auth_officer1@parakh.gov.in" },
      update: {},
      create: {
        email: "auth_officer1@parakh.gov.in",
        name: "Officer One Verification",
        role: "OFFICER",
        designation: "Scrutiny Officer",
        passwordHash: "dummy_scrypt_hash",
        salt: "dummy_salt",
      },
    });

    officer2User = await prisma.user.upsert({
      where: { email: "auth_officer2@parakh.gov.in" },
      update: {},
      create: {
        email: "auth_officer2@parakh.gov.in",
        name: "Officer Two Unauthorized",
        role: "OFFICER",
        designation: "Scrutiny Officer",
        passwordHash: "dummy_scrypt_hash",
        salt: "dummy_salt",
      },
    });

    ministryUser = await prisma.user.upsert({
      where: { email: "auth_ministry@parakh.gov.in" },
      update: {},
      create: {
        email: "auth_ministry@parakh.gov.in",
        name: "Ministry Admin Oversight",
        role: "MINISTRY_ADMIN",
        designation: "Director",
        passwordHash: "dummy_scrypt_hash",
        salt: "dummy_salt",
      },
    });

    // 2. Create test application assigned to officer1
    testApplication = await prisma.application.create({
      data: {
        applicationNumber: `AUTH-TEST-${Date.now()}`,
        institutionName: "National Institute of Advanced Verification",
        status: "SUBMITTED",
        assignedOfficerId: officer1User.id,
      },
    });

    // 3. Create initial documents: DOC_01 with simulated mismatch, DOC_10 with FDR
    doc01 = await prisma.document.create({
      data: {
        applicationId: testApplication.id,
        documentType: "DOC_01_REGISTRATION",
        fileName: "DOC_01_Society.pdf",
        originalName: "DOC_01_Society.pdf",
        filePath: "/mock/doc01.pdf",
        mimeType: "application/pdf",
        fileSize: 1024,
        extractionStatus: "SUCCESS",
        extractedData: {
          doc01Registration: {
            registrationNumber: { value: "TYPO-REG-0000" }, // Typo in registration number
            applicantLegalName: { value: "Pragati Shikshan Samiti" },
            entityType: { value: "Society under M.P. Societies Registration Act" },
          },
        },
      },
    });

    doc10 = await prisma.document.create({
      data: {
        applicationId: testApplication.id,
        documentType: "DOC_10_BANK_FUNDS",
        fileName: "DOC_10_Bank.pdf",
        originalName: "DOC_10_Bank.pdf",
        filePath: "/mock/doc10.pdf",
        mimeType: "application/pdf",
        fileSize: 1024,
        extractionStatus: "SUCCESS",
        extractedData: {
          doc10BankFunds: {
            accountOrFdrNumber: { value: "FDR-UNKNOWN-999" },
            bankName: { value: "State Bank of India" },
            branchName: { value: "Bhopal Main" },
            accountHolderName: { value: "Maharishi Shiksha Sansthan" },
            amountInLakhsINR: { value: 100 },
            isUnencumbered: { value: true },
          },
        },
      },
    });
  });

  it("1. Assigned Officer can execute verification; unassigned Officer cannot (403)", async () => {
    // Unassigned officer attempt through middleware
    const unassignedCtx = createMockContext({
      params: { id: testApplication.id },
      user: officer2User,
    });
    const writeGuard = requireApplicationAccess("write");
    await writeGuard(unassignedCtx.req, unassignedCtx.res, unassignedCtx.next);

    assert.equal(unassignedCtx.getStatusCode(), 403);
    assert.match(unassignedCtx.getData().error, /not assigned to this application/i);

    // Direct controller guard defense
    const directUnassignedCtx = createMockContext({
      params: { id: testApplication.id },
      user: officer2User,
    });
    await runAuthorityVerification(directUnassignedCtx.req, directUnassignedCtx.res);
    assert.equal(directUnassignedCtx.getStatusCode(), 403);

    // Assigned officer execution
    const assignedCtx = createMockContext({
      params: { id: testApplication.id },
      user: officer1User,
    });
    await runAuthorityVerification(assignedCtx.req, assignedCtx.res);
    assert.equal(assignedCtx.getStatusCode(), 200);
    assert.equal(assignedCtx.getData().success, true);
    assert.ok(assignedCtx.getData().data.batchId);
    assert.ok(assignedCtx.getData().data.totalRun >= 2);
  });

  it("2. Ministry Admin can view results but cannot execute verification or record confirmation (403)", async () => {
    // Ministry Admin attempt to execute verification
    const execCtx = createMockContext({
      params: { id: testApplication.id },
      user: ministryUser,
    });
    await runAuthorityVerification(execCtx.req, execCtx.res);
    assert.equal(execCtx.getStatusCode(), 403);
    assert.match(execCtx.getData().error, /operational oversight only/i);

    // Ministry Admin attempt to record bank confirmation
    const confCtx = createMockContext({
      params: { id: testApplication.id },
      user: ministryUser,
      body: {
        letterReference: "SBI/BPL/2026/CONF-01",
        recordingOfficer: "Admin",
        confirmedAmountLakhs: 100,
      },
    });
    await recordBankConfirmation(confCtx.req, confCtx.res);
    assert.equal(confCtx.getStatusCode(), 403);

    // Ministry Admin CAN view verifications
    const viewCtx = createMockContext({
      params: { id: testApplication.id },
      user: ministryUser,
    });
    await getAuthorityVerifications(viewCtx.req, viewCtx.res);
    assert.equal(viewCtx.getStatusCode(), 200);
    assert.equal(viewCtx.getData().success, true);
    assert.ok(viewCtx.getData().data.verifications.length > 0);
  });

  it("3. Verification uses officer-reviewed values where available and original extracted values for untouched fields", async () => {
    // Before review: DOC_01 had 'TYPO-REG-0000', which results in RECORD_NOT_FOUND
    const firstCheck = await prisma.authorityVerification.findFirst({
      where: { applicationId: testApplication.id, authorityCategory: "SOCIETY_REGISTRAR" },
      orderBy: { createdAt: "desc" },
    });
    assert.equal(firstCheck?.status, "RECORD_NOT_FOUND");

    // Officer reviews DOC_01 and corrects registration number to valid registry entry: 'REG/BPL/2018/01992'
    const nowIso = new Date().toISOString();
    await prisma.document.update({
      where: { id: doc01.id },
      data: {
        extractedData: {
          ...((doc01.extractedData as any) || {}),
          officerReview: {
            reviewedAt: nowIso,
            reviewedById: officer1User.id,
            reviewedByName: officer1User.name,
            fields: {
              registrationNumber: {
                state: "PRESENT",
                value: "REG/BPL/2018/01992",
                rawText: "REG/BPL/2018/01992",
                notes: "Corrected OCR typo to valid registration number",
              },
            },
          },
        },
      },
    });

    // Re-run verification as assigned officer
    const reVerifyCtx = createMockContext({
      params: { id: testApplication.id },
      user: officer1User,
    });
    await runAuthorityVerification(reVerifyCtx.req, reVerifyCtx.res);
    assert.equal(reVerifyCtx.getStatusCode(), 200);

    // Verify latest record for SOCIETY_REGISTRAR is now VERIFIED_SIMULATED
    const latestReg = await prisma.authorityVerification.findFirst({
      where: { applicationId: testApplication.id, authorityCategory: "SOCIETY_REGISTRAR" },
      orderBy: { createdAt: "desc" },
    });

    assert.equal(latestReg?.status, "VERIFIED_SIMULATED");
    assert.equal(latestReg?.queryReference, "REG/BPL/2018/01992");
    // Submitted fields must have the corrected value and untouched fields intact
    assert.equal((latestReg?.submittedFields as any).registrationNumber, "REG/BPL/2018/01992");
    assert.equal((latestReg?.submittedFields as any).applicantLegalName, "Pragati Shikshan Samiti");
    // Provenance must record original vs reviewed
    assert.equal((latestReg?.submittedFields as any)._provenance?.registrationNumber?.originalExtracted, "TYPO-REG-0000");
    assert.equal((latestReg?.submittedFields as any)._provenance?.registrationNumber?.isOfficerReviewed, true);
  });

  it("4. Repeated runs preserve prior verification records and create the expected history", async () => {
    const historyCtx = createMockContext({
      params: { id: testApplication.id },
      user: officer1User,
    });
    await getVerificationHistory(historyCtx.req, historyCtx.res);
    assert.equal(historyCtx.getStatusCode(), 200);

    const history = historyCtx.getData().data;
    assert.ok(Array.isArray(history));
    // We ran at least two batches (initial run + re-run)
    assert.ok(history.length >= 2);

    // Verify all historical records are preserved in database
    const allRecords = await prisma.authorityVerification.findMany({
      where: { applicationId: testApplication.id },
    });
    assert.ok(allRecords.length >= 4);

    // Fetch specific historical batch via query param
    const olderBatchId = history[history.length - 1].batchId;
    const batchCtx = createMockContext({
      params: { id: testApplication.id },
      query: { batchId: olderBatchId },
      user: officer1User,
    });
    await getAuthorityVerifications(batchCtx.req, batchCtx.res);
    assert.equal(batchCtx.getStatusCode(), 200);
    assert.equal(batchCtx.getData().data.batchId, olderBatchId);
  });

  it("5. Manual bank confirmation is validated, authorized, audited, and persisted without modifying document extraction or scrutiny reports", async () => {
    // 1. Validation failure: missing required fields
    const invalidCtx = createMockContext({
      params: { id: testApplication.id },
      user: officer1User,
      body: {
        letterReference: "", // empty
      },
    });
    await recordBankConfirmation(invalidCtx.req, invalidCtx.res);
    assert.equal(invalidCtx.getStatusCode(), 400);

    // 2. Successful recording by assigned officer
    const recordCtx = createMockContext({
      params: { id: testApplication.id },
      user: officer1User,
      body: {
        letterReference: "SBI/BPL/2026/LTR-8891",
        letterDate: "2026-10-25",
        recordingOfficer: officer1User.name,
        branchManagerName: "R. K. Sharma, Chief Manager",
        confirmedAmountLakhs: 100,
        isUnencumbered: true,
        remarks: "Official branch letter hand-verified with stamp and signature",
        documentId: doc10.id,
      },
    });
    await recordBankConfirmation(recordCtx.req, recordCtx.res);
    assert.equal(recordCtx.getStatusCode(), 201);
    assert.equal(recordCtx.getData().success, true);

    const confirmationRecord = recordCtx.getData().data;
    assert.equal(confirmationRecord.status, "CONFIRMATION_RECORDED");
    assert.equal(confirmationRecord.verificationMode, "MANUAL_CONFIRMATION_ROUTED");

    // 3. Confirm document extraction was NOT mutated
    const docAfter = await prisma.document.findUnique({ where: { id: doc10.id } });
    assert.equal(
      ((docAfter?.extractedData as any)?.doc10BankFunds?.accountOrFdrNumber as any)?.value,
      "FDR-UNKNOWN-999"
    );

    // 4. Confirm audit log was created
    const audit = await prisma.auditLog.findFirst({
      where: {
        applicationId: testApplication.id,
        action: "BANK_CONFIRMATION_RECORDED",
      },
    });
    assert.ok(audit);
    assert.equal(audit?.actorId, officer1User.id);
  });

  it("6. Missing application returns 404 for all endpoints", async () => {
    const missingId = "non_existent_app_999999";

    const verifyCtx = createMockContext({
      params: { id: missingId },
      user: officer1User,
    });
    await runAuthorityVerification(verifyCtx.req, verifyCtx.res);
    assert.equal(verifyCtx.getStatusCode(), 404);

    const getCtx = createMockContext({
      params: { id: missingId },
      user: officer1User,
    });
    await getAuthorityVerifications(getCtx.req, getCtx.res);
    assert.equal(getCtx.getStatusCode(), 404);

    const historyCtx = createMockContext({
      params: { id: missingId },
      user: officer1User,
    });
    await getVerificationHistory(historyCtx.req, historyCtx.res);
    assert.equal(historyCtx.getStatusCode(), 404);
  });
});
