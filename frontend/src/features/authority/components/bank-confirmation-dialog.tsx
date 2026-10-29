import React, { useState } from "react";
import { Button } from "../../../shared/ui/button";
import { authorityApi } from "../services/authority-api";
import { useAuth } from "../../auth/hooks/use-auth";

interface BankConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  documentId?: string | null;
  defaultAmountLakhs?: number;
  onSuccess: () => void;
}

export const BankConfirmationDialog: React.FC<BankConfirmationDialogProps> = ({
  isOpen,
  onClose,
  applicationId,
  documentId,
  defaultAmountLakhs = 100,
  onSuccess,
}) => {
  const { user } = useAuth();

  const [letterReference, setLetterReference] = useState("");
  const [letterDate, setLetterDate] = useState(new Date().toISOString().split("T")[0]);
  const [branchManagerName, setBranchManagerName] = useState("");
  const [confirmedAmountLakhs, setConfirmedAmountLakhs] = useState<number>(defaultAmountLakhs);
  const [isUnencumbered, setIsUnencumbered] = useState(true);
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!letterReference.trim()) {
      setErrorMsg("Official bank branch letter reference number is required.");
      return;
    }
    if (confirmedAmountLakhs <= 0 || isNaN(confirmedAmountLakhs)) {
      setErrorMsg("Confirmed deposit amount must be greater than 0.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await authorityApi.recordBankConfirmation(applicationId, {
        letterReference: letterReference.trim(),
        letterDate,
        recordingOfficer: user?.name || "Scrutiny Officer",
        branchManagerName: branchManagerName.trim() || undefined,
        confirmedAmountLakhs: Number(confirmedAmountLakhs),
        isUnencumbered,
        remarks: remarks.trim() || undefined,
        documentId: documentId || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record manual bank confirmation.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[1px] p-4">
      <div className="bg-white border border-[#D7DEDA] rounded-[3px] shadow-lg max-w-lg w-full p-6 text-[#172E33] relative animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#D7DEDA]">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#165A60] font-semibold">
              Officer Manual Action
            </div>
            <h3 className="text-base font-bold text-[#172E33] m-0">
              Record Bank Branch Confirmation Letter
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#5C6F73] hover:text-[#172E33] text-lg font-bold p-1 leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="my-3 p-3 bg-[#EBF2F1] border border-[#165A60]/20 rounded-[2px] text-xs text-[#165A60] leading-relaxed">
          <strong>Physical Letter Protocol:</strong> Use this form to record an official branch confirmation letter issued by the scheduled bank. FDR account numbers and documents are pulled directly from submitted evidence.
        </div>

        {errorMsg && (
          <div className="mb-3 p-2.5 bg-[#FDF2F2] border border-[#E8C5C5] rounded-[2px] text-xs text-[#9E2A2B]">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-[#172E33] mb-1">
              Bank Letter Reference Number <span className="text-[#9E2A2B]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. SBI/BPL/2026/CONF-4491"
              value={letterReference}
              onChange={(e) => setLetterReference(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-[#D7DEDA] rounded-[2px] focus:outline-none focus:border-[#165A60]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#172E33] mb-1">
                Letter Issue Date <span className="text-[#9E2A2B]">*</span>
              </label>
              <input
                type="date"
                required
                value={letterDate}
                onChange={(e) => setLetterDate(e.target.value)}
                className="w-full text-xs px-3 py-1.5 border border-[#D7DEDA] rounded-[2px] focus:outline-none focus:border-[#165A60]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172E33] mb-1">
                Confirmed Amount (₹ Lakhs) <span className="text-[#9E2A2B]">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={confirmedAmountLakhs}
                onChange={(e) => setConfirmedAmountLakhs(parseFloat(e.target.value) || 0)}
                className="w-full text-xs px-3 py-1.5 border border-[#D7DEDA] rounded-[2px] focus:outline-none focus:border-[#165A60]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172E33] mb-1">
              Branch Manager / Signatory Name
            </label>
            <input
              type="text"
              placeholder="e.g. Shri R. K. Sharma, Chief Manager"
              value={branchManagerName}
              onChange={(e) => setBranchManagerName(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-[#D7DEDA] rounded-[2px] focus:outline-none focus:border-[#165A60]"
            />
          </div>

          <div className="p-3 bg-[#FAFAF8] border border-[#D7DEDA] rounded-[2px]">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#172E33] font-medium">
              <input
                type="checkbox"
                checked={isUnencumbered}
                onChange={(e) => setIsUnencumbered(e.target.checked)}
                className="rounded border-[#D7DEDA] text-[#165A60] focus:ring-[#165A60]"
              />
              <span>Letter explicitly confirms deposit is unencumbered and free of any lien/charge</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172E33] mb-1">
              Officer Verification Remarks
            </label>
            <textarea
              rows={2}
              placeholder="Add physical file dispatch details, inward register number, or observations..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full text-xs px-3 py-1.5 border border-[#D7DEDA] rounded-[2px] focus:outline-none focus:border-[#165A60]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D7DEDA]">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs px-3 py-1.5 border-[#D7DEDA]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="text-xs bg-[#165A60] hover:bg-[#124B50] text-white px-4 py-1.5"
            >
              {isSubmitting ? "Recording..." : "Record Confirmation Letter"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
