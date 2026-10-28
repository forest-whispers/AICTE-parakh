import React, { useState, useEffect, useCallback, useMemo } from "react";
import type {
  InstitutionDetailsFormData,
  StagedDocument,
  IntakeAlertNotice,
  IntakeStepIndex,
} from "../types/intake.types";
import {
  STATUTORY_DOCUMENT_CATEGORIES,
} from "../constants/statutory-documents";
import { IntakeContext } from "./intake-context-def";

const STORAGE_KEY_STEP1 = "parakh_intake_step1_data";

const initialStep1Data: InstitutionDetailsFormData = {
  institutionName: "",
  applicationNumber: "",
  programCategory: "ENGINEERING_AND_TECHNOLOGY",
  proposedIntake: "",
};

export const IntakeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStep, setCurrentStep] = useState<IntakeStepIndex>(1);

  // Initialize Step 1 from session storage (serializable form fields only)
  const [institutionDetails, setInstitutionDetails] = useState<InstitutionDetailsFormData>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY_STEP1);
      if (stored) {
        return { ...initialStep1Data, ...JSON.parse(stored) };
      }
    } catch {
      // Fallback
    }
    return initialStep1Data;
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Staged files kept strictly in React memory (never serialized to sessionStorage)
  const [stagedDocuments, setStagedDocuments] = useState<StagedDocument[]>([]);
  const [activeAlert, setActiveAlert] = useState<IntakeAlertNotice | null>(null);

  // Persist Step 1 metadata to sessionStorage whenever it changes
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_STEP1, JSON.stringify(institutionDetails));
    } catch {
      // Ignore storage quota errors
    }
  }, [institutionDetails]);

  // Clean up blob URLs when component unmounts or documents change
  useEffect(() => {
    return () => {
      stagedDocuments.forEach((doc) => {
        if (doc.previewUrl) {
          URL.revokeObjectURL(doc.previewUrl);
        }
      });
    };
  }, [stagedDocuments]);

  const updateInstitutionDetails = useCallback((fields: Partial<InstitutionDetailsFormData>) => {
    setInstitutionDetails((prev) => ({ ...prev, ...fields }));
    // Clear any error on edited field
    setFormErrors((prev) => {
      const updated = { ...prev };
      Object.keys(fields).forEach((key) => delete updated[key]);
      return updated;
    });
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setFormErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
  }, []);

  const validateStep1 = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!institutionDetails.institutionName.trim()) {
      errors.institutionName = "Institution name is required.";
    }
    if (!institutionDetails.applicationNumber.trim()) {
      errors.applicationNumber = "Application reference number is required.";
    }
    if (!institutionDetails.programCategory.trim()) {
      errors.programCategory = "Program category is required.";
    }
    if (institutionDetails.proposedIntake && isNaN(Number(institutionDetails.proposedIntake))) {
      errors.proposedIntake = "Proposed intake must be a valid number.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [institutionDetails]);

  // Derive required document category codes directly from statutory definitions
  const requiredCategories = useMemo(() => {
    return STATUTORY_DOCUMENT_CATEGORIES.filter((cat) => cat.isRequired).map((cat) => cat.code);
  }, []);

  // Compute missing required categories
  const missingRequiredCategories = useMemo(() => {
    const stagedCodes = new Set(stagedDocuments.map((doc) => doc.categoryCode));
    return requiredCategories.filter((code) => !stagedCodes.has(code));
  }, [stagedDocuments, requiredCategories]);

  const isStep2Valid = useMemo(() => {
    // Must have at least the primary statutory documents staged
    return stagedDocuments.length > 0 && missingRequiredCategories.length === 0;
  }, [stagedDocuments.length, missingRequiredCategories.length]);

  const addStagedDocument = useCallback(
    (categoryCode: string, issuingReference: string, file: File): boolean => {
      const categoryDef = STATUTORY_DOCUMENT_CATEGORIES.find((c) => c.code === categoryCode);
      if (!categoryDef) return false;

      // 1. Validate File Format against supported backend extensions
      const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
      const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
      const isAllowed =
        allowedExtensions.includes(ext) || categoryDef.acceptedFormats.includes(file.type);

      if (!isAllowed) {
        setActiveAlert({
          type: "UNSUPPORTED_FORMAT",
          title: "Unsupported format",
          message: `${file.name} was not added. Choose an allowed evidence format (PDF, JPG, or PNG under 25 MB).`,
          conflictingFileName: file.name,
          categoryCode,
        });
        return false;
      }

      // 2. Check for duplicate file (same name and size)
      const isDuplicate = stagedDocuments.some(
        (doc) => doc.fileName.toLowerCase() === file.name.toLowerCase() && doc.fileSizeBytes === file.size
      );

      if (isDuplicate) {
        setActiveAlert({
          type: "DUPLICATE_FILE",
          title: "Possible duplicate file",
          message: `${file.name} appears to match a file already added. Review the existing file before replacement.`,
          conflictingFileName: file.name,
          categoryCode,
        });
        return false;
      }

      // 3. Format file size for UI display (e.g. 1.1 MB)
      const sizeMB = file.size / (1024 * 1024);
      const formattedSize = sizeMB >= 1 ? `${sizeMB.toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;

      // 4. Create object URL for local in-browser preview
      let previewUrl: string | undefined;
      try {
        previewUrl = URL.createObjectURL(file);
      } catch {
        // Blob preview unavailable
      }

      const newDoc: StagedDocument = {
        id: `staged-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        categoryCode: categoryDef.code,
        categoryLabel: categoryDef.label,
        shortLabel: categoryDef.shortLabel,
        issuingReference: issuingReference.trim() || categoryDef.defaultIssuingAuthority,
        file,
        fileName: file.name,
        fileSizeBytes: file.size,
        formattedSize: `${ext.replace(".", "").toUpperCase()} · ${formattedSize}`,
        mimeType: file.type || "application/pdf",
        formatExtension: ext.replace(".", "").toUpperCase(),
        stagedAt: new Date(),
        previewUrl,
        processingState: "STAGED",
        processingNote: "Staged · Ready for validation",
      };

      setStagedDocuments((prev) => {
        // One document per category: if category already exists, replace it cleanly
        const filtered = prev.filter((doc) => doc.categoryCode !== categoryDef.code);
        return [...filtered, newDoc];
      });

      setActiveAlert(null);
      return true;
    },
    [stagedDocuments]
  );

  const removeStagedDocument = useCallback((id: string) => {
    setStagedDocuments((prev) => {
      const doc = prev.find((d) => d.id === id);
      if (doc?.previewUrl) {
        URL.revokeObjectURL(doc.previewUrl);
      }
      return prev.filter((d) => d.id !== id);
    });
  }, []);

  const replaceStagedDocument = useCallback(
    (id: string, newFile: File, newReference?: string): boolean => {
      const existing = stagedDocuments.find((d) => d.id === id);
      if (!existing) return false;

      removeStagedDocument(id);
      return addStagedDocument(existing.categoryCode, newReference ?? existing.issuingReference, newFile);
    },
    [stagedDocuments, removeStagedDocument, addStagedDocument]
  );

  const clearAlert = useCallback(() => {
    setActiveAlert(null);
  }, []);

  const goToNextStep = useCallback((): boolean => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return true;
      }
      return false;
    }
    return true;
  }, [currentStep, validateStep1]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as IntakeStepIndex);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  const resetIntake = useCallback(() => {
    stagedDocuments.forEach((doc) => {
      if (doc.previewUrl) URL.revokeObjectURL(doc.previewUrl);
    });
    setStagedDocuments([]);
    setInstitutionDetails(initialStep1Data);
    setFormErrors({});
    setActiveAlert(null);
    setCurrentStep(1);
    try {
      sessionStorage.removeItem(STORAGE_KEY_STEP1);
    } catch {
      // Ignore
    }
  }, [stagedDocuments]);

  const value = useMemo(
    () => ({
      currentStep,
      setCurrentStep,
      goToNextStep,
      goToPreviousStep,
      institutionDetails,
      updateInstitutionDetails,
      formErrors,
      validateStep1,
      clearFieldError,
      stagedDocuments,
      addStagedDocument,
      removeStagedDocument,
      replaceStagedDocument,
      activeAlert,
      clearAlert,
      setActiveAlert,
      requiredCategories,
      missingRequiredCategories,
      isStep2Valid,
      resetIntake,
    }),
    [
      currentStep,
      goToNextStep,
      goToPreviousStep,
      institutionDetails,
      updateInstitutionDetails,
      formErrors,
      validateStep1,
      clearFieldError,
      stagedDocuments,
      addStagedDocument,
      removeStagedDocument,
      replaceStagedDocument,
      activeAlert,
      clearAlert,
      requiredCategories,
      missingRequiredCategories,
      isStep2Valid,
      resetIntake,
    ]
  );

  return <IntakeContext.Provider value={value}>{children}</IntakeContext.Provider>;
};
