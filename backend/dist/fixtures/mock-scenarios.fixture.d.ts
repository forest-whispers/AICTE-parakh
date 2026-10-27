/**
 * Reusable Synthetic Demonstration Fixtures for AICTE Approval Process Scrutiny (Slice 4 - Baseline Dataset)
 *
 * Exports 8 independent synthetic application scenarios with complete mocked VLM document extraction envelopes:
 * 1. scenario1Compliant: Largely compliant application (COMPLIANT)
 * 2. scenario2MissingDocs: Missing critical documents and metadata (MANUAL_REVIEW_REQUIRED / Missing)
 * 3. scenario3UncertainEvidence: Ambiguous and illegible extractions (MANUAL_REVIEW_REQUIRED / Uncertain)
 * 4. scenario4IdentityMismatch: Cross-document sponsoring body and address divergence (DEFICIENCIES_DETECTED)
 * 5. scenario5LandDeficiencies: Substantive land acreage, lease duration, and plot count violations (DEFICIENCIES_DETECTED)
 * 6. scenario6ExpiredChronology: Expired fire safety NOC and milestone sequence inversions (DEFICIENCIES_DETECTED)
 * 7. scenario7InfraDeficit: Administrative / amenities carpet area shortfall and FAR overflow (DEFICIENCIES_DETECTED)
 * 8. scenario8CompoundIssues: Composite application with multiple concurrent deficiencies (DEFICIENCIES_DETECTED)
 */
export interface SyntheticField<T> {
    state: "PRESENT" | "NOT_FOUND" | "ILLEGIBLE" | "AMBIGUOUS" | "NOT_APPLICABLE";
    value: T | null;
    rawText: string | null;
    pageNumber: number | null;
    excerpt: string | null;
    uncertaintyReason: string | null;
}
export declare function makeField<T>(value: T, rawText?: string, pageNumber?: number): SyntheticField<T>;
export declare function makeEmptyField(state?: "NOT_FOUND" | "ILLEGIBLE" | "AMBIGUOUS", uncertaintyReason?: string): SyntheticField<any>;
export interface SyntheticDocEnvelope {
    documentId: string;
    classifiedType: string;
    classificationConfidence: "HIGH" | "MEDIUM" | "LOW";
    classificationReasoning: string;
    pageCount: number;
    extractionStatus: "SUCCESS" | "PARTIAL" | "FAILED";
    generalRemarks: string;
    [key: string]: any;
}
export interface SyntheticScenario {
    id: string;
    applicationNumber: string;
    institutionName: string;
    programCategory: string | null;
    proposedIntake: number | null;
    status: string;
    title: string;
    description: string;
    intendedScrutinyOutcome: "COMPLIANT" | "DEFICIENCIES_DETECTED" | "MANUAL_REVIEW_REQUIRED" | "INSUFFICIENT_INPUT";
    documents: Array<{
        documentType: string;
        originalName: string;
        extractedData: SyntheticDocEnvelope;
    }>;
}
export declare const scenario1Compliant: SyntheticScenario;
export declare const scenario2MissingDocs: SyntheticScenario;
export declare const scenario3UncertainEvidence: SyntheticScenario;
export declare const scenario4IdentityMismatch: SyntheticScenario;
export declare const scenario5LandDeficiencies: SyntheticScenario;
export declare const scenario6ExpiredChronology: SyntheticScenario;
export declare const scenario7InfraDeficit: SyntheticScenario;
export declare const scenario8CompoundIssues: SyntheticScenario;
export declare const allSyntheticScenarios: SyntheticScenario[];
export declare const output1: SyntheticScenario;
export declare const output2: SyntheticScenario;
export declare const output3: SyntheticScenario;
export declare const output4: SyntheticScenario;
export declare const output5: SyntheticScenario;
export declare const output6: SyntheticScenario;
export declare const output7: SyntheticScenario;
export declare const output8: SyntheticScenario;
//# sourceMappingURL=mock-scenarios.fixture.d.ts.map