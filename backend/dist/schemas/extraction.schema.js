import { z } from "zod";
// --- 1. Standard Field-Level Evidence Envelope ---
export const FieldExtractionStateEnum = z.enum([
    "PRESENT",
    "NOT_FOUND",
    "ILLEGIBLE",
    "AMBIGUOUS",
    "NOT_APPLICABLE",
]);
export function createExtractedFieldSchema(valueSchema) {
    return z.object({
        state: FieldExtractionStateEnum,
        value: valueSchema.nullable(),
        rawText: z.string().nullable(),
        pageNumber: z.number().int().positive().nullable(),
        excerpt: z.string().nullable(),
        uncertaintyReason: z.string().nullable(),
    });
}
// Base primitive field schemas
export const stringField = createExtractedFieldSchema(z.string());
export const numberField = createExtractedFieldSchema(z.number());
export const booleanField = createExtractedFieldSchema(z.boolean());
export const stringArrayField = createExtractedFieldSchema(z.array(z.string()));
// --- 2. Document-Type Classification Enum ---
export const APHDocumentTypeEnum = z.enum([
    "DOC_01_REGISTRATION",
    "DOC_02_RESOLUTION",
    "DOC_03_LAND_DEED",
    "DOC_04_LEASE_AFFIDAVIT",
    "DOC_05_LAND_USE",
    "DOC_06_BUILDING_PLAN",
    "DOC_07_OCCUPANCY",
    "DOC_08_STRUCTURAL_STABILITY",
    "DOC_09_FIRE_SAFETY",
    "DOC_10_BANK_FUNDS",
    "DOC_11_AFFIDAVIT_2",
    "DOC_14_SITE_MAP",
    "UNRECOGNIZED",
]);
// --- 3. Document-Specific Typed Field Blocks ---
// DOC-01: Applicant Registration & MoA
export const Doc01RegistrationSchema = z.object({
    applicantLegalName: stringField,
    entityType: createExtractedFieldSchema(z.enum(["TRUST", "SOCIETY", "SECTION_8_COMPANY", "OTHER"])),
    registrationNumber: stringField,
    registrationDate: stringField, // ISO YYYY-MM-DD
    registeringAuthority: stringField,
    registeredAddress: stringField,
    hasNonProfitClause: booleanField,
});
// DOC-02: Applicant Resolution (Format 3)
export const Doc02ResolutionSchema = z.object({
    sponsoringBodyName: stringField,
    proposedInstitutionName: stringField,
    resolutionDate: stringField, // ISO YYYY-MM-DD
    resolutionReferenceNumber: stringField,
    hasEstablishmentDecision: booleanField,
    hasResourceCommitment: booleanField,
    programmesStated: stringArrayField,
});
// DOC-03: Registered Land Deed or Lease Deed
export const Doc03LandDeedSchema = z.object({
    deedType: createExtractedFieldSchema(z.enum(["SALE_DEED", "GIFT_DEED", "GOVERNMENT_LEASE", "PRIVATE_LEASE", "OTHER"])),
    transferorLessorName: stringField,
    transfereeLesseeName: stringField,
    deedRegistrationNumber: stringField,
    registrationDate: stringField, // ISO YYYY-MM-DD
    khasraSurveyPlotNumbers: stringArrayField,
    parcelArea: numberField,
    parcelAreaUnit: createExtractedFieldSchema(z.enum(["ACRES", "SQ_METERS", "HECTARES", "SQ_FEET", "OTHER"])),
    landRevenueLocation: stringField,
    leaseCommencementDate: stringField, // ISO YYYY-MM-DD
    leaseTenureYears: numberField,
    leaseExpiryDate: stringField, // ISO YYYY-MM-DD
    landUsePurpose: stringField,
    encumbrancesDeclared: stringField,
});
// DOC-04: Irrevocable Lease Joint Affidavit (Affidavit 7)
export const Doc04LeaseAffidavitSchema = z.object({
    sponsoringBodyName: stringField,
    lessorName: stringField,
    leaseDeedReference: stringField,
    hasIrrevocableCommitment: booleanField,
    executionDate: stringField, // ISO YYYY-MM-DD
});
// DOC-05: Land Use Certificate (LUC) & Conversion Order
export const Doc05LandUseSchema = z.object({
    issuingAuthority: stringField,
    orderReferenceNumber: stringField,
    orderDate: stringField, // ISO YYYY-MM-DD
    landownerApplicantName: stringField,
    khasraSurveyPlotNumbers: stringArrayField,
    permittedLandUse: stringField,
    isEducationalUseExplicitlyAllowed: booleanField,
});
// DOC-06: Approved Building Plan & Room Schedule
export const Doc06BuildingPlanSchema = z.object({
    approvingAuthority: stringField,
    sanctionOrderReference: stringField,
    sanctionDate: stringField, // ISO YYYY-MM-DD
    architectName: stringField,
    architectCoaRegistrationNumber: stringField,
    totalSanctionedBuiltUpArea: numberField,
    builtUpAreaUnit: createExtractedFieldSchema(z.enum(["SQ_METERS", "SQ_FEET"])),
    statedFarFsi: numberField,
    carpetAreaSummary: createExtractedFieldSchema(z.object({
        instructionalSqM: z.number().nullable(),
        administrativeSqM: z.number().nullable(),
        amenitiesSqM: z.number().nullable(),
        circulationSqM: z.number().nullable(),
    })),
    roomSchedule: createExtractedFieldSchema(z.array(z.object({
        buildingBlock: z.string(),
        floorLevel: z.string(),
        roomIdentifier: z.string(),
        roomDesignation: z.string(),
        carpetAreaSqM: z.number(),
    }))),
});
// DOC-07: Occupancy / Completion Certificate
export const Doc07OccupancySchema = z.object({
    certificateType: createExtractedFieldSchema(z.enum(["OCCUPANCY_CERTIFICATE", "COMPLETION_CERTIFICATE", "BUILDING_LICENCE", "FORM_D", "OTHER"])),
    issuingAuthority: stringField,
    certificateReferenceNumber: stringField,
    institutionNameReferenced: stringField,
    campusPhysicalSiteAddress: stringField,
    coveredBuildingsFloors: stringField,
    issueDate: stringField, // ISO YYYY-MM-DD
    occupancyStatus: createExtractedFieldSchema(z.enum(["PERMANENT", "PROVISIONAL", "PARTIAL", "OTHER"])),
    expiryDate: stringField, // ISO YYYY-MM-DD
});
// DOC-08: Structural Stability Certificate
export const Doc08StructuralStabilitySchema = z.object({
    issuingEngineerName: stringField,
    engineerQualification: stringField,
    certificateReferenceNumber: stringField,
    buildingAgeYears: numberField,
    issueDate: stringField, // ISO YYYY-MM-DD
    expiryDate: stringField, // ISO YYYY-MM-DD
    structuralFitnessConclusion: stringField,
});
// DOC-09: Fire Safety Certificate
export const Doc09FireSafetySchema = z.object({
    issuingAuthority: stringField,
    certificateReferenceNumber: stringField,
    institutionNameReferenced: stringField,
    campusPhysicalSiteAddress: stringField,
    coveredBuildingsFloors: stringField,
    issueDate: stringField, // ISO YYYY-MM-DD
    expiryDate: stringField, // ISO YYYY-MM-DD
});
// DOC-10: Bank Certificate of Funds (Certificate 3)
export const Doc10BankFundsSchema = z.object({
    bankName: stringField,
    branchName: stringField,
    ifscCode: stringField,
    accountHolderName: stringField,
    instrumentType: createExtractedFieldSchema(z.enum(["FDR", "SAVINGS", "CURRENT", "OTHER"])),
    accountOrFdrNumber: stringField,
    amountInLakhsINR: numberField, // Normalized amount in ₹ Lakhs
    issueDate: stringField, // ISO YYYY-MM-DD
    fdrMaturityDate: stringField, // ISO YYYY-MM-DD
    isStatedUnencumbered: booleanField,
    lienStatement: stringField,
});
// DOC-11: Affidavit 2 (General AICTE Undertaking)
export const Doc11Affidavit2Schema = z.object({
    deponentName: stringField,
    deponentDesignation: stringField,
    sponsoringBodyName: stringField,
    executionDate: stringField, // ISO YYYY-MM-DD
});
// DOC-14: Satellite / Geo-Tagged Site Map
export const Doc14SiteMapSchema = z.object({
    latitude: numberField,
    longitude: numberField,
    plotBoundariesShown: booleanField,
    khasraSurveyNumbersShown: stringArrayField,
});
// --- 4. Shared Document Extraction Envelope ---
export const DocumentExtractionEnvelopeSchema = z.object({
    documentId: z.string(),
    classifiedType: APHDocumentTypeEnum,
    classificationConfidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
    classificationReasoning: z.string(),
    pageCount: z.number().int().positive().nullable(),
    extractionStatus: z.enum(["SUCCESS", "PARTIAL", "FAILED"]),
    generalRemarks: z.string().nullable(),
    // Exactly one typed block is populated according to classifiedType
    doc01Registration: Doc01RegistrationSchema.optional(),
    doc02Resolution: Doc02ResolutionSchema.optional(),
    doc03LandDeed: Doc03LandDeedSchema.optional(),
    doc04LeaseAffidavit: Doc04LeaseAffidavitSchema.optional(),
    doc05LandUse: Doc05LandUseSchema.optional(),
    doc06BuildingPlan: Doc06BuildingPlanSchema.optional(),
    doc07Occupancy: Doc07OccupancySchema.optional(),
    doc08StructuralStability: Doc08StructuralStabilitySchema.optional(),
    doc09FireSafety: Doc09FireSafetySchema.optional(),
    doc10BankFunds: Doc10BankFundsSchema.optional(),
    doc11Affidavit2: Doc11Affidavit2Schema.optional(),
    doc14SiteMap: Doc14SiteMapSchema.optional(),
});
// Batch response array returned by the VLM
export const BatchExtractionResponseSchema = z.object({
    documents: z.array(DocumentExtractionEnvelopeSchema),
});
//# sourceMappingURL=extraction.schema.js.map