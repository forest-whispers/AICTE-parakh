import React, { useEffect } from "react";
import type { StagedDocument } from "../types/intake.types";
import { EXPECTED_DOCUMENT_FIELDS } from "../constants/expected-document-fields";
import { Button } from "../../../shared/ui/button";

interface VlmExtractedFieldsDrawerProps {
  document: StagedDocument | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VlmExtractedFieldsDrawer: React.FC<VlmExtractedFieldsDrawerProps> = ({
  document,
  isOpen,
  onClose,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !document) return null;

  const expectedFields = EXPECTED_DOCUMENT_FIELDS[document.categoryCode] || [];
  const extractionFields = document.extractionData?.fields || {};

  const isExtractionDone =
    document.processingState === "SUCCESS" ||
    document.extractionData?.status === "SUCCESS" ||
    document.extractionData?.status === "PARTIAL" ||
    document.extractionData?.status === "UNCERTAIN" ||
    Boolean(document.extractionData?.rawOutput) ||
    Object.keys(extractionFields).length > 0;

  const isExtractionFailed =
    document.processingState === "FAILED" || document.extractionData?.status === "FAILED";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Right Slide-over Panel */}
      <div className="fixed top-0 right-0 h-full w-[480px] max-w-[92vw] bg-white z-50 shadow-2xl flex flex-col border-l border-[#D7DEDA] animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D7DEDA] bg-[#FAFAF8] flex items-start justify-between">
          <div>
            <div className="text-[10px] font-mono tracking-wider uppercase text-[#165A60] font-semibold">
              VLM EXTRACTED SCHEMA FIELDS &nbsp;·&nbsp; {document.categoryCode}
            </div>
            <h3 className="text-base font-bold text-[#172E33] mt-1 m-0">
              {document.categoryLabel}
            </h3>
            <div className="text-[12px] text-[#5C6F73] mt-1 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[#172E33] bg-[#EBEAE5] px-1.5 py-0.5 rounded-[2px] text-[11px]">
                {document.fileName}
              </span>
              <span>·</span>
              <span>{document.formattedSize}</span>
              <span>·</span>
              <span>Ref: {document.issuingReference}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8A9B9D] hover:text-[#172E33] text-xl font-bold p-1 rounded transition-colors ml-2"
            title="Close drawer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F6F5F0]">
          {/* Honest Status Banner */}
          {isExtractionFailed ? (
            <div className="p-4 bg-[#FDF2F2] border border-[#E8C5C5] rounded-[3px] shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-lg">⚠️</span>
                <div>
                  <div className="text-[12px] font-bold text-[#9E2A2B] uppercase tracking-wide">
                    VLM Extraction Incomplete / Paused
                  </div>
                  <p className="text-[12px] text-[#5C6F73] mt-1 mb-0 leading-relaxed">
                    Automated feature extraction has not completed for this document (e.g. model high demand). Click &ldquo;Run extraction&rdquo; on the validation screen to retry.
                  </p>
                  <p className="text-[11px] text-[#8A9B9D] mt-2 mb-0">
                    Below are the registered schema fields for{" "}
                    <span className="font-mono text-[#172E33]">{document.categoryCode}</span>.
                  </p>
                </div>
              </div>
            </div>
          ) : isExtractionDone ? (
            <div className="p-4 bg-[#EAF3EE] border border-[#C8E6C9] rounded-[3px]">
              <div className="text-[12px] font-bold text-[#245E3F] uppercase tracking-wide">
                Extraction Results Available
              </div>
              <p className="text-[12px] text-[#245E3F] mt-1 mb-0">
                Extracted via VLM pipeline at {document.extractionData?.extractedAt || "recent run"}.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-white border border-[#D7DEDA] rounded-[3px] shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-lg">⚡</span>
                <div>
                  <div className="text-[12px] font-bold text-[#172E33] uppercase tracking-wide">
                    Awaiting Backend Extraction Pipeline
                  </div>
                  <p className="text-[12px] text-[#5C6F73] mt-1 mb-0 leading-relaxed">
                    This file is staged in your local memory buffer. Document-level multimodal VLM extraction
                    and deterministic statutory scrutiny will execute during automated ingestion.
                  </p>
                  <p className="text-[11px] text-[#8A9B9D] mt-2 mb-0">
                    Below are the required statutory schema fields registered for{" "}
                    <span className="font-mono text-[#172E33]">{document.categoryCode}</span>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Schema Fields List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#5C6F73] px-1">
              <span>STATUTORY SCHEMA FIELDS ({expectedFields.length})</span>
              <span>STATE &amp; VALUE</span>
            </div>

            {expectedFields.map((field) => {
              const extracted = extractionFields[field.key];
              const isPresent = extracted?.state === "present" || extracted?.backendState === "PRESENT";
              const isUncertain =
                extracted?.state === "uncertain" ||
                extracted?.backendState === "ILLEGIBLE" ||
                extracted?.backendState === "AMBIGUOUS";

              let badgeBg = "bg-[#F0F2F2] text-[#5C6F73] border-[#D7DEDA]";
              let badgeText = "Awaiting extraction";

              if (isExtractionDone) {
                if (isPresent) {
                  badgeBg = "bg-[#EAF3EE] text-[#245E3F] border-[#C8E6C9]";
                  badgeText = "✓ PRESENT";
                } else if (isUncertain) {
                  badgeBg = "bg-[#FFF9E6] text-[#8D6B00] border-[#FFE58F]";
                  badgeText = extracted?.backendState ? `△ ${extracted.backendState}` : "△ UNCERTAIN";
                } else {
                  // Not found / Absent: show MISSING or whatever the backend returned (e.g. NOT_FOUND, NOT_APPLICABLE)
                  badgeBg = "bg-[#FDF2F2] text-[#9E2A2B] border-[#E8C5C5]";
                  badgeText = extracted?.backendState ? `✗ ${extracted.backendState}` : "✗ MISSING";
                }
              } else if (isExtractionFailed) {
                badgeBg = "bg-[#FDF2F2] text-[#9E2A2B] border-[#E8C5C5]";
                badgeText = "✗ Pipeline Failed";
              }

              return (
                <div
                  key={field.key}
                  className="bg-white border border-[#D7DEDA] rounded-[3px] p-3.5 shadow-sm space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[13px] font-semibold text-[#172E33] leading-snug">
                        {field.label}
                      </div>
                      <div className="text-[11px] font-mono text-[#8A9B9D] mt-0.5">
                        key: {field.key} · {field.type.toUpperCase()}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-[2px] border ${badgeBg}`}
                      >
                        {badgeText}
                      </span>
                      {field.isCrucialForScrutiny && (
                        <span className="text-[9px] font-mono text-[#A14637] uppercase tracking-tight">
                          Crucial for Scrutiny
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-[#5C6F73] m-0 leading-normal">
                    {field.description}
                  </p>

                  {/* Extracted value or pending placeholder */}
                  <div className="pt-2 border-t border-[#D7DEDA]/60 text-[12px] bg-[#FAFAF8] p-2 rounded-[2px]">
                    <div className="text-[10px] font-mono text-[#8A9B9D] uppercase">
                      Extracted Value:
                    </div>
                    {isExtractionDone ? (
                      isPresent && extracted ? (
                        <div>
                          <div className="font-semibold text-[#172E33] mt-0.5">
                            {extracted.value !== undefined && extracted.value !== null
                              ? String(extracted.value)
                              : "Present (not explicitly quantified)"}
                          </div>
                          {extracted.excerpt && (
                            <div className="text-[11px] text-[#5C6F73] italic mt-1 bg-white p-1.5 rounded border border-[#D7DEDA]">
                              &ldquo;{extracted.excerpt}&rdquo;
                              {extracted.pageNumber && (
                                <span className="text-[#8A9B9D] ml-1">(p. {extracted.pageNumber})</span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : isUncertain && extracted ? (
                        <div>
                          <div className="text-[#8D6B00] font-medium mt-0.5">
                            {extracted.uncertaintyReason || "Ambiguous / uncertain in document scan"}
                          </div>
                          {extracted.rawText && (
                            <div className="text-[11px] text-[#5C6F73] italic mt-1 bg-white p-1.5 rounded border border-[#D7DEDA]">
                              Raw read: &ldquo;{extracted.rawText}&rdquo;
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-[#9E2A2B] font-medium mt-0.5 flex items-center gap-1.5">
                          <span>Not detected in document</span>
                          {extracted?.backendState && (
                            <span className="font-mono text-[10px] text-[#8A9B9D]">
                              ({extracted.backendState})
                            </span>
                          )}
                        </div>
                      )
                    ) : isExtractionFailed ? (
                      <div className="text-[#9E2A2B] italic mt-0.5">
                        — (Extraction failed: click &ldquo;Run extraction&rdquo; to retry)
                      </div>
                    ) : (
                      <div className="text-[#8A9B9D] italic mt-0.5">
                        — (Pending automated document scan)
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#D7DEDA] bg-white flex items-center justify-between">
          <div className="text-[11px] text-[#8A9B9D]">
            AICTE APH 2026–27 Statutory Schema
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="text-[12px] font-medium px-4 py-1.5 border-[#D7DEDA] text-[#172E33] rounded-[3px]"
          >
            Close schema view
          </Button>
        </div>
      </div>
    </>
  );
};
