import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIntake } from "../hooks/use-intake";
import { Button } from "../../../shared/ui/button";
import { STATUTORY_DOCUMENT_CATEGORIES } from "../constants/statutory-documents";
import { VlmExtractedFieldsDrawer } from "./vlm-extracted-fields-drawer";
import { DocumentPreviewModal } from "./document-preview-modal";
import { computeDocumentValidationOutcome } from "../utils/validation-state";
import type { StagedDocument } from "../types/intake.types";

interface ExtractionValidationStepProps {
  onProceedToReview: () => void;
}

export const ExtractionValidationStep: React.FC<ExtractionValidationStepProps> = ({
  onProceedToReview,
}) => {
  const navigate = useNavigate();
  const {
    setCurrentStep,
    goToPreviousStep,
    stagedDocuments,
    missingRequiredCategories,
    requiredCategories,
    institutionDetails,
    createdApplication,
    extractionError,
    scrutinyError,
    isExtracting,
    isEvaluatingScrutiny,
    runExtraction,
    runScrutiny,
    latestScrutinyReport,
    updateDocumentStatus,
    reviewDocumentEvidence,
    isScrutinyStale,
    isExistingApplicationMode,
  } = useIntake();

  // Drawer & Preview states
  const [selectedDrawerDoc, setSelectedDrawerDoc] = useState<StagedDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<StagedDocument | null>(null);

  // Status update tracking
  const [updatingDocId, setUpdatingDocId] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<{
    docId: string;
    success: boolean;
    message: string;
  } | null>(null);

  const handleStatusChange = async (
    doc: StagedDocument,
    newStatus: "PASS" | "DEFICIENCY" | "MANUAL_APPROVAL" | "RESET"
  ) => {
    const documentId =
      doc.backendDocId ||
      createdApplication?.documents.find(
        (bd) => bd.originalName === doc.fileName || bd.documentType === doc.categoryCode
      )?.id;

    if (!documentId) {
      setStatusFeedback({
        docId: doc.id,
        success: false,
        message: "Document not yet uploaded to server.",
      });
      return;
    }

    setUpdatingDocId(doc.id);
    setStatusFeedback(null);
    try {
      const ok = await updateDocumentStatus(documentId, newStatus);
      if (ok) {
        setStatusFeedback({
          docId: doc.id,
          success: true,
          message: `Saved as ${newStatus.replace("_", " ")}`,
        });
      } else {
        setStatusFeedback({
          docId: doc.id,
          success: false,
          message: "Failed to persist status change.",
        });
      }
    } catch {
      setStatusFeedback({
        docId: doc.id,
        success: false,
        message: "Status update error.",
      });
    } finally {
      setUpdatingDocId(null);
    }
  };

  // Focus document for right sidebar context (default to first staged doc)
  const [focusedDocId, setFocusedDocId] = useState<string | null>(
    stagedDocuments[0]?.id || null
  );

  const focusedDoc =
    stagedDocuments.find((d) => d.id === focusedDocId) || stagedDocuments[0] || null;

  const totalUploaded = stagedDocuments.length;
  const missingCount = missingRequiredCategories.length;
  const hasBlockingErrors = missingCount > 0;

  // Determine failure states
  const hasFailedDocs = stagedDocuments.some(
    (d) => d.processingState === "FAILED" || d.extractionData?.status === "FAILED"
  );

  const isExtractionFailed =
    Boolean(extractionError) ||
    createdApplication?.status === "EXTRACTION_FAILED" ||
    (createdApplication !== null && hasFailedDocs);

  const isScrutinyFailed =
    !isExtractionFailed &&
    (Boolean(scrutinyError) ||
      createdApplication?.status === "SCRUTINY_FAILED" ||
      (createdApplication !== null &&
        (!createdApplication.scrutinyReports || createdApplication.scrutinyReports.length === 0)));

  return (
    <div>
      {/* VLM Extracted Fields Slide-over Drawer (Right side) */}
      <VlmExtractedFieldsDrawer
        document={selectedDrawerDoc}
        isOpen={Boolean(selectedDrawerDoc)}
        onClose={() => setSelectedDrawerDoc(null)}
      />

      {/* Document In-Browser Preview & Officer Evidence Review Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
        validationBadge={
          previewDoc
            ? computeDocumentValidationOutcome(
                previewDoc,
                latestScrutinyReport || createdApplication?.scrutinyReports?.[0],
                isExtractionFailed
              )
            : undefined
        }
        onSaveReview={
          createdApplication
            ? async (submission) => {
                if (!previewDoc) return { success: false, error: "No document selected." };
                const documentId =
                  previewDoc.backendDocId ||
                  createdApplication?.documents.find(
                    (bd) =>
                      bd.originalName === previewDoc.fileName ||
                      bd.documentType === previewDoc.categoryCode
                  )?.id;
                if (!documentId) return { success: false, error: "Document ID not resolved." };
                return await reviewDocumentEvidence(documentId, submission);
              }
            : async () => ({ success: false, error: "Application not yet uploaded." })
        }
      />

      {/* Top Summary Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-[#D7DEDA] rounded-[2px] p-3.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#5C6F73]">
            STAGED EVIDENCE FILES
          </div>
          <div className="text-2xl font-bold text-[#172E33] mt-1 font-mono">
            {totalUploaded}
          </div>
          <div className="text-[11px] text-[#5C6F73] mt-0.5">
            Local memory buffers
          </div>
        </div>

        <div className="bg-white border border-[#D7DEDA] rounded-[2px] p-3.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#5C6F73]">
            MANDATORY CATEGORIES
          </div>
          <div className="text-2xl font-bold text-[#165A60] mt-1 font-mono">
            {requiredCategories.length - missingCount}&thinsp;/&thinsp;{requiredCategories.length}
          </div>
          <div className="text-[11px] text-[#5C6F73] mt-0.5">
            Statutory APH 2026–27
          </div>
        </div>

        <div className="bg-white border border-[#D7DEDA] rounded-[2px] p-3.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#5C6F73]">
            MISSING EVIDENCE
          </div>
          <div
            className={`text-2xl font-bold mt-1 font-mono ${
              missingCount > 0 ? "text-[#A14637]" : "text-[#245E3F]"
            }`}
          >
            {missingCount}
          </div>
          <div className="text-[11px] text-[#5C6F73] mt-0.5">
            {missingCount > 0 ? "Blocking submission" : "All mandatory staged"}
          </div>
        </div>

        <div className="bg-white border border-[#D7DEDA] rounded-[2px] p-3.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#5C6F73]">
            PIPELINE READINESS
          </div>
          <div
            className={`text-2xl font-bold mt-1 font-mono ${
              isExtractionFailed
                ? "text-[#A14637]"
                : isScrutinyFailed
                ? "text-[#8D6B00]"
                : hasBlockingErrors
                ? "text-[#A14637]"
                : "text-[#245E3F]"
            }`}
          >
            {isExtractionFailed
              ? "EXTRACTION FAILED"
              : isScrutinyFailed
              ? "SCRUTINY PENDING"
              : hasBlockingErrors
              ? "BLOCKED"
              : "READY"}
          </div>
          <div className="text-[11px] text-[#5C6F73] mt-0.5">
            {isExtractionFailed
              ? "Model high demand / error"
              : isScrutinyFailed
              ? "Awaiting statutory audit"
              : hasBlockingErrors
              ? "Missing required evidence"
              : "Ready for review & approve"}
          </div>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Document-Level Table & Blocking States (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Conditional Alert: Extraction Failed -> Run Extraction Button */}
          {isExtractionFailed && (
            <div className="bg-[#FDF2F2] border border-[#E8C5C5] rounded-[3px] p-4 text-[#9E2A2B] shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <h4 className="text-[14px] font-bold m-0 text-[#172E33]">
                      Multimodal VLM Extraction Incomplete
                    </h4>
                    <p className="text-[12px] text-[#5C6F73] mt-1 mb-0 leading-relaxed">
                      {extractionError ||
                        "The VLM extraction model experienced temporary high demand (HTTP 503) or an outage. Your documents are safely uploaded."}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={runExtraction}
                  disabled={isExtracting}
                  className="bg-[#165A60] hover:bg-[#122B30] text-white text-[13px] font-medium px-4 py-2 rounded-[3px] inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-sm transition-colors"
                >
                  {isExtracting ? (
                    <>
                      <span className="inline-block animate-spin mr-1">◌</span>
                      Running extraction...
                    </>
                  ) : (
                    "Run extraction"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Conditional Alert: Scrutiny Failed/Pending -> Run Scrutiny Button */}
          {isScrutinyFailed && (
            <div className="bg-[#FEF7EC] border border-[#FFE58F] rounded-[3px] p-4 text-[#8D6B00] shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">⚖️</span>
                  <div>
                    <h4 className="text-[14px] font-bold m-0 text-[#172E33]">
                      Deterministic Scrutiny Evaluation Pending
                    </h4>
                    <p className="text-[12px] text-[#5C6F73] mt-1 mb-0 leading-relaxed">
                      {scrutinyError ||
                        "Document feature extraction has succeeded, but automated compliance scrutiny evaluation has not yet been computed."}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={runScrutiny}
                  disabled={isEvaluatingScrutiny}
                  className="bg-[#165A60] hover:bg-[#122B30] text-white text-[13px] font-medium px-4 py-2 rounded-[3px] inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-sm transition-colors"
                >
                  {isEvaluatingScrutiny ? (
                    <>
                      <span className="inline-block animate-spin mr-1">◌</span>
                      Running scrutiny...
                    </>
                  ) : (
                    "Run scrutiny"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Conditional Alert: Scrutiny Out of Date due to Officer Review */}
          {isScrutinyStale && !isScrutinyFailed && !isExtractionFailed && (
            <div className="bg-[#FEF7EC] border border-[#FFE58F] rounded-[3px] p-4 text-[#8D6B00] shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <h4 className="text-[14px] font-bold m-0 text-[#172E33]">
                      Scrutiny Report Out of Date
                    </h4>
                    <p className="text-[12px] text-[#5C6F73] mt-1 mb-0 leading-relaxed">
                      Officer evidence review or correction has occurred since the last compliance scrutiny report.
                      Re-run scrutiny to compute fresh statutory findings with reviewed evidence.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={runScrutiny}
                  disabled={isEvaluatingScrutiny}
                  className="bg-[#165A60] hover:bg-[#122B30] text-white text-[13px] font-medium px-4 py-2 rounded-[3px] inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-sm transition-colors"
                >
                  {isEvaluatingScrutiny ? (
                    <>
                      <span className="inline-block animate-spin mr-1">◌</span>
                      Running scrutiny...
                    </>
                  ) : (
                    "Re-run scrutiny"
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="bg-white border border-[#D7DEDA] rounded-[2px] shadow-sm overflow-hidden">
            {/* Table Header Section */}
            <div className="px-5 py-4 border-b border-[#D7DEDA] bg-[#FAFAF8] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-[15px] font-bold text-[#172E33] m-0">
                  Document-level validation &amp; extraction findings
                </h3>
                <p className="text-[12px] text-[#5C6F73] mt-0.5 m-0">
                  Review uploaded statutory evidence, schema completeness, and preliminary validation status.
                </p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-[#EBEAE5] text-[#172E33] rounded-[2px] self-start sm:self-auto shrink-0">
                {totalUploaded} document{totalUploaded === 1 ? "" : "s"} staged
              </span>
            </div>

            {/* Document Findings Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#D7DEDA] bg-[#F6F5F0] text-[10px] font-mono tracking-wider text-[#5C6F73] uppercase">
                    <th className="py-2.5 px-4 font-semibold">Document &amp; Source File</th>
                    <th className="py-2.5 px-3 font-semibold">Code</th>
                    <th className="py-2.5 px-3 font-semibold">Extraction Status</th>
                    <th className="py-2.5 px-3 font-semibold">Validation State</th>
                    <th className="py-2.5 px-3 font-semibold">Status Control</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D7DEDA] text-[13px]">
                  {stagedDocuments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#8A9B9D]">
                        No documents staged. Please return to Step 2 to add statutory files.
                      </td>
                    </tr>
                  ) : (
                    stagedDocuments.map((doc) => {
                      const isFocused = doc.id === focusedDoc?.id;
                      const hasExtraction = Boolean(doc.extractionData?.fields);
                      const isUncertain = doc.processingState === "UNCERTAIN";
                      const isFailed = doc.processingState === "FAILED";

                      // Extraction Badge Styling
                      let extBadgeBg = "bg-[#F0F2F2] text-[#5C6F73] border-[#D7DEDA]";
                      let extBadgeText = "⚡ Awaiting pipeline";

                      if (hasExtraction) {
                        extBadgeBg = "bg-[#EAF3EE] text-[#245E3F] border-[#C8E6C9]";
                        extBadgeText = "✓ Extracted";
                      } else if (isFailed) {
                        extBadgeBg = "bg-[#FDF2F2] text-[#9E2A2B] border-[#E8C5C5]";
                        extBadgeText = "✗ Pipeline Failed";
                      } else if (isUncertain) {
                        extBadgeBg = "bg-[#FFF9E6] text-[#8D6B00] border-[#FFE58F]";
                        extBadgeText = "△ Uncertain";
                      }

                      // Real validation state computed from backend extraction & scrutiny findings
                      const valBadge = computeDocumentValidationOutcome(
                        doc,
                        latestScrutinyReport || createdApplication?.scrutinyReports?.[0],
                        isExtractionFailed
                      );

                      const isManualApprovalRequired = valBadge.outcome === "MANUAL_APPROVAL";

                      return (
                        <tr
                          key={doc.id}
                          onClick={() => setFocusedDocId(doc.id)}
                          className={`hover:bg-[#F9F9F7] transition-colors cursor-pointer ${
                            isFocused ? "bg-[#F4F6F5]" : ""
                          }`}
                        >
                          {/* Col 1: Real Filename & Category */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[#172E33] leading-snug">
                              {doc.categoryLabel}
                            </div>
                            <div className="text-[12px] font-mono text-[#165A60] mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold">{doc.fileName}</span>
                              <span className="text-[#8A9B9D]">·</span>
                              <span className="text-[#5C6F73] text-[11px]">{doc.formattedSize}</span>
                            </div>
                            <div className="text-[11px] text-[#8A9B9D] mt-0.5">
                              Ref: {doc.issuingReference}
                            </div>
                          </td>

                          {/* Col 2: Code */}
                          <td className="py-3 px-3">
                            <span className="text-[11px] font-mono text-[#5C6F73] bg-[#EBEAE5] px-1.5 py-0.5 rounded-[2px] whitespace-nowrap">
                              {doc.categoryCode.replace("_", " ")}
                            </span>
                          </td>

                          {/* Col 3: Extraction Status */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`text-[11px] font-mono px-2 py-0.5 rounded-[2px] border ${extBadgeBg}`}
                            >
                              {extBadgeText}
                            </span>
                          </td>

                          {/* Col 4: Validation State */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`text-[11px] font-mono px-2 py-0.5 rounded-[2px] border ${valBadge.bgClass}`}
                              title={valBadge.detailNote || valBadge.text}
                            >
                              {valBadge.text}
                            </span>
                          </td>

                          {/* Col 5: Status Control (Officer decision override) */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {isManualApprovalRequired ? (
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewDoc(doc);
                                }}
                                className="text-[11px] font-mono font-medium py-1 px-2.5 rounded-[2px] border-[#FFE58F] bg-[#FFF9E6] text-[#8D6B00] hover:bg-[#FFF3CD] inline-flex items-center gap-1 shadow-xs"
                                title="Inspection required before configuring validation status"
                              >
                                Inspect ↗
                              </Button>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={
                                      doc.extractionData?.officerValidation?.status || ""
                                    }
                                    disabled={updatingDocId === doc.id || !createdApplication}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      const val = e.target.value as
                                        | "PASS"
                                        | "DEFICIENCY"
                                        | "MANUAL_APPROVAL"
                                        | "RESET";
                                      if (val) handleStatusChange(doc, val);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[11px] font-mono bg-white border border-[#D7DEDA] rounded-[2px] px-2 py-1 text-[#172E33] hover:border-[#165A60] focus:outline-none focus:border-[#165A60] cursor-pointer disabled:opacity-50"
                                  >
                                    <option value="" disabled>
                                      Change status...
                                    </option>
                                    <option value="PASS">✓ Pass / Compliant</option>
                                    <option value="DEFICIENCY">! Flag Deficiency</option>
                                    <option value="MANUAL_APPROVAL">△ Request Manual Review</option>
                                    {doc.extractionData?.officerValidation && (
                                      <option value="RESET">↺ Reset to Computed</option>
                                    )}
                                  </select>
                                  {updatingDocId === doc.id && (
                                    <span className="text-[11px] animate-spin text-[#165A60]">◌</span>
                                  )}
                                </div>
                                {statusFeedback?.docId === doc.id && (
                                  <span
                                    className={`text-[10px] ${
                                      statusFeedback.success ? "text-[#245E3F]" : "text-[#9E2A2B]"
                                    }`}
                                  >
                                    {statusFeedback.message}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Col 6: Action Link to right drawer */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {doc.previewUrl && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewDoc(doc);
                                  }}
                                  className="text-[12px] text-[#5C6F73] hover:text-[#172E33] px-1.5 py-1 rounded"
                                  title="View document file preview"
                                >
                                  Preview ↗
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDrawerDoc(doc);
                                }}
                                className="text-[12px] font-medium text-[#165A60] hover:text-[#122B30] hover:underline bg-[#EAEFEF] px-2.5 py-1 rounded-[2px] border border-[#165A60]/20 inline-flex items-center gap-1"
                              >
                                See VLM extracted doc fields →
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Blocking Issues Alert Banner (if mandatory categories are missing) */}
          {hasBlockingErrors && (
            <div className="bg-[#FDF2F2] border border-[#E8C5C5] rounded-[2px] p-4 text-[#9E2A2B]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-lg font-bold">!</span>
                  <div>
                    <h4 className="text-[14px] font-bold m-0">
                      Missing mandatory statutory evidence ({missingCount})
                    </h4>
                    <p className="text-[12px] mt-1 mb-2 text-[#9E2A2B] leading-relaxed">
                      The AICTE regulatory framework requires complete documentation for all mandatory
                      categories before submission approval. The following statutory items are currently
                      missing:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {missingRequiredCategories.map((code) => {
                        const def = STATUTORY_DOCUMENT_CATEGORIES.find((c) => c.code === code);
                        return (
                          <span
                            key={code}
                            className="text-[11px] font-mono bg-white px-2 py-0.5 rounded-[2px] border border-[#E8C5C5] text-[#9E2A2B]"
                          >
                            {def?.shortLabel || code}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCurrentStep(2)}
                  className="bg-white border-[#E8C5C5] text-[#9E2A2B] hover:bg-[#FBEAEA] text-[12px] font-medium px-3 py-1.5 rounded-[3px] shrink-0"
                >
                  ← Return to step 2 / correct documents
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Evidence Inspection / Context Card (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-[#D7DEDA] rounded-[2px] p-4 shadow-sm">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#5C6F73]">
              ORIGINAL EVIDENCE CONTEXT
            </div>
            <h4 className="text-[14px] font-bold text-[#172E33] mt-1 m-0">
              {focusedDoc ? focusedDoc.categoryLabel : "Evidence Inspection"}
            </h4>

            {focusedDoc ? (
              <div className="mt-3 space-y-3 text-[12px]">
                <div className="p-3 bg-[#FAFAF8] border border-[#D7DEDA] rounded-[2px] space-y-1.5 font-mono text-[11px]">
                  <div>
                    <span className="text-[#8A9B9D]">FILE:</span>{" "}
                    <span className="text-[#172E33] font-semibold">{focusedDoc.fileName}</span>
                  </div>
                  <div>
                    <span className="text-[#8A9B9D]">SIZE:</span> {focusedDoc.formattedSize}
                  </div>
                  <div>
                    <span className="text-[#8A9B9D]">FORMAT:</span> {focusedDoc.formatExtension}
                  </div>
                  <div>
                    <span className="text-[#8A9B9D]">REF:</span> {focusedDoc.issuingReference}
                  </div>
                  <div>
                    <span className="text-[#8A9B9D]">STORAGE:</span> Session memory buffer
                  </div>
                </div>

                <div className="space-y-1 text-[#5C6F73]">
                  <div className="font-semibold text-[#172E33]">Statutory Classification:</div>
                  <p className="m-0 leading-relaxed text-[11px]">
                    Prescribed under AICTE Approval Process Handbook (APH) 2026–27. Must adhere to official
                    format standards and statutory issuing authority guidelines.
                  </p>
                </div>

                <div className="pt-3 border-t border-[#D7DEDA] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setSelectedDrawerDoc(focusedDoc)}
                    className="text-[12px] font-medium text-[#165A60] hover:underline"
                  >
                    Inspect VLM Schema Fields →
                  </button>
                  {focusedDoc.previewUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(focusedDoc)}
                      className="text-[12px] text-[#5C6F73] hover:text-[#172E33]"
                    >
                      View Source ↗
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-3 text-[12px] text-[#8A9B9D]">
                Select a document from the table to inspect details.
              </div>
            )}
          </div>

          {/* Submission Intake Summary Card */}
          <div className="bg-white border border-[#D7DEDA] rounded-[2px] p-4 shadow-sm text-[12px] space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#5C6F73]">
              INTAKE MANIFEST
            </div>
            <div className="font-semibold text-[#172E33]">
              {institutionDetails.institutionName || "Institution Name Pending"}
            </div>
            <div className="text-[11px] font-mono text-[#5C6F73]">
              Ref: {institutionDetails.applicationNumber || "AICTE-2026-9041"}
            </div>
            {createdApplication && (
              <div className="text-[11px] font-mono text-[#245E3F] bg-[#EAF3EE] p-1.5 rounded-[2px] border border-[#C8E6C9] mt-1">
                ✓ Uploaded Record: {createdApplication.id} ({createdApplication.status})
              </div>
            )}
            <p className="text-[11px] text-[#8A9B9D] m-0 leading-relaxed pt-2 border-t border-[#D7DEDA]">
              Decision support only. Computed findings do not constitute regulatory approval or rejection.
            </p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-8 border-t border-[#D7DEDA]">
        {isExistingApplicationMode ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/officer/applications")}
            className="w-full sm:w-auto bg-white border-[#D7DEDA] text-[#172E33] hover:bg-neutral-50 px-4 py-2.5 rounded-[3px] text-[13px] font-medium inline-flex items-center gap-1.5"
          >
            ← Back to My Applications
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={goToPreviousStep}
            className="w-full sm:w-auto bg-white border-[#D7DEDA] text-[#172E33] hover:bg-neutral-50 px-4 py-2.5 rounded-[3px] text-[13px] font-medium inline-flex items-center gap-1.5"
          >
            ← Back
          </Button>
        )}

        <div className="w-full sm:w-auto flex flex-wrap items-center justify-between sm:justify-end gap-3">
          <span className="text-[12px] text-[#5C6F73]">
            {isExtractionFailed
              ? "Extraction incomplete · Re-run available"
              : isScrutinyFailed
              ? "Scrutiny pending · Re-run available"
              : hasBlockingErrors
              ? "Missing mandatory evidence items"
              : "Authorized intake · Ready for review"}
          </span>

          {/* Conditional Action: Run Extraction */}
          {isExtractionFailed && (
            <Button
              type="button"
              onClick={runExtraction}
              disabled={isExtracting}
              className="bg-[#165A60] hover:bg-[#122B30] text-white text-[13px] font-medium px-4 py-2.5 rounded-[3px] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isExtracting ? (
                <>
                  <span className="inline-block animate-spin mr-1">◌</span>
                  Running extraction...
                </>
              ) : (
                "Run extraction"
              )}
            </Button>
          )}

          {/* Conditional Action: Run Scrutiny */}
          {isScrutinyFailed && (
            <Button
              type="button"
              onClick={runScrutiny}
              disabled={isEvaluatingScrutiny}
              className="bg-[#165A60] hover:bg-[#122B30] text-white text-[13px] font-medium px-4 py-2.5 rounded-[3px] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isEvaluatingScrutiny ? (
                <>
                  <span className="inline-block animate-spin mr-1">◌</span>
                  Running scrutiny...
                </>
              ) : (
                "Run scrutiny"
              )}
            </Button>
          )}

          <Button
            type="button"
            onClick={onProceedToReview}
            disabled={hasBlockingErrors}
            className={`px-5 py-2.5 rounded-[3px] text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors ${
              !hasBlockingErrors
                ? "bg-[#165A60] hover:bg-[#122B30] text-white cursor-pointer"
                : "bg-[#D7DEDA] text-[#8A9B9D] cursor-not-allowed"
            }`}
          >
            Review &amp; approve →
          </Button>
        </div>
      </div>
    </div>
  );
};
