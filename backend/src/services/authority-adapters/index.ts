import crypto from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { verifySocietyRegistrar } from "./society-registrar.adapter.js";
import { verifyLandRevenueRecord } from "./revenue-records.adapter.js";
import { verifyFireServices } from "./fire-services.adapter.js";
import { verifyArchitectCouncil } from "./architect-council.adapter.js";
import {
  verifyBankConfirmation,
  type OfficerBankConfirmationPayload,
} from "./bank-confirmation.adapter.js";
import type {
  AdapterVerificationResult,
  AuthorityCategory,
  VerificationMode,
  VerificationStatus,
} from "./types.js";

export * from "./types.js";
export * from "./society-registrar.adapter.js";
export * from "./revenue-records.adapter.js";
export * from "./fire-services.adapter.js";
export * from "./architect-council.adapter.js";
export * from "./bank-confirmation.adapter.js";

export interface VerificationBatchSummary {
  batchId: string;
  applicationId: string;
  verifiedAt: string;
  totalRun: number;
  verifiedSimulatedCount: number;
  mismatchCount: number;
  formatOnlyCount: number;
  expiredCount: number;
  notFoundCount: number;
  pendingCount: number;
  recordedCount: number;
  verifications: any[];
}

function findDocumentByType(docs: any[], ...typeAliases: string[]): any | undefined {
  return docs.find((d) => {
    if (!d || !d.documentType) return false;
    const dt = String(d.documentType).toUpperCase();
    return typeAliases.some((alias) => {
      const target = alias.toUpperCase();
      return dt === target || dt.replace(/_/g, "") === target.replace(/_/g, "");
    });
  });
}

export class AuthorityVerificationService {
  /**
   * Run on-demand authority verification for an application across all supported document types.
   * Completely independent of deterministic scrutiny and does not rerun extraction.
   */
  async verifyApplication(
    applicationId: string,
    options?: {
      officerBankConfirmation?: OfficerBankConfirmationPayload;
    }
  ): Promise<VerificationBatchSummary> {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { documents: true },
    });

    if (!application) {
      throw new Error(`Application ${applicationId} not found.`);
    }

    const batchId = `batch_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const results: AdapterVerificationResult[] = [];

    // Map documents by type with robust aliases
    const docs = application.documents;

    // 1. Sponsoring Body Registration (DOC_01)
    const doc01 = findDocumentByType(docs, "DOC_01_REGISTRATION", "DOC01_REGISTRATION", "DOC_01");
    if (doc01) {
      results.push(verifySocietyRegistrar(doc01));
    }

    // 2. Land Deed (DOC_03)
    const doc03 = findDocumentByType(docs, "DOC_03_LAND_DEED", "DOC03_LAND_DEED", "DOC_03");
    if (doc03) {
      results.push(verifyLandRevenueRecord(doc03));
    }

    // 3. Land Use Conversion Order (DOC_05)
    const doc05 = findDocumentByType(docs, "DOC_05_LAND_USE", "DOC05_LAND_USE", "DOC_05");
    if (doc05) {
      results.push(verifyLandRevenueRecord(doc05));
    }

    // 4. Approved Building Plan (DOC_06) - CoA Architect Verification
    const doc06 = findDocumentByType(docs, "DOC_06_BUILDING_PLAN", "DOC06_BUILDING_PLAN", "DOC_06");
    if (doc06) {
      results.push(verifyArchitectCouncil(doc06));
    }

    // 5. Fire Safety NOC (DOC_09)
    const doc09 = findDocumentByType(docs, "DOC_09_FIRE_SAFETY", "DOC09_FIRE_SAFETY", "DOC_09");
    if (doc09) {
      results.push(verifyFireServices(doc09));
    }

    // 6. Bank / FDR Funds (DOC_10)
    const doc10 = findDocumentByType(docs, "DOC_10_BANK_FUNDS", "DOC10_BANK_FUNDS", "DOC_10");
    if (doc10) {
      results.push(verifyBankConfirmation(doc10, options?.officerBankConfirmation));
    }

    // Persist all results into Prisma AuthorityVerification table
    const createdRecords = await Promise.all(
      results.map((res) =>
        prisma.authorityVerification.create({
          data: {
            applicationId,
            documentId: res.documentId,
            batchId,
            authorityCategory: res.authorityCategory,
            authorityName: res.authorityName,
            verificationMode: res.verificationMode,
            sourceName: res.sourceName,
            queryReference: res.queryReference,
            status: res.status,
            submittedFields: res.submittedFields,
            authoritativeFields: (res.authoritativeFields as any) ?? undefined,
            discrepancies: (res.discrepancies as any) ?? undefined,
            summary: res.summary,
            scrutinyActionPrompt: res.scrutinyActionPrompt,
            verifiedAt: new Date(),
          },
        })
      )
    );

    return this.buildSummary(applicationId, batchId, createdRecords);
  }

  /**
   * Fetch the latest verification run or a specific historical batch for an application.
   */
  async getLatestVerifications(
    applicationId: string,
    requestedBatchId?: string
  ): Promise<VerificationBatchSummary | null> {
    const targetRecord = requestedBatchId
      ? await prisma.authorityVerification.findFirst({
          where: { applicationId, batchId: requestedBatchId },
          orderBy: { createdAt: "desc" },
        })
      : await prisma.authorityVerification.findFirst({
          where: { applicationId },
          orderBy: { createdAt: "desc" },
        });

    if (!targetRecord) {
      return null;
    }

    const batchRecords = await prisma.authorityVerification.findMany({
      where: {
        applicationId,
        batchId: targetRecord.batchId,
      },
      orderBy: { createdAt: "asc" },
      include: {
        document: {
          select: {
            id: true,
            documentType: true,
            fileName: true,
            originalName: true,
          },
        },
      },
    });

    return this.buildSummary(applicationId, targetRecord.batchId, batchRecords);
  }

  /**
   * Fetch historical verification batches for an application.
   */
  async getHistoricalBatches(applicationId: string) {
    const records = await prisma.authorityVerification.findMany({
      where: { applicationId },
      orderBy: { createdAt: "desc" },
      select: {
        batchId: true,
        verifiedAt: true,
        status: true,
        authorityCategory: true,
      },
    });

    const batchMap = new Map<
      string,
      { batchId: string; verifiedAt: Date; count: number; statuses: string[] }
    >();
    for (const r of records) {
      if (!batchMap.has(r.batchId)) {
        batchMap.set(r.batchId, {
          batchId: r.batchId,
          verifiedAt: r.verifiedAt,
          count: 1,
          statuses: [r.status],
        });
      } else {
        const item = batchMap.get(r.batchId)!;
        item.count += 1;
        if (!item.statuses.includes(r.status)) {
          item.statuses.push(r.status);
        }
      }
    }

    return Array.from(batchMap.values());
  }

  /**
   * Manually record a verified bank confirmation letter received from branch manager.
   */
  async recordOfficerBankConfirmation(
    applicationId: string,
    payload: OfficerBankConfirmationPayload,
    documentId?: string
  ): Promise<any> {
    const batchId = `officer_conf_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

    let doc = null;
    if (documentId) {
      doc = await prisma.document.findUnique({ where: { id: documentId } });
    } else {
      const allDocs = await prisma.document.findMany({ where: { applicationId } });
      doc = findDocumentByType(allDocs, "DOC_10_BANK_FUNDS", "DOC10_BANK_FUNDS", "DOC_10") || null;
    }

    const result = verifyBankConfirmation(doc, payload);

    return prisma.authorityVerification.create({
      data: {
        applicationId,
        documentId: doc?.id || null,
        batchId,
        authorityCategory: result.authorityCategory,
        authorityName: result.authorityName,
        verificationMode: result.verificationMode,
        sourceName: result.sourceName,
        queryReference: result.queryReference,
        status: result.status,
        submittedFields: result.submittedFields,
        authoritativeFields: (result.authoritativeFields as any) ?? undefined,
        discrepancies: (result.discrepancies as any) ?? undefined,
        summary: result.summary,
        scrutinyActionPrompt: result.scrutinyActionPrompt,
        verifiedAt: new Date(),
      },
    });
  }

  private buildSummary(
    applicationId: string,
    batchId: string,
    records: any[]
  ): VerificationBatchSummary {
    let verifiedSimulatedCount = 0;
    let mismatchCount = 0;
    let formatOnlyCount = 0;
    let expiredCount = 0;
    let notFoundCount = 0;
    let pendingCount = 0;
    let recordedCount = 0;

    for (const r of records) {
      switch (r.status) {
        case "VERIFIED_SIMULATED":
          verifiedSimulatedCount++;
          break;
        case "MISMATCH_DETECTED":
          mismatchCount++;
          break;
        case "FORMAT_VALID_UNVERIFIED":
        case "FORMAT_INVALID":
          formatOnlyCount++;
          break;
        case "EXPIRED_AT_SOURCE":
          expiredCount++;
          break;
        case "RECORD_NOT_FOUND":
          notFoundCount++;
          break;
        case "CONFIRMATION_PENDING":
          pendingCount++;
          break;
        case "CONFIRMATION_RECORDED":
          recordedCount++;
          break;
      }
    }

    return {
      batchId,
      applicationId,
      verifiedAt: records[0]?.verifiedAt?.toISOString() || new Date().toISOString(),
      totalRun: records.length,
      verifiedSimulatedCount,
      mismatchCount,
      formatOnlyCount,
      expiredCount,
      notFoundCount,
      pendingCount,
      recordedCount,
      verifications: records,
    };
  }
}

export const authorityVerificationService = new AuthorityVerificationService();
