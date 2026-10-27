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
  submitted: any;
  authoritative: any;
  observation: string;
}

export interface AdapterVerificationResult {
  authorityCategory: AuthorityCategory;
  authorityName: string;
  verificationMode: VerificationMode;
  sourceName: string;
  queryReference: string | null;
  documentId: string | null;
  status: VerificationStatus;
  submittedFields: Record<string, any>;
  authoritativeFields: Record<string, any> | null;
  discrepancies: FieldDiscrepancy[];
  summary: string;
  scrutinyActionPrompt: string;
}
