import React, { useState } from "react";
import type { StagedDocument } from "../types/intake.types";
import type { DocumentValidationBadge } from "../utils/validation-state";
import { Button } from "../../../shared/ui/button";

interface DocumentPreviewModalProps {
  document: StagedDocument | null;
  onClose: () => void;
  validationBadge?: DocumentValidationBadge;
  onUpdateStatus?: (
    status: "PASS" | "DEFICIENCY" | "MANUAL_APPROVAL" | "RESET",
    notes?: string
  ) => Promise<boolean>;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  onClose,
  validationBadge,
  onUpdateStatus,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<
    "PASS" | "DEFICIENCY" | "MANUAL_APPROVAL" | "RESET" | null
  >(null);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  if (!document) return null;

  const isPdf =
    document.mimeType === "application/pdf" || document.fileName.toLowerCase().endsWith(".pdf");
  const isImage =
    document.mimeType.startsWith("image/") || /\.(png|jpe?g)$/i.test(document.fileName);

  const handleSaveDecision = async () => {
    if (!selectedStatus || !onUpdateStatus) return;
    setIsSubmitting(true);
    setFeedbackMsg(null);
    try {
      const ok = await onUpdateStatus(selectedStatus, notes);
      if (ok) {
        setFeedbackMsg({
          type: "success",
          text: `Regulatory decision recorded: ${selectedStatus.replace("_", " ")}`,
        });
      } else {
        setFeedbackMsg({
          type: "error",
          text: "Failed to persist validation status change. Please check permissions.",
        });
      }
    } catch {
      setFeedbackMsg({
        type: "error",
        text: "An error occurred while persisting your decision.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[1px] p-4 sm:p-6">
      <div className="bg-white border border-[#D7DEDA] rounded-[3px] shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#D7DEDA] flex items-center justify-between bg-[#FAFAF8]">
          <div>
            <div className="text-[10px] font-mono tracking-wider uppercase text-[#5C6F73]">
              STAGED EVIDENCE INSPECTION &nbsp;·&nbsp; {document.formatExtension}
            </div>
            <h3 className="text-base font-bold text-[#172E33] m-0">{document.categoryLabel}</h3>
            <div className="text-[12px] font-mono text-[#5C6F73] mt-0.5">
              {document.fileName} · {document.formattedSize} · Ref: {document.issuingReference}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8A9B9D] hover:text-[#172E33] text-lg font-bold p-1 rounded"
            title="Close preview"
          >
            ✕
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-[#F6F5F0] flex items-center justify-center min-h-[300px]">
          {isPdf && document.previewUrl ? (
            <iframe
              src={document.previewUrl}
              title={document.fileName}
              className="w-full h-[520px] border border-[#D7DEDA] rounded-[2px] bg-white"
            />
          ) : isImage && document.previewUrl ? (
            <div className="max-h-[520px] overflow-auto flex items-center justify-center bg-white p-4 border border-[#D7DEDA] rounded-[2px]">
              <img
                src={document.previewUrl}
                alt={document.fileName}
                className="max-h-[480px] max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="text-center p-8 bg-white border border-[#D7DEDA] rounded-[3px] max-w-md shadow-sm">
              <div className="text-3xl mb-2">📄</div>
              <h4 className="text-sm font-bold text-[#172E33]">{document.fileName}</h4>
              <p className="text-xs text-[#5C6F73] mt-1">
                Local file object staged in memory ({document.formattedSize}).
              </p>
              <div className="mt-4 p-3 bg-[#FAFAF8] text-[11px] font-mono text-left rounded border border-[#D7DEDA]">
                <div>Category: {document.categoryCode}</div>
                <div>Issuing Ref: {document.issuingReference}</div>
                <div>Status: {document.processingNote}</div>
              </div>
            </div>
          )}
        </div>

        {/* Officer Manual Inspection & Validation Controls */}
        {onUpdateStatus && (
          <div className="px-6 py-4 border-t border-[#D7DEDA] bg-[#FAF8F5]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold text-[#172E33]">
                  Officer Regulatory Validation Decision:
                </span>
                {validationBadge && (
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded-[2px] border ${validationBadge.bgClass}`}
                  >
                    {validationBadge.text}
                  </span>
                )}
              </div>
              {validationBadge?.detailNote && (
                <span className="text-[11px] text-[#5C6F73] truncate max-w-md">
                  {validationBadge.detailNote}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              {/* Radio-style Status Options */}
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-mono uppercase text-[#5C6F73] mb-1">
                  Configure Document Status *
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedStatus("PASS")}
                    className={`text-[12px] font-medium py-1.5 px-2.5 rounded-[2px] border transition-colors text-left ${
                      selectedStatus === "PASS"
                        ? "bg-[#EAF3EE] text-[#245E3F] border-[#245E3F] font-bold shadow-xs"
                        : "bg-white text-[#172E33] border-[#D7DEDA] hover:bg-[#F4F6F5]"
                    }`}
                  >
                    ✓ Pass / Verified
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStatus("DEFICIENCY")}
                    className={`text-[12px] font-medium py-1.5 px-2.5 rounded-[2px] border transition-colors text-left ${
                      selectedStatus === "DEFICIENCY"
                        ? "bg-[#FDF2F2] text-[#9E2A2B] border-[#9E2A2B] font-bold shadow-xs"
                        : "bg-white text-[#172E33] border-[#D7DEDA] hover:bg-[#FDF6F6]"
                    }`}
                  >
                    ! Flag Deficiency
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStatus("MANUAL_APPROVAL")}
                    className={`text-[12px] font-medium py-1.5 px-2.5 rounded-[2px] border transition-colors text-left ${
                      selectedStatus === "MANUAL_APPROVAL"
                        ? "bg-[#FFF9E6] text-[#8D6B00] border-[#8D6B00] font-bold shadow-xs"
                        : "bg-white text-[#172E33] border-[#D7DEDA] hover:bg-[#FFFDF5]"
                    }`}
                  >
                    △ Retain Review
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStatus("RESET")}
                    className={`text-[12px] font-medium py-1.5 px-2.5 rounded-[2px] border transition-colors text-left ${
                      selectedStatus === "RESET"
                        ? "bg-[#EBEAE5] text-[#172E33] border-[#172E33] font-bold shadow-xs"
                        : "bg-white text-[#5C6F73] border-[#D7DEDA] hover:bg-[#F6F5F0]"
                    }`}
                  >
                    ↺ Reset Computed
                  </button>
                </div>
              </div>

              {/* Notes Input */}
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-mono uppercase text-[#5C6F73] mb-1">
                  Inspection Rationale / Evidence Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Inspected registrar wet stamp on page 2..."
                  className="w-full text-[12px] bg-white border border-[#D7DEDA] rounded-[2px] px-3 py-1.5 text-[#172E33] placeholder-[#8A9B9D] focus:outline-none focus:border-[#165A60]"
                />
              </div>

              {/* Save Button */}
              <div className="sm:col-span-2">
                <Button
                  type="button"
                  onClick={handleSaveDecision}
                  disabled={!selectedStatus || isSubmitting}
                  className="w-full bg-[#165A60] hover:bg-[#122B30] text-white text-[12px] font-medium py-1.5 px-3 rounded-[3px] disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            {feedbackMsg && (
              <div
                className={`mt-2 text-[12px] px-3 py-1.5 rounded-[2px] ${
                  feedbackMsg.type === "success"
                    ? "bg-[#EAF3EE] text-[#245E3F] border border-[#C8E6C9]"
                    : "bg-[#FDF2F2] text-[#9E2A2B] border border-[#E8C5C5]"
                }`}
              >
                {feedbackMsg.text}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#D7DEDA] bg-white flex items-center justify-between">
          <span className="text-[12px] text-[#5C6F73]">
            Regulatory preview is logged in the compliance audit trail.
          </span>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="text-[13px] font-medium px-4 py-1.5 border-[#D7DEDA] text-[#172E33] rounded-[3px]"
          >
            Close preview
          </Button>
        </div>
      </div>
    </div>
  );
};
