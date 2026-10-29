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
  backendState?: string;
  value?: unknown;
  rawText?: string;
  pageNumber?: number;
  excerpt?: string;
  uncertaintyReason?: string;
}

export interface OfficerValidationDecision {
  status: "PASS" | "DEFICIENCY" | "MANUAL_APPROVAL";
  notes?: string;
  reviewedAt: string;
  reviewedByName?: string;
  reviewedById?: string;
}

export interface OfficerFieldCorrection {
  state: "PRESENT" | "NOT_FOUND" | "ILLEGIBLE" | "AMBIGUOUS" | "NOT_APPLICABLE";
  value: unknown;
  rawText?: string | null;
  pageNumber?: number | null;
  notes?: string;
  reviewedAt?: string;
  reviewedById?: string;
  reviewedByName?: string;
}

export interface OfficerDocumentReview {
  status: "PASS" | "DEFICIENCY" | "MANUAL_APPROVAL" | "RESET";
  notes?: string;
  reviewedAt: string;
  reviewedById?: string;
  reviewedByName?: string;
  fields: Record<string, OfficerFieldCorrection>;
}

export interface DocumentReviewSubmission {
  status: "PASS" | "DEFICIENCY" | "MANUAL_APPROVAL" | "RESET";
  notes?: string;
  fieldCorrections?: Record<string, {
    state: "PRESENT" | "NOT_FOUND" | "ILLEGIBLE" | "AMBIGUOUS" | "NOT_APPLICABLE";
    value: unknown;
    rawText?: string | null;
    pageNumber?: number | null;
    notes?: string;
  }>;
}

export interface DocumentExtractionData {
  status: "PENDING" | "EXTRACTING" | "SUCCESS" | "UNCERTAIN" | "FAILED" | "PARTIAL";
  extractedAt?: string;
  officerValidation?: OfficerValidationDecision | null;
  officerReview?: OfficerDocumentReview | null;
  fields?: Record<string, {
    state: "present" | "absent" | "uncertain";
    backendState?: string;
    value: unknown;
    rawText?: string;
    pageNumber?: number;
    excerpt?: string;
    uncertaintyReason?: string;
    isOfficerReviewed?: boolean;
  }>;
  rawOutput?: unknown;
  failureReason?: string;
}

export interface StagedDocument {
  id: string; // internal UUID for tracking
  backendDocId?: string; // persisted database document ID
  categoryCode: string;
  categoryLabel: string;
  shortLabel: string;
  issuingReference: string;
  file?: File; // in-memory file reference (optional for persisted server documents)
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

export interface BackendScrutinyFinding {
  ruleId: string;
  ruleName: string;
  aphClause?: string;
  outcome: string;
  severity?: string;
  evidence?: Array<{
    documentType?: string;
    fieldName?: string;
    extractedValue?: unknown;
    rawText?: string | null;
    pageNumber?: number | null;
  }>;
  findingNote?: string;
  suggestedAction?: string;
}

export interface BackendScrutinyReport {
  id?: string;
  evaluationDate?: string;
  overallStatus: string;
  totalRulesRun?: number;
  passedCount: number;
  deficiencyCount: number;
  reviewCount: number;
  missingCount?: number;
  reviewedEvidenceCount?: number;
  findings?: BackendScrutinyFinding[];
}

export interface ApplicationListItem {
  id: string;
  applicationNumber: string;
  institutionName: string;
  programCategory: string | null;
  proposedIntake: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  assignedOfficer?: {
    id: string;
    name: string;
    email: string;
    designation: string;
  } | null;
  documents?: Array<{
    id: string;
    fileName: string;
    originalName: string;
    documentType: string;
    mimeType?: string;
    fileSize?: number;
    extractionStatus?: string;
  }>;
  scrutinyReports?: Array<{
    id: string;
    overallStatus: string;
    totalRulesRun?: number;
    passedCount: number;
    deficiencyCount: number;
    reviewCount: number;
    missingCount: number;
    evaluationDate: string;
  }>;
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
