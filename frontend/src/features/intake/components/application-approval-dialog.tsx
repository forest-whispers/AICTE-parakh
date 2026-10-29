import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../shared/ui/button";

interface ApprovalBoundaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
  isSubmitting: boolean;
  error: string | null;
  institutionName: string;
  applicationNumber: string;
}

export const ApplicationApprovalDialog: React.FC<ApprovalBoundaryDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  error,
  institutionName,
  applicationNumber,
}) => {
  const navigate = useNavigate();
  const [isComplete, setIsComplete] = useState(false);

  if (!isOpen) return null;

  const confirmApproval = async () => {
    if (await onConfirm()) {
      setIsComplete(true);
    }
  };

  const closeDialog = () => {
    setIsComplete(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-4"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-dialog-title"
        className="bg-white border border-[#D7DEDA] rounded-[3px] shadow-2xl max-w-lg w-full p-6"
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
              isComplete
                ? "bg-[#EAF3EE] text-[#245E3F]"
                : "bg-[#FFF9E6] text-[#8D6B00]"
            }`}
          >
            {isComplete ? "✓" : "?"}
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-mono tracking-wider uppercase text-[#5C6F73]">
              AICTE PARAKH · FINAL SUBMISSION
            </div>
            <h3
              id="approval-dialog-title"
              className="text-base font-bold text-[#172E33] m-0 mt-0.5"
            >
              {isComplete ? "Application marked approved" : "Approve this application?"}
            </h3>
          </div>
        </div>

        <div className="mt-4 space-y-3 text-[13px] text-[#5C6F73] leading-relaxed">
          {isComplete ? (
            <p className="m-0">
              <strong className="text-[#172E33]">{institutionName}</strong> (Ref:{" "}
              <span className="font-mono text-[#172E33]">{applicationNumber}</span>) now has
              the PARAKH workflow status <strong className="text-[#245E3F]">APPROVED</strong>.
            </p>
          ) : (
            <>
              <p className="m-0">
                Are you sure you want to mark{" "}
                <strong className="text-[#172E33]">{institutionName || "this application"}</strong>{" "}
                (Ref: <span className="font-mono text-[#172E33]">{applicationNumber || "—"}</span>)
                as approved?
              </p>
              <div className="p-3 bg-[#FAFAF8] border border-[#D7DEDA] rounded-[2px] text-[12px]">
                This updates the application status to <strong>APPROVED</strong> in PARAKH. It
                records the workflow decision and does not itself issue a statutory AICTE approval.
              </div>
            </>
          )}

          {error && !isComplete && (
            <div
              role="alert"
              className="p-3 bg-[#FDF2F2] border border-[#E8C5C5] text-[#9E2A2B] rounded-[2px] text-[12px]"
            >
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#D7DEDA]">
          {isComplete ? (
            <Button
              type="button"
              onClick={() => navigate("/officer/applications")}
              className="text-[13px] font-medium px-4 py-2 bg-[#165A60] hover:bg-[#122B30] text-white rounded-[3px]"
            >
              Return to My Applications
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={closeDialog}
                disabled={isSubmitting}
                className="text-[13px] font-medium px-4 py-2 border-[#D7DEDA] text-[#172E33] rounded-[3px]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void confirmApproval()}
                disabled={isSubmitting}
                className="text-[13px] font-medium px-4 py-2 bg-[#165A60] hover:bg-[#122B30] text-white rounded-[3px] disabled:opacity-60"
              >
                {isSubmitting ? "Approving..." : "Confirm approval"}
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
};
