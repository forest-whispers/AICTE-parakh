import crypto from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { verifySocietyRegistrar } from "./society-registrar.adapter.js";
import { verifyLandRevenueRecord } from "./revenue-records.adapter.js";
import { verifyFireServices } from "./fire-services.adapter.js";
import { verifyArchitectCouncil } from "./architect-council.adapter.js";
import { verifyBankConfirmation, } from "./bank-confirmation.adapter.js";
export * from "./types.js";
export * from "./society-registrar.adapter.js";
export * from "./revenue-records.adapter.js";
export * from "./fire-services.adapter.js";
export * from "./architect-council.adapter.js";
export * from "./bank-confirmation.adapter.js";
export class AuthorityVerificationService {
    /**
     * Run on-demand authority verification for an application across all supported document types.
     * Completely independent of deterministic scrutiny and does not rerun extraction.
     */
    async verifyApplication(applicationId, options) {
        const application = await prisma.application.findUnique({
            where: { id: applicationId },
            include: { documents: true },
        });
        if (!application) {
            throw new Error(`Application ${applicationId} not found.`);
        }
        const batchId = `batch_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
        const results = [];
        // Map documents by type
        const docs = application.documents;
        // 1. Sponsoring Body Registration (DOC_01)
        const doc01 = docs.find((d) => d.documentType === "DOC_01_REGISTRATION");
        if (doc01) {
            results.push(verifySocietyRegistrar(doc01));
        }
        // 2. Land Deed (DOC_03)
        const doc03 = docs.find((d) => d.documentType === "DOC_03_LAND_DEED");
        if (doc03) {
            results.push(verifyLandRevenueRecord(doc03));
        }
        // 3. Land Use Conversion Order (DOC_05)
        const doc05 = docs.find((d) => d.documentType === "DOC_05_LAND_USE");
        if (doc05) {
            results.push(verifyLandRevenueRecord(doc05));
        }
        // 4. Approved Building Plan (DOC_06) - CoA Architect Verification
        const doc06 = docs.find((d) => d.documentType === "DOC_06_BUILDING_PLAN");
        if (doc06) {
            results.push(verifyArchitectCouncil(doc06));
        }
        // 5. Fire Safety NOC (DOC_09)
        const doc09 = docs.find((d) => d.documentType === "DOC_09_FIRE_SAFETY");
        if (doc09) {
            results.push(verifyFireServices(doc09));
        }
        // 6. Bank / FDR Funds (DOC_10)
        const doc10 = docs.find((d) => d.documentType === "DOC_10_BANK_FUNDS");
        if (doc10) {
            results.push(verifyBankConfirmation(doc10, options?.officerBankConfirmation));
        }
        // Persist all results into Prisma AuthorityVerification table
        const createdRecords = await Promise.all(results.map((res) => prisma.authorityVerification.create({
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
                authoritativeFields: res.authoritativeFields ?? undefined,
                discrepancies: res.discrepancies ?? undefined,
                summary: res.summary,
                scrutinyActionPrompt: res.scrutinyActionPrompt,
                verifiedAt: new Date(),
            },
        })));
        return this.buildSummary(applicationId, batchId, createdRecords);
    }
    /**
     * Fetch the latest verification run for an application.
     */
    async getLatestVerifications(applicationId) {
        const latestRecord = await prisma.authorityVerification.findFirst({
            where: { applicationId },
            orderBy: { createdAt: "desc" },
        });
        if (!latestRecord) {
            return null;
        }
        const batchRecords = await prisma.authorityVerification.findMany({
            where: {
                applicationId,
                batchId: latestRecord.batchId,
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
        return this.buildSummary(applicationId, latestRecord.batchId, batchRecords);
    }
    /**
     * Fetch historical verification batches for an application.
     */
    async getHistoricalBatches(applicationId) {
        const records = await prisma.authorityVerification.findMany({
            where: { applicationId },
            orderBy: { createdAt: "desc" },
            select: {
                batchId: true,
                verifiedAt: true,
                status: true,
            },
        });
        const batchMap = new Map();
        for (const r of records) {
            if (!batchMap.has(r.batchId)) {
                batchMap.set(r.batchId, {
                    batchId: r.batchId,
                    verifiedAt: r.verifiedAt,
                    count: 1,
                });
            }
            else {
                batchMap.get(r.batchId).count += 1;
            }
        }
        return Array.from(batchMap.values());
    }
    /**
     * Manually record a verified bank confirmation letter received from branch manager.
     */
    async recordOfficerBankConfirmation(applicationId, payload, documentId) {
        const batchId = `officer_conf_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
        let doc = null;
        if (documentId) {
            doc = await prisma.document.findUnique({ where: { id: documentId } });
        }
        else {
            doc = await prisma.document.findFirst({
                where: { applicationId, documentType: "DOC_10_BANK_FUNDS" },
            });
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
                authoritativeFields: result.authoritativeFields ?? undefined,
                discrepancies: result.discrepancies ?? undefined,
                summary: result.summary,
                scrutinyActionPrompt: result.scrutinyActionPrompt,
                verifiedAt: new Date(),
            },
        });
    }
    buildSummary(applicationId, batchId, records) {
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
//# sourceMappingURL=index.js.map