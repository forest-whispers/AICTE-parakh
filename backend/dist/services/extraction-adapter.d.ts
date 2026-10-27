import type { FieldExtractionState } from "../schemas/extraction.schema.js";
export interface NormalizedField<T> {
    state: FieldExtractionState;
    value: T | null;
    rawText: string | null;
    pageNumber: number | null;
    excerpt: string | null;
    uncertaintyReason: string | null;
    sourceKey: string;
}
export declare function makeEmptyField<T>(sourceKey?: string): NormalizedField<T>;
export declare function extractField<T>(container: any, candidateKeys: string[], transform?: (val: any) => T | null): NormalizedField<T>;
export interface NormalizedDoc01Registration {
    entityType: NormalizedField<string>;
    trustSocietyName: NormalizedField<string>;
    registrationNumber: NormalizedField<string>;
    registrationDate: NormalizedField<string>;
    registeringAuthority: NormalizedField<string>;
    registeredAddress: NormalizedField<string>;
    hasNonProfitClause: NormalizedField<boolean>;
}
export interface NormalizedDoc02Resolution {
    trustSocietyName: NormalizedField<string>;
    proposedInstitutionName: NormalizedField<string>;
    resolutionDate: NormalizedField<string>;
    resolutionNumber: NormalizedField<string>;
    locationAddress: NormalizedField<string>;
    authorizedSignatories: NormalizedField<string>;
    proposedCoursesIntake: NormalizedField<string>;
}
export interface NormalizedDoc03LandDeed {
    documentType: NormalizedField<string>;
    landLocation: NormalizedField<string>;
    khasraNumbers: NormalizedField<string>;
    landAreaAcres: NormalizedField<number>;
    buyerTransferee: NormalizedField<string>;
    sellerTransferor: NormalizedField<string>;
    registrationNumber: NormalizedField<string>;
    registrationDate: NormalizedField<string>;
    registrarOffice: NormalizedField<string>;
    leaseTenureYears: NormalizedField<number>;
    leaseExpiryDate: NormalizedField<string>;
    leaseCommencementDate: NormalizedField<string>;
}
export interface NormalizedDoc04LeaseAffidavit {
    deponentName: NormalizedField<string>;
    isApplicable: NormalizedField<boolean>;
    executionDate: NormalizedField<string>;
    khasraNumbers: NormalizedField<string>;
    placeOfExecution: NormalizedField<string>;
    trustSocietyName: NormalizedField<string>;
    hasIrrevocableCommitment: NormalizedField<boolean>;
}
export interface NormalizedDoc05LandUse {
    issueDate: NormalizedField<string>;
    orderNumber: NormalizedField<string>;
    landLocation: NormalizedField<string>;
    permittedUse: NormalizedField<string>;
    applicantName: NormalizedField<string>;
    khasraNumbers: NormalizedField<string>;
    landAreaAcres: NormalizedField<number>;
    issuingAuthority: NormalizedField<string>;
}
export interface NormalizedDoc06BuildingPlan {
    farFsi: NormalizedField<number>;
    siteAddress: NormalizedField<string>;
    sanctionDate: NormalizedField<string>;
    architectName: NormalizedField<string>;
    sanctionNumber: NormalizedField<string>;
    institutionName: NormalizedField<string>;
    adminCarpetAreaSqm: NormalizedField<number>;
    amenitiesCarpetAreaSqm: NormalizedField<number>;
    totalBuiltUpAreaSqm: NormalizedField<number>;
    sanctioningAuthority: NormalizedField<string>;
    architectCoaRegistration: NormalizedField<string>;
}
export interface NormalizedDoc07Occupancy {
    issueDate: NormalizedField<string>;
    siteAddress: NormalizedField<string>;
    occupancyType: NormalizedField<string>;
    buildingDetails: NormalizedField<string>;
    institutionName: NormalizedField<string>;
    issuingAuthority: NormalizedField<string>;
    certificateNumber: NormalizedField<string>;
    expiryDate: NormalizedField<string>;
}
export interface NormalizedDoc08StructuralStability {
    reviewDate: NormalizedField<string>;
    siteAddress: NormalizedField<string>;
    engineerName: NormalizedField<string>;
    inspectionDate: NormalizedField<string>;
    stabilityStatus: NormalizedField<string>;
    buildingAgeYears: NormalizedField<number>;
    certificateNumber: NormalizedField<string>;
    engineerQualifications: NormalizedField<string>;
    expiryDate: NormalizedField<string>;
}
export interface NormalizedDoc09FireSafety {
    issueDate: NormalizedField<string>;
    expiryDate: NormalizedField<string>;
    siteAddress: NormalizedField<string>;
    buildingDetails: NormalizedField<string>;
    institutionName: NormalizedField<string>;
    issuingAuthority: NormalizedField<string>;
    certificateNumber: NormalizedField<string>;
}
export interface NormalizedDoc10BankFunds {
    bankName: NormalizedField<string>;
    branchName: NormalizedField<string>;
    ifscCode: NormalizedField<string>;
    accountHolderName: NormalizedField<string>;
    amountInInr: NormalizedField<number>;
    amountInLakhsINR: NormalizedField<number>;
    fdrNumber: NormalizedField<string>;
    maturityDate: NormalizedField<string>;
    certificateDate: NormalizedField<string>;
    isUnencumbered: NormalizedField<boolean>;
    lienStatement: NormalizedField<string>;
}
export interface NormalizedDoc11Affidavit2 {
    deponentName: NormalizedField<string>;
    executionDate: NormalizedField<string>;
    placeOfExecution: NormalizedField<string>;
    trustSocietyName: NormalizedField<string>;
    proposedInstitutionName: NormalizedField<string>;
}
export interface NormalizedDoc14SiteMap {
    latitude: NormalizedField<number>;
    longitude: NormalizedField<number>;
    siteAddress: NormalizedField<string>;
    khasraNumbers: NormalizedField<string>;
    proposedInstitutionName: NormalizedField<string>;
}
export declare function adaptDoc01(container: any): NormalizedDoc01Registration;
export declare function adaptDoc02(container: any): NormalizedDoc02Resolution;
export declare function adaptDoc03(container: any): NormalizedDoc03LandDeed;
export declare function adaptDoc04(container: any): NormalizedDoc04LeaseAffidavit;
export declare function adaptDoc05(container: any): NormalizedDoc05LandUse;
export declare function adaptDoc06(container: any): NormalizedDoc06BuildingPlan;
export declare function adaptDoc07(container: any): NormalizedDoc07Occupancy;
export declare function adaptDoc08(container: any): NormalizedDoc08StructuralStability;
export declare function adaptDoc09(container: any): NormalizedDoc09FireSafety;
export declare function adaptDoc10(container: any): NormalizedDoc10BankFunds;
export declare function adaptDoc11(container: any): NormalizedDoc11Affidavit2;
export declare function adaptDoc14(container: any): NormalizedDoc14SiteMap;
//# sourceMappingURL=extraction-adapter.d.ts.map