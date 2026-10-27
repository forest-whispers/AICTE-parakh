import { type OfficerBankConfirmationPayload } from "./bank-confirmation.adapter.js";
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
export declare class AuthorityVerificationService {
    /**
     * Run on-demand authority verification for an application across all supported document types.
     * Completely independent of deterministic scrutiny and does not rerun extraction.
     */
    verifyApplication(applicationId: string, options?: {
        officerBankConfirmation?: OfficerBankConfirmationPayload;
    }): Promise<VerificationBatchSummary>;
    /**
     * Fetch the latest verification run for an application.
     */
    getLatestVerifications(applicationId: string): Promise<VerificationBatchSummary | null>;
    /**
     * Fetch historical verification batches for an application.
     */
    getHistoricalBatches(applicationId: string): Promise<{
        batchId: string;
        verifiedAt: Date;
        count: number;
    }[]>;
    /**
     * Manually record a verified bank confirmation letter received from branch manager.
     */
    recordOfficerBankConfirmation(applicationId: string, payload: OfficerBankConfirmationPayload, documentId?: string): Promise<any>;
    private buildSummary;
}
export declare const authorityVerificationService: AuthorityVerificationService;
//# sourceMappingURL=index.d.ts.map