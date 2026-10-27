/**
 * Mock Authority Registry Fixture
 *
 * Grounded statutory records representing simulated state and national issuing authorities:
 * 1. State Registrar of Public Trusts & Societies (M.P. Public Trusts Act / Societies Registration)
 * 2. State Revenue Department (Bhulekh Land Title & Section 172 Land Use Conversion Orders)
 * 3. State Directorate of Fire & Emergency Services (Fire Safety e-NOC Portal)
 * 4. Council of Architecture (National Roll of Architects)
 * 5. Bank Branch Core Record Inquiry (Simulated branch responses & recorded letters)
 */
export interface SponsoringBodyRegistryRecord {
    registrationNumber: string;
    legalName: string;
    entityType: string;
    registrationDate: string;
    registeringAuthority: string;
    registeredAddress: string;
    status: "ACTIVE" | "DISSOLVED" | "SUSPENDED";
    hasNonProfitClause: boolean;
    authorizedTrustees: string[];
}
export interface LandRecordRegistryEntry {
    deedRegistrationNumber?: string;
    conversionOrderNumber?: string;
    ownerName: string;
    khasraNumbers: string[];
    district: string;
    tehsil: string;
    village: string;
    totalAreaAcres: number;
    permittedUse: string;
    encumbranceStatus: "NIL" | "ACTIVE_ENCUMBRANCE";
    encumbranceDetails?: string;
    orderDate?: string;
    registrationDate?: string;
}
export interface FireNocRegistryRecord {
    certificateNumber: string;
    institutionName: string;
    siteAddress: string;
    issuingAuthority: string;
    issueDate: string;
    expiryDate: string;
    status: "ACTIVE" | "EXPIRED" | "REVOKED";
    coveredBlocks: string;
}
export interface ArchitectCoaRecord {
    registrationNumber: string;
    architectName: string;
    registrationStatus: "ACTIVE" | "EXPIRED" | "CANCELLED";
    validUpTo: string;
    qualification: string;
    registeredCity: string;
}
export interface BankBranchConfirmationRecord {
    fdrOrAccountNumber: string;
    bankName: string;
    branchName: string;
    accountHolderName: string;
    depositAmountLakhsINR: number;
    depositDate: string;
    maturityDate: string;
    isUnencumbered: boolean;
    lienDetails: string | null;
    branchConfirmationStatus: "CONFIRMED" | "LIEN_DETECTED" | "BRANCH_UNRESPONSIVE";
}
export declare const MOCK_SPONSORING_BODIES: SponsoringBodyRegistryRecord[];
export declare const MOCK_LAND_RECORDS: LandRecordRegistryEntry[];
export declare const MOCK_FIRE_NOCS: FireNocRegistryRecord[];
export declare const MOCK_COA_ROLL: ArchitectCoaRecord[];
export declare const MOCK_BANK_CONFIRMATIONS: BankBranchConfirmationRecord[];
//# sourceMappingURL=mock-authority-registry.fixture.d.ts.map