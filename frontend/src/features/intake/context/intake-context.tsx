import React, { useState, useEffect, useCallback, useMemo } from "react";
import type {
  InstitutionDetailsFormData,
  StagedDocument,
  IntakeAlertNotice,
  IntakeStepIndex,
  BackendCreatedApplication,
  BackendScrutinyReport,
} from "../types/intake.types";
import {
  STATUTORY_DOCUMENT_CATEGORIES,
} from "../constants/statutory-documents";
import { IntakeContext } from "./intake-context-def";
import { apiClient } from "../../../shared/api/client";

const FIELD_ALIASES: Record<string, string[]> = {
  applicantLegalName: ["trustSocietyName"],
  trustSocietyName: ["applicantLegalName"],
  resolutionReferenceNumber: ["resolutionNumber"],
  resolutionNumber: ["resolutionReferenceNumber"],
  deedType: ["documentType"],
  documentType: ["deedType"],
  transfereeLesseeName: ["buyerTransferee"],
  buyerTransferee: ["transfereeLesseeName"],
  transferorLessorName: ["sellerTransferor"],
  sellerTransferor: ["transferorLessorName"],
  deedRegistrationNumber: ["registrationNumber"],
  registrationNumber: ["deedRegistrationNumber"],
  khasraSurveyPlotNumbers: ["khasraNumbers"],
  khasraNumbers: ["khasraSurveyPlotNumbers", "khasraSurveyNumbersShown"],
  parcelArea: ["landAreaAcres"],
  landAreaAcres: ["parcelArea"],
  orderReferenceNumber: ["orderNumber"],
  orderNumber: ["orderReferenceNumber"],
  orderDate: ["issueDate"],
  issueDate: ["orderDate", "sanctionDate", "certificateDate", "reviewDate"],
  landownerApplicantName: ["applicantName"],
  applicantName: ["landownerApplicantName"],
  permittedLandUse: ["permittedUse"],
  permittedUse: ["permittedLandUse"],
  approvingAuthority: ["sanctioningAuthority"],
  sanctioningAuthority: ["approvingAuthority"],
  sanctionOrderReference: ["sanctionNumber"],
  sanctionNumber: ["sanctionOrderReference"],
  architectCoaRegistrationNumber: ["architectCoaRegistration"],
  architectCoaRegistration: ["architectCoaRegistrationNumber"],
  totalSanctionedBuiltUpArea: ["totalBuiltUpAreaSqm"],
  totalBuiltUpAreaSqm: ["totalSanctionedBuiltUpArea"],
  statedFarFsi: ["farFsi"],
  farFsi: ["statedFarFsi"],
  certificateReferenceNumber: ["certificateNumber"],
  certificateNumber: ["certificateReferenceNumber"],
  certificateType: ["occupancyType"],
  occupancyType: ["certificateType"],
  coveredBuildingsFloors: ["buildingDetails"],
  buildingDetails: ["coveredBuildingsFloors"],
  issuingEngineerName: ["engineerName"],
  engineerName: ["issuingEngineerName"],
  engineerQualification: ["engineerQualifications"],
  engineerQualifications: ["engineerQualification"],
  structuralFitnessConclusion: ["stabilityStatus"],
  stabilityStatus: ["structuralFitnessConclusion"],
  accountOrFdrNumber: ["fdrNumber"],
  fdrNumber: ["accountOrFdrNumber"],
  isStatedUnencumbered: ["isUnencumbered"],
  isUnencumbered: ["isStatedUnencumbered"],
  sponsoringBodyName: ["trustSocietyName"],
};

function extractFieldsFromEnvelope(extractedData: unknown, categoryCode: string): Record<string, {
  state: "present" | "absent" | "uncertain";
  backendState?: string;
  value: unknown;
  rawText?: string;
  pageNumber?: number;
  excerpt?: string;
  uncertaintyReason?: string;
}> {
  if (!extractedData || typeof extractedData !== "object") return {};
  const data = extractedData as Record<string, unknown>;

  const blockMap: Record<string, string> = {
    DOC_01_REGISTRATION: "doc01Registration",
    DOC_02_RESOLUTION: "doc02Resolution",
    DOC_03_LAND_DEED: "doc03LandDeed",
    DOC_04_LEASE_AFFIDAVIT: "doc04LeaseAffidavit",
    DOC_05_LAND_USE: "doc05LandUse",
    DOC_06_BUILDING_PLAN: "doc06BuildingPlan",
    DOC_07_OCCUPANCY: "doc07Occupancy",
    DOC_08_STRUCTURAL_STABILITY: "doc08StructuralStability",
    DOC_09_FIRE_SAFETY: "doc09FireSafety",
    DOC_10_BANK_FUNDS: "doc10BankFunds",
    DOC_11_AFFIDAVIT_2: "doc11Affidavit2",
    DOC_14_SITE_MAP: "doc14SiteMap",
  };

  const blockKey = blockMap[categoryCode];
  const block = (blockKey && data[blockKey]) ? (data[blockKey] as Record<string, unknown>) : data;

  const result: Record<string, {
    state: "present" | "absent" | "uncertain";
    backendState?: string;
    value: unknown;
    rawText?: string;
    pageNumber?: number;
    excerpt?: string;
    uncertaintyReason?: string;
  }> = {};

  for (const [key, fieldVal] of Object.entries(block)) {
    if (fieldVal && typeof fieldVal === "object" && "state" in fieldVal) {
      const f = fieldVal as {
        state?: string;
        value?: unknown;
        rawText?: string | null;
        pageNumber?: number | null;
        excerpt?: string | null;
        uncertaintyReason?: string | null;
      };
      const isPresent = f.state === "PRESENT";
      const isUncertain = f.state === "ILLEGIBLE" || f.state === "AMBIGUOUS";
      const entry = {
        state: isPresent ? "present" as const : isUncertain ? "uncertain" as const : "absent" as const,
        backendState: f.state,
        value: f.value,
        rawText: f.rawText ?? undefined,
        pageNumber: f.pageNumber ?? undefined,
        excerpt: f.excerpt ?? undefined,
        uncertaintyReason: f.uncertaintyReason ?? undefined,
      };

      result[key] = entry;

      const aliases = FIELD_ALIASES[key];
      if (aliases) {
        for (const alias of aliases) {
          if (!result[alias]) {
            result[alias] = entry;
          }
        }
      }
    }
  }

  return result;
}

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

  const [createdApplication, setCreatedApplication] = useState<BackendCreatedApplication | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [scrutinyError, setScrutinyError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isEvaluatingScrutiny, setIsEvaluatingScrutiny] = useState<boolean>(false);
  const [latestScrutinyReport, setLatestScrutinyReport] = useState<BackendScrutinyReport | null>(null);

  const submitApplication = useCallback(async (): Promise<boolean> => {
    if (stagedDocuments.length === 0) {
      setActiveAlert({
        type: "UPLOAD_ERROR",
        title: "No Documents Staged",
        message: "Please add statutory documents before uploading the application.",
      });
      return false;
    }

    setIsUploading(true);
    setUploadError(null);
    setActiveAlert(null);

    try {
      const formData = new FormData();
      formData.append("institutionName", institutionDetails.institutionName.trim());
      formData.append("applicationNumber", institutionDetails.applicationNumber.trim());
      if (institutionDetails.programCategory) {
        formData.append("programCategory", institutionDetails.programCategory.trim());
      }
      if (institutionDetails.proposedIntake) {
        formData.append("proposedIntake", institutionDetails.proposedIntake.trim());
      }

      const documentTypes: string[] = [];
      stagedDocuments.forEach((doc) => {
        formData.append("documents", doc.file, doc.fileName);
        documentTypes.push(doc.categoryCode);
      });
      formData.append("documentTypes", JSON.stringify(documentTypes));

      const response = await apiClient<{
        success: boolean;
        extractionSuccess?: boolean;
        extractionError?: string | null;
        scrutinyReport?: BackendScrutinyReport | null;
        data: BackendCreatedApplication;
      }>("/api/applications", {
        method: "POST",
        body: formData,
      });

      if (response && response.success && response.data) {
        setCreatedApplication(response.data);
        setLatestScrutinyReport(response.scrutinyReport || response.data.scrutinyReports?.[0] || null);

        if (response.extractionSuccess === false) {
          setExtractionError(response.extractionError || "Batch VLM extraction failure. The model may be experiencing high demand.");
        } else {
          setExtractionError(null);
        }

        // Update stagedDocuments with real backend extraction statuses and envelope fields
        setStagedDocuments((prev) =>
          prev.map((doc, idx) => {
            const backendDoc = response.data.documents.find(
              (bd) => bd.originalName === doc.fileName || bd.documentType === doc.categoryCode
            ) || response.data.documents[idx];

            if (!backendDoc) return doc;

            const extractionStatus = (backendDoc.extractionStatus || "PENDING") as
              | "SUCCESS"
              | "FAILED"
              | "UNCERTAIN"
              | "PENDING";

            const processingState =
              extractionStatus === "SUCCESS"
                ? "SUCCESS"
                : extractionStatus === "UNCERTAIN"
                ? "UNCERTAIN"
                : extractionStatus === "FAILED"
                ? "FAILED"
                : "STAGED";

            const extractedFields = extractFieldsFromEnvelope(backendDoc.extractedData, doc.categoryCode);

            return {
              ...doc,
              processingState,
              processingNote: `Backend status: ${extractionStatus}`,
              extractionData: {
                status: extractionStatus,
                fields: Object.keys(extractedFields).length > 0 ? extractedFields : undefined,
                rawOutput: backendDoc.extractedData,
              },
            };
          })
        );

        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return true;
      } else {
        const errorMsg = "Application creation returned an unsuccessful response.";
        setUploadError(errorMsg);
        setActiveAlert({
          type: "UPLOAD_ERROR",
          title: "Upload Failed",
          message: errorMsg,
        });
        return false;
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string; status?: number };
      const errorMsg =
        errorObj.message ||
        "An unexpected error occurred while uploading the application. Please try again.";

      setUploadError(errorMsg);
      setActiveAlert({
        type: "UPLOAD_ERROR",
        title: errorObj.status === 409 ? "Application Number Conflict" : "Application Upload Error",
        message: errorMsg,
      });
      return false;
    } finally {
      setIsUploading(false);
    }
  }, [institutionDetails, stagedDocuments]);

  const runExtraction = useCallback(async (): Promise<boolean> => {
    if (!createdApplication?.id) {
      return false;
    }

    setIsExtracting(true);
    setExtractionError(null);

    try {
      const response = await apiClient<{
        success: boolean;
        extractionSuccess: boolean;
        extractionError?: string | null;
        scrutinyReport?: BackendScrutinyReport | null;
        data: BackendCreatedApplication;
      }>(`/api/applications/${createdApplication.id}/extract`, {
        method: "POST",
      });

      if (response && response.data) {
        setCreatedApplication(response.data);
        setLatestScrutinyReport(response.scrutinyReport || response.data.scrutinyReports?.[0] || null);

        if (!response.extractionSuccess) {
          setExtractionError(
            response.extractionError || "Extraction did not complete successfully. The model may be experiencing high demand."
          );
        } else {
          setExtractionError(null);
        }

        // Update staged documents with real extraction outcomes
        setStagedDocuments((prev) =>
          prev.map((doc, idx) => {
            const backendDoc = response.data.documents.find(
              (bd) => bd.originalName === doc.fileName || bd.documentType === doc.categoryCode
            ) || response.data.documents[idx];

            if (!backendDoc) return doc;

            const extractionStatus = (backendDoc.extractionStatus || "PENDING") as
              | "SUCCESS"
              | "FAILED"
              | "UNCERTAIN"
              | "PENDING";

            const processingState =
              extractionStatus === "SUCCESS"
                ? "SUCCESS"
                : extractionStatus === "UNCERTAIN"
                ? "UNCERTAIN"
                : extractionStatus === "FAILED"
                ? "FAILED"
                : "STAGED";

            const extractedFields = extractFieldsFromEnvelope(backendDoc.extractedData, doc.categoryCode);

            return {
              ...doc,
              processingState,
              processingNote: `Backend status: ${extractionStatus}`,
              extractionData: {
                status: extractionStatus,
                fields: Object.keys(extractedFields).length > 0 ? extractedFields : undefined,
                rawOutput: backendDoc.extractedData,
              },
            };
          })
        );

        return response.extractionSuccess;
      }
      return false;
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setExtractionError(errorObj.message || "Failed to run extraction. Please try again.");
      return false;
    } finally {
      setIsExtracting(false);
    }
  }, [createdApplication]);

  const runScrutiny = useCallback(async (): Promise<boolean> => {
    if (!createdApplication?.id) {
      return false;
    }

    setIsEvaluatingScrutiny(true);
    setScrutinyError(null);

    try {
      const response = await apiClient<{
        success: boolean;
        scrutinyReport?: BackendScrutinyReport | null;
        data: BackendCreatedApplication;
      }>(`/api/applications/${createdApplication.id}/scrutiny`, {
        method: "POST",
      });

      if (response && response.data) {
        setCreatedApplication(response.data);
        setLatestScrutinyReport(response.scrutinyReport || response.data.scrutinyReports?.[0] || null);
        setScrutinyError(null);
        return true;
      } else {
        setScrutinyError("Scrutiny evaluation did not succeed.");
        return false;
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setScrutinyError(errorObj.message || "Failed to evaluate scrutiny. Please try again.");
      return false;
    } finally {
      setIsEvaluatingScrutiny(false);
    }
  }, [createdApplication]);

  const resetIntake = useCallback(() => {
    stagedDocuments.forEach((doc) => {
      if (doc.previewUrl) URL.revokeObjectURL(doc.previewUrl);
    });
    setStagedDocuments([]);
    setInstitutionDetails(initialStep1Data);
    setFormErrors({});
    setActiveAlert(null);
    setCreatedApplication(null);
    setLatestScrutinyReport(null);
    setUploadError(null);
    setExtractionError(null);
    setScrutinyError(null);
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
      createdApplication,
      setCreatedApplication,
      isUploading,
      uploadError,
      submitApplication,
      extractionError,
      scrutinyError,
      isExtracting,
      isEvaluatingScrutiny,
      runExtraction,
      runScrutiny,
      latestScrutinyReport,
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
      createdApplication,
      isUploading,
      uploadError,
      submitApplication,
      extractionError,
      scrutinyError,
      isExtracting,
      isEvaluatingScrutiny,
      runExtraction,
      runScrutiny,
      latestScrutinyReport,
    ]
  );

  return <IntakeContext.Provider value={value}>{children}</IntakeContext.Provider>;
};
