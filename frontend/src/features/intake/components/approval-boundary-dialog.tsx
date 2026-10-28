import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../shared/ui/button";

interface ApprovalBoundaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  institutionName: string;
  applicationNumber: string;
  stagedDocumentCount: number;
}

export const ApprovalBoundaryDialog: React.FC<ApprovalBoundaryDialogProps> = ({
  isOpen,
  onClose,
  institutionName,
  applicationNumber,
  stagedDocumentCount,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-4">
      <div className="bg-white border border-[#D7DEDA] rounded-[3px] shadow-2xl max-w-lg w-full p-6">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[#EAEFEF] flex items-center justify-center text-[#165A60] text-lg font-bold shrink-0">
            ℹ
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-mono tracking-wider uppercase text-[#5C6F73]">
              AICTE PARAKH &nbsp;·&nbsp; SLICE BOUNDARY
            </div>
            <h3 className="text-base font-bold text-[#172E33] m-0 mt-0.5">
              Approval Operation Not Yet Configured
            </h3>
          </div>
        </div>

        <div className="mt-4 space-y-3 text-[13px] text-[#5C6F73] leading-relaxed">
          <p className="m-0">
            The application review and intake staging for{" "}
            <strong className="text-[#172E33]">{institutionName || "the institution"}</strong> (Ref:{" "}
            <span className="font-mono text-[#172E33]">{applicationNumber || "AICTE-2026-9041"}</span>)
            with <strong className="text-[#172E33]">{stagedDocumentCount} staged document(s)</strong> is
            complete within this frontend guided submission workflow.
          </p>

          <div className="p-3 bg-[#FAFAF8] border border-[#D7DEDA] rounded-[2px] text-[12px] space-y-1.5">
            <div className="font-semibold text-[#172E33]">Current Operational Status:</div>
            <ul className="list-disc pl-4 space-y-1 text-[#5C6F73] m-0">
              <li>
                <strong>No submission or approval has occurred.</strong> The formal backend approval
                endpoint is not yet configured for direct mutation in this slice.
              </li>
              <li>
                <strong>No backend database records have been mutated.</strong>
              </li>
              <li>
                The uploaded document manifest has passed local schema and intake checks, but has
                not yet undergone formal AICTE regulatory statutory verification.
              </li>
              <li>
                All entered particulars and staged evidence remain preserved in your active browser session.
              </li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#D7DEDA]">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="text-[13px] font-medium px-4 py-2 border-[#D7DEDA] text-[#172E33] rounded-[3px]"
          >
            Stay on review
          </Button>
          <Button
            type="button"
            onClick={() => navigate("/officer/workbench")}
            className="text-[13px] font-medium px-4 py-2 bg-[#165A60] hover:bg-[#122B30] text-white rounded-[3px]"
          >
            Return to Officer Workbench
          </Button>
        </div>
      </div>
    </div>
  );
};
