import React from "react";
import { Button } from "./button";
import { AlertCircle, X } from "lucide-react";

interface PlannedFeatureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  scheduledSlice?: string;
}

export const PlannedFeatureDialog: React.FC<PlannedFeatureDialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  scheduledSlice = "Slice 3 (Application Register & Case Explorer)",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-4">
      <div className="bg-white border border-[#D7DEDA] rounded-[3px] shadow-panel max-w-md w-full p-6 text-[#172E33] relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#5C6F73] hover:text-[#172E33] transition-colors p-1"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-[2px] bg-[#EBF2F1] text-[#165A60] border border-[#D7DEDA]">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#5C6F73] mb-0.5">
              Planned Destination
            </div>
            <h3 className="text-base font-semibold text-[#172E33] m-0">{title}</h3>
          </div>
        </div>

        <p className="text-xs text-[#5C6F73] leading-relaxed mb-4">{description}</p>

        <div className="p-3 bg-[#F6F5F0] rounded-[2px] border border-[#D7DEDA] mb-5">
          <span className="text-[10px] uppercase font-mono text-[#5C6F73] block mb-0.5">
            Implementation Scope
          </span>
          <span className="text-xs font-medium text-[#165A60]">{scheduledSlice}</span>
        </div>

        <div className="flex justify-end">
          <Button variant="primary" size="sm" onClick={onClose}>
            Acknowledge
          </Button>
        </div>
      </div>
    </div>
  );
};
