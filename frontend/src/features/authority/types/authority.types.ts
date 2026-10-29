export type AuthorityCategory =
  | "SOCIETY_REGISTRAR"
  | "REVENUE_DEPARTMENT"
  | "FIRE_SERVICES"
  | "COUNCIL_OF_ARCHITECTURE"
  | "BANK_BRANCH";

export type VerificationMode =
  | "SIMULATED_REGISTRY"
  | "FORMAT_REGISTRY_CHECK"
  | "SIMULATED_BRANCH_INQUIRY"
  | "MANUAL_CONFIRMATION_ROUTED";

export type VerificationStatus =
  | "VERIFIED_SIMULATED"
  | "FORMAT_VALID_UNVERIFIED"
  | "FORMAT_INVALID"
  | "MISMATCH_DETECTED"
  | "EXPIRED_AT_SOURCE"
  | "RECORD_NOT_FOUND"
  | "CONFIRMATION_PENDING"
  | "CONFIRMATION_RECORDED"
  | "SOURCE_UNAVAILABLE";

export interface FieldDiscrepancy {
  field: string;
  label: string;
  submitted: unknown;
  authoritative: unknown;
  observation: string;
}

export interface AuthorityVerificationRecord {
  id: string;
  applicationId: string;
  documentId?: string | null;
  batchId: string;
  authorityCategory: AuthorityCategory;
  authorityName: string;
  verificationMode: VerificationMode;
  sourceName: string;
  queryReference: string | null;
  status: VerificationStatus;
  submittedFields: Record<string, unknown>;
  authoritativeFields: Record<string, unknown> | null;
  discrepancies: FieldDiscrepancy[] | null;
  summary: string;
  scrutinyActionPrompt: string;
  verifiedAt: string;
  createdAt?: string;
  document?: {
    id: string;
    documentType: string;
    fileName: string;
    originalName: string;
  } | null;
}

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
  verifications: AuthorityVerificationRecord[];
}

export interface HistoricalBatchEntry {
  batchId: string;
  verifiedAt: string;
  count: number;
  statuses?: string[];
}

export interface BankConfirmationPayload {
  letterReference: string;
  letterDate: string;
  recordingOfficer: string;
  branchManagerName?: string;
  confirmedAmountLakhs: number;
  isUnencumbered: boolean;
  remarks?: string;
  documentId?: string;
}
