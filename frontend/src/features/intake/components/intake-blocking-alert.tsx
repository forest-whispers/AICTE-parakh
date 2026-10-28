import React from "react";
import type { IntakeAlertNotice } from "../types/intake.types";

interface IntakeBlockingAlertProps {
  alert: IntakeAlertNotice;
  onDismiss: () => void;
  onSelectAnotherFile?: () => void;
  onReviewExisting?: () => void;
  onRetryExtraction?: () => void;
}

export const IntakeBlockingAlert: React.FC<IntakeBlockingAlertProps> = ({
  alert,
  onDismiss,
  onSelectAnotherFile,
  onReviewExisting,
  onRetryExtraction,
}) => {
  if (alert.type === "UNSUPPORTED_FORMAT") {
    return (
      <div className="bg-[#FDF2F2] border-l-[3px] border-[#A14637] p-4 rounded-r-[3px] mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-[13px] font-bold text-[#172E33] m-0">Unsupported format</h4>
            <p className="text-[12px] text-[#5C6F73] mt-1 mb-0 leading-relaxed">
              <strong className="text-[#172E33] font-mono">{alert.conflictingFileName}</strong> was not added. Choose an allowed evidence format (PDF, JPG, or PNG under 25 MB).
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="text-[#8A9B9D] hover:text-[#172E33] text-sm ml-2"
            title="Dismiss notice"
          >
            ✕
          </button>
        </div>

        {onSelectAnotherFile && (
          <div className="mt-3">
            <button
              type="button"
              onClick={onSelectAnotherFile}
              className="bg-white border border-[#D7DEDA] px-3.5 py-1.5 rounded-[3px] text-[12px] font-medium text-[#172E33] hover:bg-neutral-50 shadow-none transition-colors"
            >
              Select another file
            </button>
          </div>
        )}
      </div>
    );
  }

  if (alert.type === "DUPLICATE_FILE") {
    return (
      <div className="bg-[#FEF7EC] border-l-[3px] border-[#94631F] p-4 rounded-r-[3px] mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-[13px] font-bold text-[#172E33] m-0">Possible duplicate file</h4>
            <p className="text-[12px] text-[#5C6F73] mt-1 mb-0 leading-relaxed">
              <strong className="text-[#172E33] font-mono">{alert.conflictingFileName}</strong> appears to match a file already added. Review the existing file before replacement.
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="text-[#8A9B9D] hover:text-[#172E33] text-sm ml-2"
            title="Dismiss notice"
          >
            ✕
          </button>
        </div>

        {onReviewExisting && (
          <div className="mt-3">
            <button
              type="button"
              onClick={onReviewExisting}
              className="bg-white border border-[#D7DEDA] px-3.5 py-1.5 rounded-[3px] text-[12px] font-medium text-[#172E33] hover:bg-neutral-50 shadow-none transition-colors"
            >
              Review existing file
            </button>
          </div>
        )}
      </div>
    );
  }

  if (alert.type === "EXTRACTION_UNAVAILABLE") {
    return (
      <div className="bg-[#FEF7EC] border-l-[3px] border-[#94631F] p-4 rounded-r-[3px] mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-[13px] font-bold text-[#172E33] m-0">
              Source file retained; extraction unavailable
            </h4>
            <p className="text-[12px] text-[#5C6F73] mt-1 mb-0 leading-relaxed">
              The file is present, but extraction has not completed. No values or scrutiny outcomes should be inferred. Retry permitted processing when available.
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="text-[#8A9B9D] hover:text-[#172E33] text-sm ml-2"
            title="Dismiss notice"
          >
            ✕
          </button>
        </div>

        {onRetryExtraction && (
          <div className="mt-3">
            <button
              type="button"
              onClick={onRetryExtraction}
              className="bg-white border border-[#D7DEDA] px-3.5 py-1.5 rounded-[3px] text-[12px] font-medium text-[#172E33] hover:bg-neutral-50 shadow-none transition-colors"
            >
              Retry extraction
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
};
