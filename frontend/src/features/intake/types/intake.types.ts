/**
 * PARAKH Guided Submission Types
 */

export interface InstitutionDetailsFormData {
  institutionName: string;
  applicationNumber: string;
  programCategory: string;
  proposedIntake: string;
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
  processingState: "STAGED" | "QUEUED" | "EXTRACTING" | "FAILED" | "SUCCESS";
  processingNote?: string;
}

export interface IntakeAlertNotice {
  type: "UNSUPPORTED_FORMAT" | "DUPLICATE_FILE" | "MISSING_EVIDENCE" | "EXTRACTION_UNAVAILABLE";
  title: string;
  message: string;
  conflictingFileName?: string;
  categoryCode?: string;
}

export type IntakeStepIndex = 1 | 2 | 3 | 4 | 5;
