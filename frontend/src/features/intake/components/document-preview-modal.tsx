import React from "react";
import type { StagedDocument } from "../types/intake.types";
import { Button } from "../../../shared/ui/button";

interface DocumentPreviewModalProps {
  document: StagedDocument | null;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  onClose,
}) => {
  if (!document) return null;

  const isPdf = document.mimeType === "application/pdf" || document.fileName.toLowerCase().endsWith(".pdf");
  const isImage = document.mimeType.startsWith("image/") || /\.(png|jpe?g)$/i.test(document.fileName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[1px] p-4 sm:p-6">
      <div className="bg-white border border-[#D7DEDA] rounded-[3px] shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#D7DEDA] flex items-center justify-between bg-[#FAFAF8]">
          <div>
            <div className="text-[10px] font-mono tracking-wider uppercase text-[#5C6F73]">
              STAGED EVIDENCE PREVIEW &nbsp;·&nbsp; {document.formatExtension}
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
        <div className="flex-1 overflow-auto p-6 bg-[#F6F5F0] flex items-center justify-center min-h-[350px]">
          {isPdf && document.previewUrl ? (
            <iframe
              src={document.previewUrl}
              title={document.fileName}
              className="w-full h-[600px] border border-[#D7DEDA] rounded-[2px] bg-white"
            />
          ) : isImage && document.previewUrl ? (
            <div className="max-h-[600px] overflow-auto flex items-center justify-center bg-white p-4 border border-[#D7DEDA] rounded-[2px]">
              <img
                src={document.previewUrl}
                alt={document.fileName}
                className="max-h-[550px] max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="text-center p-8 bg-white border border-[#D7DEDA] rounded-[3px] max-w-md">
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

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#D7DEDA] bg-white flex items-center justify-between">
          <span className="text-[12px] text-[#5C6F73]">
            Local in-memory file staging. Content is retained until the submission boundary.
          </span>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="text-[13px] font-medium px-4 py-2 border-[#D7DEDA] text-[#172E33] rounded-[3px]"
          >
            Close preview
          </Button>
        </div>
      </div>
    </div>
  );
};
