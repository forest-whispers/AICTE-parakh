import { createContext } from "react";
import type {
  InstitutionDetailsFormData,
  StagedDocument,
  IntakeAlertNotice,
  IntakeStepIndex,
  BackendCreatedApplication,
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
}

export const IntakeContext = createContext<IntakeContextValue | undefined>(undefined);
