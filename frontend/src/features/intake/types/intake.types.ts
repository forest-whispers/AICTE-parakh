/**
 * PARAKH Guided Submission Types
 */

export interface InstitutionDetailsFormData {
  institutionName: string;
  applicationNumber: string;
  programCategory: string;
  proposedIntake: string;
}

export interface ExtractedFieldItem {
  key: string;
  label: string;
  description: string;
  type: "string" | "number" | "boolean" | "date";
  isCrucialForScrutiny: boolean;
  state: "present" | "absent" | "uncertain" | "awaiting";
  value?: unknown;
  rawText?: string;
  pageNumber?: number;
  excerpt?: string;
  uncertaintyReason?: string;
}

export interface DocumentExtractionData {
  status: "PENDING" | "EXTRACTING" | "SUCCESS" | "UNCERTAIN" | "FAILED";
  extractedAt?: string;
  fields?: Record<string, {
    state: "present" | "absent" | "uncertain";
    value: unknown;
    rawText?: string;
    pageNumber?: number;
    excerpt?: string;
    uncertaintyReason?: string;
  }>;
  rawOutput?: unknown;
  failureReason?: string;
}

export interface StagedDocument {
  id: string; // internal UUID for tracking
  categoryCode: string;
  categoryLabel: string;
  shortLabel: string;
  issuingReference: string;
  file: File; // in-memory file reference
  fileName: string;
  fileSizeBytes: number;
  formattedSize: string;
  mimeType: string;
  formatExtension: string;
  stagedAt: Date;
  previewUrl?: string;
  processingState: "STAGED" | "QUEUED" | "EXTRACTING" | "FAILED" | "SUCCESS" | "UNCERTAIN";
  processingNote?: string;
  extractionData?: DocumentExtractionData | null;
  validationOutcome?: "PASS" | "UNCERTAIN" | "DEFICIENT" | "EVIDENCE_MISSING" | "PENDING";
}

export interface IntakeAlertNotice {
  type: "UNSUPPORTED_FORMAT" | "DUPLICATE_FILE" | "MISSING_EVIDENCE" | "EXTRACTION_UNAVAILABLE" | "UPLOAD_ERROR";
  title: string;
  message: string;
  conflictingFileName?: string;
  categoryCode?: string;
}

export type IntakeStepIndex = 1 | 2 | 3 | 4 | 5;

export interface BackendCreatedDocument {
  id: string;
  fileName: string;
  originalName: string;
  documentType: string;
  extractionStatus: string;
  extractedData?: unknown;
}

export interface BackendScrutinyReport {
  id: string;
  overallStatus: string;
  passedCount: number;
  deficiencyCount: number;
  reviewCount: number;
  findings?: unknown;
}

export interface BackendCreatedApplication {
  id: string;
  institutionName: string;
  applicationNumber: string;
  programCategory: string | null;
  proposedIntake: number | null;
  status: string;
  documents: BackendCreatedDocument[];
  scrutinyReports?: BackendScrutinyReport[];
}
