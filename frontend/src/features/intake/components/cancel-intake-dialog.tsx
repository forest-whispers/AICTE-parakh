import React from "react";
import { Button } from "../../../shared/ui/button";

interface CancelIntakeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const CancelIntakeDialog: React.FC<CancelIntakeDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-4">
      <div className="bg-white border border-[#D7DEDA] rounded-[3px] shadow-lg max-w-md w-full p-6">
        <h3 className="text-base font-bold text-[#172E33] m-0">Cancel guided submission?</h3>
        <p className="text-[13px] text-[#5C6F73] mt-2 mb-0 leading-relaxed">
          Canceling this submission will discard all staged institutional particulars and selected evidence documents for this session.
        </p>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#D7DEDA]">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="text-[13px] font-medium px-4 py-2 border-[#D7DEDA] text-[#172E33] rounded-[3px]"
          >
            Continue submission
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            className="text-[13px] font-medium px-4 py-2 bg-[#A14637] hover:bg-[#853427] text-white rounded-[3px]"
          >
            Discard & exit
          </Button>
        </div>
      </div>
    </div>
  );
};
