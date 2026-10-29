import React, { useState, useEffect, useMemo } from "react";
import type {
  StagedDocument,
  DocumentReviewSubmission,
  BackendScrutinyReport,
  OfficerFieldCorrection,
} from "../types/intake.types";
import { EXPECTED_DOCUMENT_FIELDS } from "../constants/expected-document-fields";
import type { DocumentValidationBadge } from "../utils/validation-state";
import { Button } from "../../../shared/ui/button";

interface DocumentReviewModalProps {
  document: StagedDocument | null;
  isOpen: boolean;
  onClose: () => void;
  validationBadge?: DocumentValidationBadge;
  isReadOnly?: boolean;
  onSaveReview: (
    submission: DocumentReviewSubmission
  ) => Promise<{ success: boolean; scrutinyReport?: BackendScrutinyReport | null; error?: string }>;
}

type FieldStateOption = "PRESENT" | "NOT_FOUND" | "ILLEGIBLE" | "AMBIGUOUS" | "NOT_APPLICABLE";

interface FieldFormState {
  state: FieldStateOption;
  value: string | number | boolean | null;
  rawText: string;
  pageNumber: number | null;
  notes: string;
  isModified: boolean;
}

interface RawFieldItem {
  state?: string;
  value?: unknown;
  rawText?: string | null;
  pageNumber?: number | null;
}

interface DialogContentProps {
  document: StagedDocument;
  onClose: () => void;
  validationBadge?: DocumentValidationBadge;
  isReadOnly?: boolean;
  onSaveReview: (
    submission: DocumentReviewSubmission
  ) => Promise<{ success: boolean; scrutinyReport?: BackendScrutinyReport | null; error?: string }>;
}

const DocumentReviewContent: React.FC<DialogContentProps> = ({
  document,
  onClose,
  validationBadge,
  isReadOnly = false,
  onSaveReview,
}) => {
  const expectedFields = useMemo(() => {
    return EXPECTED_DOCUMENT_FIELDS[document.categoryCode] || [];
  }, [document.categoryCode]);

  // Original VLM typed block
  const originalBlockData = useMemo<Record<string, RawFieldItem>>(() => {
    if (!document.extractionData?.rawOutput) return {};
    const raw = document.extractionData.rawOutput as Record<string, Record<string, RawFieldItem>>;
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
    const blockKey = blockMap[document.categoryCode];
    if (blockKey && raw[blockKey]) return raw[blockKey];
    return raw as unknown as Record<string, RawFieldItem>;
  }, [document]);

  // Existing officer review & validation
  const existingReview = document.extractionData?.officerReview || null;
  const existingValidation = document.extractionData?.officerValidation || null;

  // Initialize initial state directly without calling setState in an effect
  const [selectedStatus, setSelectedStatus] = useState<
    "PASS" | "DEFICIENCY" | "MANUAL_APPROVAL" | "RESET"
  >(() => {
    if (existingValidation?.status) return existingValidation.status;
    if (validationBadge?.outcome === "DEFICIENCY") return "DEFICIENCY";
    if (validationBadge?.outcome === "MANUAL_APPROVAL") return "MANUAL_APPROVAL";
    return "PASS";
  });

  const [generalNotes, setGeneralNotes] = useState<string>(
    () => existingValidation?.notes || ""
  );

  const [fieldForms, setFieldForms] = useState<Record<string, FieldFormState>>(() => {
    const initialForms: Record<string, FieldFormState> = {};
    const fieldsInEnvelope = document.extractionData?.fields || {};

    for (const def of expectedFields) {
      const origField = originalBlockData[def.key] || {};
      const officerField = existingReview?.fields?.[def.key];
      const extractedField = fieldsInEnvelope[def.key];

      let state: FieldStateOption = "PRESENT";
      if (officerField?.state) {
        state = officerField.state;
      } else if (origField?.state) {
        state = origField.state as FieldStateOption;
      } else if (extractedField?.backendState) {
        state = extractedField.backendState as FieldStateOption;
      } else if (extractedField?.state === "absent") {
        state = "NOT_FOUND";
      } else if (extractedField?.state === "uncertain") {
        state = "AMBIGUOUS";
      }

      let val: string | number | boolean | null = null;
      if (officerField?.value !== undefined) {
        val = officerField.value as string | number | boolean | null;
      } else if (origField?.value !== undefined) {
        val = origField.value as string | number | boolean | null;
      } else if (extractedField?.value !== undefined) {
        val = extractedField.value as string | number | boolean | null;
      }

      if (val === null || val === undefined) {
        if (def.type === "boolean") val = false;
        else if (def.type === "number") val = "";
        else val = "";
      }

      const rawText =
        officerField?.rawText ??
        origField?.rawText ??
        (val !== "" && val !== null ? String(val) : "");
      const pageNumber = officerField?.pageNumber ?? origField?.pageNumber ?? null;
      const notes = officerField?.notes ?? "";

      initialForms[def.key] = {
        state,
        value: val,
        rawText,
        pageNumber,
        notes,
        isModified: Boolean(officerField),
      };
    }
    return initialForms;
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
    details?: string;
  } | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isSubmitting]);

  const isPdf =
    document.mimeType === "application/pdf" || document.fileName.toLowerCase().endsWith(".pdf");
  const isImage =
    document.mimeType.startsWith("image/") || /\.(png|jpe?g)$/i.test(document.fileName);

  const handleFieldChange = (key: string, updates: Partial<FieldFormState>) => {
    setFieldForms((prev) => {
      const current = prev[key];
      if (!current) return prev;
      return {
        ...prev,
        [key]: {
          ...current,
          ...updates,
          isModified: true,
        },
      };
    });
  };

  const handleSaveReview = async () => {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const fieldCorrections: Record<string, OfficerFieldCorrection> = {};

      for (const [key, form] of Object.entries(fieldForms)) {
        if (form.isModified) {
          let parsedVal: string | number | boolean | null = form.value;
          const def = expectedFields.find((f) => f.key === key);

          if (form.state !== "PRESENT") {
            parsedVal = null;
          } else if (def?.type === "number") {
            parsedVal = form.value === "" || form.value === null ? null : Number(form.value);
          } else if (def?.type === "boolean") {
            parsedVal = Boolean(form.value);
          } else {
            parsedVal = typeof form.value === "string" ? form.value.trim() : form.value;
          }

          fieldCorrections[key] = {
            state: form.state,
            value: parsedVal,
            rawText:
              form.rawText.trim() || (parsedVal !== null ? String(parsedVal) : null),
            pageNumber: form.pageNumber,
            notes: form.notes ? form.notes.trim() : undefined,
          };
        }
      }

      const submission: DocumentReviewSubmission = {
        status: selectedStatus,
        notes: generalNotes.trim() || undefined,
        fieldCorrections: Object.keys(fieldCorrections).length > 0 ? fieldCorrections : undefined,
      };

      const result = await onSaveReview(submission);

      if (result.success) {
        setFeedback({
          type: "success",
          message: "Document review & evidence corrections saved successfully.",
          details: result.scrutinyReport
            ? `Scrutiny re-evaluated: ${result.scrutinyReport.overallStatus.replace(/_/g, " ")} (${result.scrutinyReport.passedCount} passed, ${result.scrutinyReport.deficiencyCount} deficiencies).`
            : "Scrutiny re-evaluation triggered.",
        });
      } else {
        setFeedback({
          type: "error",
          message:
            result.error || "Failed to persist document review. Please check officer authorization.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setFeedback({
        type: "error",
        message: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const modifiedCount = Object.values(fieldForms).filter((f) => f.isModified).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-2 sm:p-4">
      <div className="bg-white border border-[#D7DEDA] rounded-[3px] shadow-2xl max-w-7xl w-full h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-[#D7DEDA] flex items-center justify-between bg-[#FAFAF8] shrink-0">
          <div>
            <div className="text-[10px] font-mono tracking-wider uppercase text-[#165A60] font-semibold flex items-center gap-2">
              <span>OFFICER EVIDENCE REVIEW &amp; CORRECTION</span>
              <span className="text-[#8A9B9D]">·</span>
              <span className="bg-[#EBEAE5] text-[#172E33] px-1.5 py-0.2 rounded font-mono">
                {document.categoryCode}
              </span>
            </div>
            <h3 className="text-base font-bold text-[#172E33] m-0 mt-0.5">
              {document.categoryLabel}
            </h3>
            <div className="text-[11px] font-mono text-[#5C6F73] mt-0.5 flex items-center gap-2">
              <span className="font-semibold text-[#172E33]">{document.fileName}</span>
              <span>·</span>
              <span>{document.formattedSize}</span>
              <span>·</span>
              <span>Ref: {document.issuingReference}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-[#8A9B9D] hover:text-[#172E33] text-xl font-bold p-1 rounded transition-colors disabled:opacity-50"
            title="Close review"
          >
            ✕
          </button>
        </div>

        {/* Split View Content Body: Left Preview (6 cols), Right Review Form (6 cols) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          {/* Left Panel: Document Preview (6 cols) */}
          <div className="lg:col-span-6 flex flex-col h-full bg-[#323639] border-r border-[#D7DEDA] overflow-hidden">
            <div className="px-4 py-2 bg-[#26282A] border-b border-[#444] text-[11px] font-mono text-neutral-300 flex items-center justify-between">
              <span>SOURCE EVIDENCE VIEWER · {document.formatExtension}</span>
              <span className="text-neutral-400 text-[10px]">
                Compare evidence seals &amp; clauses directly
              </span>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center p-2 bg-[#525659]">
              {isPdf && document.previewUrl ? (
                <iframe
                  src={document.previewUrl}
                  title={document.fileName}
                  className="w-full h-full border-0 bg-white shadow-md rounded-[2px]"
                />
              ) : isImage && document.previewUrl ? (
                <div className="max-h-full overflow-auto flex items-center justify-center p-2 bg-white rounded-[2px] shadow-md">
                  <img
                    src={document.previewUrl}
                    alt={document.fileName}
                    className="max-h-[80vh] max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="text-center p-8 bg-white border border-[#D7DEDA] rounded-[3px] max-w-md shadow-md">
                  <div className="text-4xl mb-2">📄</div>
                  <h4 className="text-sm font-bold text-[#172E33]">{document.fileName}</h4>
                  <p className="text-xs text-[#5C6F73] mt-1">
                    Staged evidence file ({document.formattedSize}).
                  </p>
                  <div className="mt-4 p-3 bg-[#FAFAF8] text-[11px] font-mono text-left rounded border border-[#D7DEDA]">
                    <div>Category: {document.categoryCode}</div>
                    <div>Reference: {document.issuingReference}</div>
                    <div>Status: {document.processingNote}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Officer Regulatory Review & Schema Corrections Form (6 cols) */}
          <div className="lg:col-span-6 flex flex-col h-full bg-[#FAFAF8] overflow-hidden">
            <div className="px-5 py-2.5 bg-[#F6F5F0] border-b border-[#D7DEDA] flex items-center justify-between shrink-0">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#172E33] font-bold">
                OFFICER REVIEW &amp; EVIDENCE CORRECTIONS
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#EBEAE5] text-[#172E33]">
                {modifiedCount} field{modifiedCount === 1 ? "" : "s"} modified
              </span>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Ministry Oversight Read-Only Notice */}
              {isReadOnly && (
                <div className="p-3 bg-[#EAEFEF] border border-[#165A60]/30 rounded-[2px] text-[#165A60] text-[12px] leading-relaxed">
                  <strong>Ministry Oversight Mode:</strong> You are inspecting source document evidence in read-only mode. All original extractions and officer reviews are visible. Document modifications and validation status changes are restricted to assigned processing officers.
                </div>
              )}

              {/* Section 1: Regulatory Document Status Decision */}
              <div className="bg-white border border-[#D7DEDA] rounded-[2px] p-4 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[12px] font-bold text-[#172E33] uppercase font-mono tracking-wider">
                    1. Regulatory Document Status *
                  </label>
                  {validationBadge && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${validationBadge.bgClass}`}
                    >
                      {validationBadge.text}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => setSelectedStatus("PASS")}
                    className={`text-[12px] font-medium py-2 px-2.5 rounded-[2px] border transition-colors text-center disabled:opacity-60 disabled:cursor-not-allowed ${
                      selectedStatus === "PASS"
                        ? "bg-[#EAF3EE] text-[#245E3F] border-[#245E3F] font-bold shadow-xs"
                        : "bg-white text-[#172E33] border-[#D7DEDA] hover:bg-[#F4F6F5]"
                    }`}
                  >
                    ✓ Pass / Compliant
                  </button>
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => setSelectedStatus("DEFICIENCY")}
                    className={`text-[12px] font-medium py-2 px-2.5 rounded-[2px] border transition-colors text-center disabled:opacity-60 disabled:cursor-not-allowed ${
                      selectedStatus === "DEFICIENCY"
                        ? "bg-[#FDF2F2] text-[#9E2A2B] border-[#9E2A2B] font-bold shadow-xs"
                        : "bg-white text-[#172E33] border-[#D7DEDA] hover:bg-[#FDF6F6]"
                    }`}
                  >
                    ! Flag Deficiency
                  </button>
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => setSelectedStatus("MANUAL_APPROVAL")}
                    className={`text-[12px] font-medium py-2 px-2.5 rounded-[2px] border transition-colors text-center disabled:opacity-60 disabled:cursor-not-allowed ${
                      selectedStatus === "MANUAL_APPROVAL"
                        ? "bg-[#FFF9E6] text-[#8D6B00] border-[#8D6B00] font-bold shadow-xs"
                        : "bg-white text-[#172E33] border-[#D7DEDA] hover:bg-[#FFFDF5]"
                    }`}
                  >
                    △ Retain Review
                  </button>
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => setSelectedStatus("RESET")}
                    className={`text-[12px] font-medium py-2 px-2.5 rounded-[2px] border transition-colors text-center disabled:opacity-60 disabled:cursor-not-allowed ${
                      selectedStatus === "RESET"
                        ? "bg-[#EBEAE5] text-[#172E33] border-[#172E33] font-bold shadow-xs"
                        : "bg-white text-[#5C6F73] border-[#D7DEDA] hover:bg-[#F6F5F0]"
                    }`}
                  >
                    ↺ Reset Computed
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#5C6F73] mb-1">
                    Regulatory Finding &amp; Decision Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={generalNotes}
                    disabled={isReadOnly}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    placeholder="Provide regulatory justification, evidence citations, or inspection findings..."
                    className="w-full text-[12px] bg-white border border-[#D7DEDA] rounded-[2px] p-2 text-[#172E33] placeholder-[#8A9B9D] focus:outline-none focus:border-[#165A60] disabled:bg-[#F6F5F0] disabled:text-[#5C6F73]"
                  />
                </div>
              </div>

              {/* Section 2: Statutory Schema Fields & Evidence Corrections */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-[12px] font-bold text-[#172E33] uppercase font-mono tracking-wider m-0">
                    2. Statutory Schema Fields &amp; Evidence Corrections
                  </h4>
                  <p className="text-[11px] text-[#5C6F73] mt-0.5 mb-0">
                    Correct any OCR or classification errors. The compliance engine consumes these effective reviewed values.
                  </p>
                </div>

                {expectedFields.length === 0 ? (
                  <div className="p-4 bg-white border border-[#D7DEDA] rounded-[2px] text-center text-[#8A9B9D] text-[12px]">
                    No specific schema fields mapped for this category.
                  </div>
                ) : (
                  expectedFields.map((fieldDef) => {
                    const formState = fieldForms[fieldDef.key] || {
                      state: "PRESENT",
                      value: "",
                      rawText: "",
                      pageNumber: null,
                      notes: "",
                      isModified: false,
                    };

                    const origVlm = originalBlockData[fieldDef.key] || {};
                    const hasOriginal = Boolean(origVlm.state || origVlm.value !== undefined);

                    return (
                      <div
                        key={fieldDef.key}
                        className={`bg-white border rounded-[2px] p-3.5 shadow-xs transition-colors ${
                          formState.isModified
                            ? "border-[#165A60]/40 bg-[#F8FBFA]"
                            : "border-[#D7DEDA]"
                        }`}
                      >
                        {/* Field Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[13px] font-semibold text-[#172E33]">
                                {fieldDef.label}
                              </span>
                              <span className="text-[10px] font-mono text-[#5C6F73] bg-[#EBEAE5] px-1 py-0.2 rounded">
                                {fieldDef.key}
                              </span>
                              {fieldDef.isCrucialForScrutiny && (
                                <span className="text-[9px] font-mono uppercase bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA] px-1.5 py-0.2 rounded font-bold">
                                  Crucial
                                </span>
                              )}
                              {formState.isModified && (
                                <span className="text-[9px] font-mono uppercase bg-[#EAF3EE] text-[#245E3F] border border-[#C8E6C9] px-1.5 py-0.2 rounded font-semibold">
                                  Reviewed
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#5C6F73] mt-0.5">
                              {fieldDef.description}
                            </div>
                          </div>
                        </div>

                        {/* Original VLM Extraction Reference Strip */}
                        {hasOriginal && (
                          <div className="text-[10px] font-mono text-[#5C6F73] bg-[#F6F5F0] p-1.5 rounded-[2px] border border-[#EBEAE5] mb-2.5 flex items-center justify-between">
                            <span>
                              <strong>VLM Returned:</strong> {origVlm.state || "NOT_FOUND"} · &ldquo;
                              {origVlm.rawText || (origVlm.value !== null && origVlm.value !== undefined ? String(origVlm.value) : "None")}
                              &rdquo;
                            </span>
                            {origVlm.pageNumber && <span>p. {origVlm.pageNumber}</span>}
                          </div>
                        )}

                        {/* Controls Grid: State Selector & Effective Value Input */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-start">
                          {/* State Selector */}
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] font-mono uppercase text-[#5C6F73] mb-1">
                              Evidence State
                            </label>
                            <select
                              value={formState.state}
                              disabled={isReadOnly}
                              onChange={(e) =>
                                handleFieldChange(fieldDef.key, {
                                  state: e.target.value as FieldStateOption,
                                })
                              }
                              className="w-full text-[11px] font-mono bg-white border border-[#D7DEDA] rounded-[2px] px-2 py-1.5 text-[#172E33] focus:outline-none focus:border-[#165A60] disabled:bg-[#F6F5F0] disabled:text-[#5C6F73]"
                            >
                              <option value="PRESENT">PRESENT (Confirmed)</option>
                              <option value="NOT_FOUND">NOT_FOUND (Missing)</option>
                              <option value="ILLEGIBLE">ILLEGIBLE (Unclear)</option>
                              <option value="AMBIGUOUS">AMBIGUOUS (Conflicting)</option>
                              <option value="NOT_APPLICABLE">NOT_APPLICABLE (N/A)</option>
                            </select>
                          </div>

                          {/* Effective Corrected Value Input */}
                          <div className="sm:col-span-8">
                            <label className="block text-[10px] font-mono uppercase text-[#5C6F73] mb-1">
                              Effective Value ({fieldDef.type})
                            </label>
                            {formState.state !== "PRESENT" ? (
                              <div className="text-[11px] font-mono text-[#8A9B9D] bg-neutral-50 border border-dashed border-[#D7DEDA] rounded-[2px] px-2 py-1.5">
                                [No confirmed value · Marked as {formState.state}]
                              </div>
                            ) : fieldDef.type === "boolean" ? (
                              <div className="flex items-center gap-3 py-1">
                                <label className="inline-flex items-center gap-1.5 text-[12px] text-[#172E33] cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`bool_${fieldDef.key}`}
                                    disabled={isReadOnly}
                                    checked={Boolean(formState.value) === true}
                                    onChange={() => handleFieldChange(fieldDef.key, { value: true })}
                                    className="accent-[#165A60]"
                                  />
                                  <span>Yes / Compliant</span>
                                </label>
                                <label className="inline-flex items-center gap-1.5 text-[12px] text-[#172E33] cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`bool_${fieldDef.key}`}
                                    disabled={isReadOnly}
                                    checked={Boolean(formState.value) === false}
                                    onChange={() => handleFieldChange(fieldDef.key, { value: false })}
                                    className="accent-[#165A60]"
                                  />
                                  <span>No / Absent</span>
                                </label>
                              </div>
                            ) : fieldDef.type === "number" ? (
                              <input
                                type="number"
                                step="any"
                                disabled={isReadOnly}
                                value={formState.value !== null && formState.value !== undefined ? String(formState.value) : ""}
                                onChange={(e) => handleFieldChange(fieldDef.key, { value: e.target.value })}
                                placeholder="e.g. 5.5"
                                className="w-full text-[12px] font-mono bg-white border border-[#D7DEDA] rounded-[2px] px-2.5 py-1 text-[#172E33] focus:outline-none focus:border-[#165A60] disabled:bg-[#F6F5F0] disabled:text-[#5C6F73]"
                              />
                            ) : fieldDef.type === "date" ? (
                              <input
                                type="date"
                                disabled={isReadOnly}
                                value={formState.value !== null && formState.value !== undefined ? String(formState.value) : ""}
                                onChange={(e) => handleFieldChange(fieldDef.key, { value: e.target.value })}
                                className="w-full text-[12px] font-mono bg-white border border-[#D7DEDA] rounded-[2px] px-2.5 py-1 text-[#172E33] focus:outline-none focus:border-[#165A60] disabled:bg-[#F6F5F0] disabled:text-[#5C6F73]"
                              />
                            ) : (
                              <input
                                type="text"
                                disabled={isReadOnly}
                                value={formState.value !== null && formState.value !== undefined ? String(formState.value) : ""}
                                onChange={(e) => handleFieldChange(fieldDef.key, { value: e.target.value })}
                                placeholder={`Enter verified ${fieldDef.label.toLowerCase()}...`}
                                className="w-full text-[12px] bg-white border border-[#D7DEDA] rounded-[2px] px-2.5 py-1 text-[#172E33] focus:outline-none focus:border-[#165A60] disabled:bg-[#F6F5F0] disabled:text-[#5C6F73]"
                              />
                            )}
                          </div>
                        </div>

                        {/* Optional Citation & Notes */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mt-2">
                          <div className="sm:col-span-3">
                            <input
                              type="number"
                              min={1}
                              disabled={isReadOnly}
                              value={formState.pageNumber ?? ""}
                              onChange={(e) =>
                                handleFieldChange(fieldDef.key, {
                                  pageNumber: e.target.value ? parseInt(e.target.value, 10) : null,
                                })
                              }
                              placeholder="Page #"
                              className="w-full text-[11px] font-mono bg-white border border-[#D7DEDA] rounded-[2px] px-2 py-1 text-[#172E33] focus:outline-none focus:border-[#165A60] disabled:bg-[#F6F5F0] disabled:text-[#5C6F73]"
                              title="Source page number where verified"
                            />
                          </div>
                          <div className="sm:col-span-9">
                            <input
                              type="text"
                              disabled={isReadOnly}
                              value={formState.notes}
                              onChange={(e) => handleFieldChange(fieldDef.key, { notes: e.target.value })}
                              placeholder="Officer inspection note (e.g. verified registrar seal)..."
                              className="w-full text-[11px] bg-white border border-[#D7DEDA] rounded-[2px] px-2 py-1 text-[#172E33] placeholder-[#8A9B9D] focus:outline-none focus:border-[#165A60] disabled:bg-[#F6F5F0] disabled:text-[#5C6F73]"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Feedback Banner */}
            {feedback && (
              <div
                className={`px-5 py-2.5 text-[12px] border-t shrink-0 ${
                  feedback.type === "success"
                    ? "bg-[#EAF3EE] text-[#245E3F] border-[#C8E6C9]"
                    : "bg-[#FDF2F2] text-[#9E2A2B] border-[#E8C5C5]"
                }`}
              >
                <div className="font-bold">{feedback.message}</div>
                {feedback.details && <div className="text-[11px] mt-0.5">{feedback.details}</div>}
              </div>
            )}

            {/* Right Panel Footer */}
            <div className="px-5 py-3 border-t border-[#D7DEDA] bg-white flex items-center justify-between shrink-0">
              <span className="text-[11px] text-[#5C6F73]">
                {isReadOnly
                  ? "Ministry Oversight: Read-only inspection of source document and evidence findings."
                  : "Decisions & field corrections are logged in the regulatory audit trail."}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="text-[12px] font-medium px-3.5 py-1.5 border-[#D7DEDA] text-[#172E33] rounded-[3px]"
                >
                  Close
                </Button>
                {!isReadOnly && (
                  <Button
                    type="button"
                    onClick={handleSaveReview}
                    disabled={isSubmitting}
                    className="bg-[#165A60] hover:bg-[#122B30] text-white text-[12px] font-medium px-4 py-1.5 rounded-[3px] inline-flex items-center gap-1.5 shadow-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="inline-block animate-spin mr-1">◌</span>
                        Saving &amp; Re-evaluating...
                      </>
                    ) : (
                      "Save review & re-evaluate →"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DocumentReviewModal: React.FC<DocumentReviewModalProps> = ({
  document,
  isOpen,
  onClose,
  validationBadge,
  isReadOnly,
  onSaveReview,
}) => {
  if (!isOpen || !document) return null;

  return (
    <DocumentReviewContent
      key={`${document.id}-${document.extractionData?.officerReview?.reviewedAt || "unreviewed"}`}
      document={document}
      onClose={onClose}
      validationBadge={validationBadge}
      isReadOnly={isReadOnly}
      onSaveReview={onSaveReview}
    />
  );
};
