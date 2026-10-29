import React, { useState } from "react";
import { apiClient } from "../../../shared/api/client";
import { Button } from "../../../shared/ui/button";
import { OfficerSelector } from "./officer-selector";
import type { ApplicationListItem } from "../../intake/types/intake.types";
import type { OfficerListItem } from "../types/allocation.types";

interface ApplicationInspectionAllocationModalProps {
  application: ApplicationListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAllocated: (applicationId: string, officerName: string) => void;
}

export const ApplicationInspectionAllocationModal: React.FC<
  ApplicationInspectionAllocationModalProps
> = ({ application, isOpen, onClose, onAllocated }) => {
  const [selectedOfficer, setSelectedOfficer] = useState<OfficerListItem | null>(null);
  const [allocationReason, setAllocationReason] = useState<string>(
    "Routine scrutiny workload assignment"
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !application) return null;

  const latestScrutiny = application.scrutinyReports?.[0];
  const submissionDate = application.createdAt
    ? new Date(application.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  const formatProgramCategory = (category: string | null) => {
    if (!category) return "—";
    switch (category) {
      case "ENGINEERING_AND_TECHNOLOGY":
        return "Engineering & Technology";
      case "MANAGEMENT":
        return "Management (MBA/PGDM)";
      case "PHARMACY":
        return "Pharmacy";
      case "ARCHITECTURE":
        return "Architecture & Planning";
      default:
        return category.replace(/_/g, " ");
    }
  };

  const getApplicationStatusBadge = (status: string) => {
    let bg = "bg-[#F0F2F2] text-[#5C6F73] border-[#D7DEDA]";
    let label = status.replace(/_/g, " ");

    if (
      status === "COMPLIANT" ||
      status === "EXTRACTION_COMPLETED" ||
      status === "SCRUTINY_COMPLETED"
    ) {
      bg = "bg-[#EAF3EE] text-[#245E3F] border-[#C8E6C9]";
      label = status === "COMPLIANT" ? "✓ Compliant" : status.replace(/_/g, " ");
    } else if (
      status === "DEFICIENCIES_DETECTED" ||
      status === "EXTRACTION_FAILED" ||
      status === "SCRUTINY_FAILED"
    ) {
      bg = "bg-[#FDF2F2] text-[#9E2A2B] border-[#E8C5C5]";
      label = status === "DEFICIENCIES_DETECTED" ? "! Deficiencies Detected" : status.replace(/_/g, " ");
    } else if (status === "PROCESSING_EXTRACTION") {
      bg = "bg-[#FFF9E6] text-[#8D6B00] border-[#FFE58F]";
      label = "⚡ Processing Extraction";
    } else if (status === "MANUAL_REVIEW_REQUIRED") {
      bg = "bg-[#FFF9E6] text-[#8D6B00] border-[#FFE58F]";
      label = "△ Manual Review Required";
    } else if (status === "SUBMITTED") {
      bg = "bg-[#EBEAE5] text-[#172E33] border-[#D7DEDA]";
      label = "Submitted";
    }

    return (
      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-[2px] border font-medium ${bg}`}>
        {label}
      </span>
    );
  };

  const getScrutinyOutcomeBadge = (overallStatus?: string) => {
    if (!overallStatus) {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-[2px] border bg-[#F0F2F2] text-[#8A9B9D] border-[#D7DEDA]">
          — Awaiting Scrutiny
        </span>
      );
    }

    let bg = "bg-[#F0F2F2] text-[#5C6F73] border-[#D7DEDA]";
    let label = overallStatus.replace(/_/g, " ");

    if (overallStatus === "COMPLIANT") {
      bg = "bg-[#EAF3EE] text-[#245E3F] border-[#C8E6C9]";
      label = "✓ Compliant";
    } else if (overallStatus === "DEFICIENCIES_DETECTED") {
      bg = "bg-[#FDF2F2] text-[#9E2A2B] border-[#E8C5C5]";
      label = "! Deficiencies Detected";
    } else if (overallStatus === "MANUAL_REVIEW_REQUIRED") {
      bg = "bg-[#FFF9E6] text-[#8D6B00] border-[#FFE58F]";
      label = "△ Needs Manual Review";
    } else if (overallStatus === "INSUFFICIENT_INPUT") {
      bg = "bg-[#F0F2F2] text-[#5C6F73] border-[#D7DEDA]";
      label = "○ Insufficient Input";
    }

    return (
      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-[2px] border font-semibold ${bg}`}>
        {label}
      </span>
    );
  };

  const handleAllocate = async () => {
    if (!selectedOfficer) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await apiClient<{ success: boolean; message?: string }>(
        `/applications/${application.id}/assign`,
        {
          method: "POST",
          body: JSON.stringify({
            officerId: selectedOfficer.id,
            reason: allocationReason.trim() || undefined,
          }),
        }
      );

      if (response && response.success) {
        onAllocated(application.id, selectedOfficer.name);
        onClose();
      } else {
        setErrorMessage("Failed to allocate officer. Please retry.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Allocation request failed.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div
        className="bg-white border border-[#D7DEDA] rounded-[3px] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Top Context Header */}
        <div className="px-6 py-4 bg-[#FAFAF8] border-b border-[#D7DEDA] flex items-center justify-between shrink-0">
          <div>
            <div className="text-[10px] font-mono tracking-wider uppercase text-[#5C6F73] flex items-center gap-2">
              <span>UNASSIGNED ALLOCATION QUEUE</span>
              <span>/</span>
              <span className="text-[#165A60] font-semibold">{application.applicationNumber}</span>
            </div>
            <h2 className="text-lg font-bold text-[#172E33] m-0 mt-0.5">
              {application.institutionName}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {getApplicationStatusBadge(application.status)}
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-[#8A9B9D] hover:text-[#172E33] text-lg font-mono p-1 rounded transition-colors disabled:opacity-50"
              title="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#F6F5F0]">
          {/* Section 1 & 2 Grid: Application Summary & Scrutiny State */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card A: Institutional Particulars */}
            <div className="bg-white border border-[#D7DEDA] rounded-[2px] p-4 shadow-2xs space-y-3">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#5C6F73] font-bold border-b border-[#D7DEDA]/50 pb-1.5">
                INSTITUTIONAL PARTICULARS
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#8A9B9D] block">
                    PROGRAM CATEGORY
                  </span>
                  <span className="font-semibold text-[#172E33] mt-0.5 block">
                    {formatProgramCategory(application.programCategory)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#8A9B9D] block">
                    PROPOSED INTAKE
                  </span>
                  <span className="font-semibold text-[#172E33] mt-0.5 block">
                    {application.proposedIntake ? `${application.proposedIntake} Approved Seats` : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#8A9B9D] block">
                    SUBMISSION DATE
                  </span>
                  <span className="font-mono text-[#5C6F73] mt-0.5 block">
                    {submissionDate}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#8A9B9D] block">
                    ALLOCATION STATUS
                  </span>
                  <span className="inline-block mt-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#FFF9E6] text-[#8D6B00] border border-[#FFE58F]">
                    Unassigned Desk Queue
                  </span>
                </div>
              </div>
            </div>

            {/* Card B: Scrutiny Findings */}
            <div className="bg-white border border-[#D7DEDA] rounded-[2px] p-4 shadow-2xs space-y-3">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#5C6F73] font-bold border-b border-[#D7DEDA]/50 pb-1.5 flex items-center justify-between">
                <span>DETERMINISTIC SCRUTINY</span>
                {getScrutinyOutcomeBadge(latestScrutiny?.overallStatus)}
              </div>
              {latestScrutiny ? (
                <div className="space-y-2">
                  <div className="text-xs font-mono text-[#172E33] flex items-center gap-3">
                    <span className="text-[#245E3F] font-bold">
                      {latestScrutiny.passedCount} pass
                    </span>
                    <span className="text-[#8A9B9D]">·</span>
                    <span
                      className={
                        latestScrutiny.deficiencyCount > 0
                          ? "text-[#9E2A2B] font-bold"
                          : "text-[#5C6F73]"
                      }
                    >
                      {latestScrutiny.deficiencyCount} defic.
                    </span>
                    <span className="text-[#8A9B9D]">·</span>
                    <span
                      className={
                        latestScrutiny.reviewCount > 0
                          ? "text-[#8D6B00] font-bold"
                          : "text-[#5C6F73]"
                      }
                    >
                      {latestScrutiny.reviewCount} rev.
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#5C6F73]">
                    {latestScrutiny.totalRulesRun
                      ? `${latestScrutiny.totalRulesRun} total statutory rules evaluated`
                      : "Persisted compliance scrutiny report"}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#8A9B9D] italic py-2">
                  No automated scrutiny report recorded yet. Application is in initial intake queue.
                </div>
              )}
            </div>
          </div>

          {/* Card C: Staged Documents Evidence Manifest */}
          <div className="bg-white border border-[#D7DEDA] rounded-[2px] p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#D7DEDA]/50 pb-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#5C6F73] font-bold">
                STAGED STATUTORY EVIDENCE ITEMS
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EBEAE5] text-[#172E33]">
                {application.documents?.length || 0} document{application.documents?.length === 1 ? "" : "s"}
              </span>
            </div>

            {application.documents && application.documents.length > 0 ? (
              <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-[#D7DEDA]/30">
                {application.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="pt-1.5 first:pt-0 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-[#172E33] truncate block">
                        {doc.originalName || doc.fileName}
                      </span>
                      <span className="text-[10px] font-mono text-[#5C6F73]">
                        {doc.documentType?.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] border ${
                          doc.extractionStatus === "SUCCESS"
                            ? "bg-[#EAF3EE] text-[#245E3F] border-[#C8E6C9]"
                            : doc.extractionStatus === "FAILED"
                            ? "bg-[#FDF2F2] text-[#9E2A2B] border-[#E8C5C5]"
                            : "bg-[#FFF9E6] text-[#8D6B00] border-[#FFE58F]"
                        }`}
                      >
                        {doc.extractionStatus || "PENDING"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-[#8A9B9D] italic py-2">
                No statutory documents currently registered in this application manifest.
              </div>
            )}
          </div>

          {/* Section 3: Officer Allocation Action */}
          <div className="bg-white border border-[#D7DEDA] rounded-[2px] p-4 shadow-2xs space-y-3">
            <div className="border-b border-[#D7DEDA]/50 pb-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#172E33] font-bold">
                ALLOCATE DESK SCRUTINY OFFICER *
              </span>
              <p className="text-[11px] text-[#5C6F73] mt-0.5 m-0">
                Search and select an active scrutiny officer to assign desk responsibility for statutory evaluation.
              </p>
            </div>

            {/* Searchable Officer Selector Component */}
            <OfficerSelector
              selectedOfficerId={selectedOfficer?.id || null}
              onSelectOfficer={(officer) => setSelectedOfficer(officer)}
              disabled={isSubmitting}
            />

            {/* Selected Officer Confirmation Banner */}
            {selectedOfficer && (
              <div className="p-3 bg-[#EAF3EE] border border-[#165A60]/30 rounded-[2px] text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#245E3F] font-bold block">
                    SELECTED FOR ALLOCATION
                  </span>
                  <span className="font-semibold text-[#172E33] mt-0.5 block">
                    {selectedOfficer.name} · {selectedOfficer.designation}
                  </span>
                  <span className="text-[10px] font-mono text-[#5C6F73]">
                    {selectedOfficer.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOfficer(null)}
                  disabled={isSubmitting}
                  className="text-xs text-[#A14637] hover:underline px-2 py-1 font-medium disabled:opacity-50"
                >
                  Change
                </button>
              </div>
            )}

            {/* Allocation Remarks / Reason Input */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#5C6F73] mb-1">
                Allocation Note / Justification (Audit Record)
              </label>
              <input
                type="text"
                value={allocationReason}
                onChange={(e) => setAllocationReason(e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g. Routine scrutiny workload assignment..."
                className="w-full text-[12px] bg-white border border-[#D7DEDA] rounded-[2px] px-3 py-1.5 text-[#172E33] placeholder-[#8A9B9D] focus:outline-none focus:border-[#165A60] disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="px-6 py-2.5 bg-[#FDF2F2] border-t border-[#E8C5C5] text-[#9E2A2B] text-xs font-medium shrink-0">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Modal Action Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-[#D7DEDA] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[#5C6F73]">
            Allocation assigns primary case authority. Logged in statutory audit trail.
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs font-medium px-4 py-2 border-[#D7DEDA] text-[#172E33] rounded-[3px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAllocate}
              disabled={!selectedOfficer || isSubmitting}
              className={`text-xs font-medium px-5 py-2 rounded-[3px] shadow-sm inline-flex items-center gap-1.5 transition-colors ${
                selectedOfficer && !isSubmitting
                  ? "bg-[#165A60] hover:bg-[#122B30] text-white cursor-pointer"
                  : "bg-[#D7DEDA] text-[#8A9B9D] cursor-not-allowed"
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block animate-spin mr-1">◌</span>
                  Allocating officer...
                </>
              ) : (
                "Allocate officer →"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
