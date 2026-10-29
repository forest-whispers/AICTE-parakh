import { createContext } from "react";
import type {
  InstitutionDetailsFormData,
  StagedDocument,
  IntakeAlertNotice,
  IntakeStepIndex,
  BackendCreatedApplication,
  BackendScrutinyReport,
} from "../types/intake.types";

export interface IntakeContextValue {
  currentStep: IntakeStepIndex;
  setCurrentStep: (step: IntakeStepIndex) => void;
  goToNextStep: () => boolean;
  goToPreviousStep: () => void;
  // Step 1 Form Data
  institutionDetails: InstitutionDetailsFormData;
  updateInstitutionDetails: (fields: Partial<InstitutionDetailsFormData>) => void;
  formErrors: Record<string, string>;
  validateStep1: () => boolean;
  clearFieldError: (fieldName: string) => void;
  // Step 2 Staged Documents (In-memory file references)
  stagedDocuments: StagedDocument[];
  addStagedDocument: (categoryCode: string, issuingReference: string, file: File) => boolean;
  removeStagedDocument: (id: string) => void;
  replaceStagedDocument: (id: string, newFile: File, newReference?: string) => boolean;
  // Alerts & Blocking Recovery
  activeAlert: IntakeAlertNotice | null;
  clearAlert: () => void;
  setActiveAlert: (alert: IntakeAlertNotice | null) => void;
  // Evidence Checklist Status
  requiredCategories: string[];
  missingRequiredCategories: string[];
  isStep2Valid: boolean;
  resetIntake: () => void;
  // Application Creation & Uploading
  createdApplication: BackendCreatedApplication | null;
  setCreatedApplication: (app: BackendCreatedApplication | null) => void;
  isUploading: boolean;
  uploadError: string | null;
  submitApplication: () => Promise<boolean>;
  // Re-run Extraction & Scrutiny
  extractionError: string | null;
  scrutinyError: string | null;
  isExtracting: boolean;
  isEvaluatingScrutiny: boolean;
  runExtraction: () => Promise<boolean>;
  runScrutiny: () => Promise<boolean>;
  latestScrutinyReport: BackendScrutinyReport | null;
  isScrutinyStale: boolean;
  // Officer Regulatory Validation & Evidence Correction
  updateDocumentStatus: (
    documentId: string,
    status: "PASS" | "DEFICIENCY" | "MANUAL_APPROVAL" | "RESET",
    notes?: string
  ) => Promise<boolean>;
  reviewDocumentEvidence: (
    documentId: string,
    submission: import("../types/intake.types").DocumentReviewSubmission
  ) => Promise<{ success: boolean; scrutinyReport?: BackendScrutinyReport | null; error?: string }>;
  // Existing Application Mode
  isExistingApplicationMode: boolean;
  isLoadingExistingApplication: boolean;
  existingApplicationError: { status: number; message: string } | null;
}

export const IntakeContext = createContext<IntakeContextValue | undefined>(undefined);
