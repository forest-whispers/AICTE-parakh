export type RuleOutcome = "PASS" | "FAIL_DEFICIENCY" | "EXPIRED" | "MISMATCH_DETECTED" | "EVIDENCE_MISSING" | "EXTRACTION_UNCERTAIN" | "MANUAL_REVIEW_REQUIRED" | "INSUFFICIENT_INPUT" | "NOT_APPLICABLE";
export interface FindingEvidence {
    documentId: string;
    documentType: string;
    fieldName: string;
    rawText: string | null;
    extractedValue: any;
    pageNumber: number | null;
    excerpt: string | null;
}
export interface RuleFinding {
    ruleId: string;
    ruleName: string;
    aphClause: string;
    outcome: RuleOutcome;
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "ADVISORY";
    summary: string;
    details: string;
    evidence: FindingEvidence[];
    remediationNote?: string;
}
export interface ScrutinyEvaluationResult {
    evaluationDate: string;
    overallStatus: "COMPLIANT" | "DEFICIENCIES_DETECTED" | "MANUAL_REVIEW_REQUIRED" | "INSUFFICIENT_INPUT";
    totalRulesRun: number;
    passedCount: number;
    deficiencyCount: number;
    reviewCount: number;
    missingCount: number;
    findings: RuleFinding[];
}
export interface ApplicationScrutinyContext {
    id?: string;
    institutionName: string;
    programCategory?: string | null;
    proposedIntake?: number | null;
}
export interface DocumentScrutinyInput {
    id: string;
    documentType: string;
    originalName?: string;
    filePath?: string;
    fileHash?: string | null;
    extractedData: any;
}
export declare class ComplianceService {
    /**
     * Evaluates deterministic APH compliance rules for an application stored in database.
     */
    evaluateApplication(applicationId: string, customEvaluationDate?: Date): Promise<ScrutinyEvaluationResult>;
    /**
     * Core scrutiny engine: pure evaluation over application context and document extractions.
     */
    evaluateDocuments(application: ApplicationScrutinyContext, docs: DocumentScrutinyInput[], customEvaluationDate?: Date, persistFileHash?: boolean): Promise<ScrutinyEvaluationResult>;
}
export declare const complianceService: ComplianceService;
//# sourceMappingURL=compliance.service.d.ts.map