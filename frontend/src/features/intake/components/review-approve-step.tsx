import React, { useState } from "react";
import { useIntake } from "../hooks/use-intake";
import { Button } from "../../../shared/ui/button";
import { ApprovalBoundaryDialog } from "./approval-boundary-dialog";
import { computeDocumentValidationOutcome } from "../utils/validation-state";
import { useAuth } from "../../auth/hooks/use-auth";

export const ReviewApproveStep: React.FC = () => {
  const { user } = useAuth();
  const isMinistryAdmin = user?.role === "MINISTRY_ADMIN";

  const {
    setCurrentStep,
    institutionDetails,
    stagedDocuments,
    missingRequiredCategories,
    createdApplication,
    latestScrutinyReport,
    isScrutinyStale,
    isExistingApplicationMode,
  } = useIntake();

  const [isAttested, setIsAttested] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  const missingCount = missingRequiredCategories.length;
  const hasErrors = missingCount > 0;

  // Format program category human-readable
  const programCategoryLabel =
    institutionDetails.programCategory === "ENGINEERING_AND_TECHNOLOGY"
      ? "Engineering & Technology"
      : institutionDetails.programCategory === "MANAGEMENT"
      ? "Management (MBA / PGDM)"
      : institutionDetails.programCategory === "PHARMACY"
      ? "Pharmacy"
      : institutionDetails.programCategory === "ARCHITECTURE"
      ? "Architecture & Planning"
      : institutionDetails.programCategory || "Engineering & Technology";

  return (
    <div>
      {/* Factually Accurate Approval Boundary Dialog */}
      <ApprovalBoundaryDialog
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        institutionName={institutionDetails.institutionName}
        applicationNumber={institutionDetails.applicationNumber}
        stagedDocumentCount={stagedDocuments.length}
      />

      {/* Scrutiny Stale Warning Banner */}
      {isScrutinyStale && (
        <div className="mb-6 bg-[#FEF7EC] border border-[#FFE58F] rounded-[3px] p-4 text-[#8D6B00] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <h4 className="text-[14px] font-bold m-0 text-[#172E33]">
                Scrutiny Evaluation Out of Date
              </h4>
              <p className="text-[12px] text-[#5C6F73] mt-1 mb-0 leading-relaxed">
                One or more documents have officer-reviewed evidence that has not yet been re-evaluated by the statutory compliance engine. Return to Step 3 to refresh scrutiny before final approval.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setCurrentStep(3)}
            className="text-[12px] font-medium border-[#FFE58F] bg-white text-[#8D6B00] hover:bg-[#FFF9E6] px-3.5 py-1.5 rounded-[2px] shrink-0 self-start sm:self-auto"
          >
            Go to Step 3 →
          </Button>
        </div>
      )}

      {/* Main 2-Column Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Particulars & Document Manifest (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Institution Particulars */}
          <div className="bg-white border border-[#D7DEDA] rounded-[2px] shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#D7DEDA] bg-[#FAFAF8] flex items-center justify-between">
              <div className="text-[14px] font-bold text-[#172E33]">
                Institution particulars
              </div>
              {!isExistingApplicationMode && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-[12px] font-medium text-[#165A60] hover:underline"
                >
                  Edit step 1 →
                </button>
              )}
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
              <div>
                <div className="text-[10px] font-mono uppercase text-[#8A9B9D] tracking-wider">
                  INSTITUTION NAME
                </div>
                <div className="font-semibold text-[#172E33] mt-0.5">
                  {institutionDetails.institutionName || "—"}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono uppercase text-[#8A9B9D] tracking-wider">
                  APPLICATION NUMBER
                </div>
                <div className="font-mono font-semibold text-[#172E33] mt-0.5">
                  {institutionDetails.applicationNumber || "AICTE-2026-9041"}
                </div>
                {createdApplication && (
                  <div className="text-[10px] font-mono text-[#245E3F] mt-0.5">
                    DB ID: {createdApplication.id}
                  </div>
                )}
              </div>

              <div>
                <div className="text-[10px] font-mono uppercase text-[#8A9B9D] tracking-wider">
                  PROGRAM CATEGORY
                </div>
                <div className="text-[#172E33] mt-0.5">
                  {programCategoryLabel}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono uppercase text-[#8A9B9D] tracking-wider">
                  PROPOSED ANNUAL INTAKE
                </div>
                <div className="text-[#172E33] mt-0.5">
                  {institutionDetails.proposedIntake
                    ? `${institutionDetails.proposedIntake} Approved Seats`
                    : "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Document Manifest */}
          <div className="bg-white border border-[#D7DEDA] rounded-[2px] shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#D7DEDA] bg-[#FAFAF8] flex items-center justify-between">
              <div>
                <div className="text-[14px] font-bold text-[#172E33]">
                  Document manifest
                </div>
                <div className="text-[11px] text-[#5C6F73] mt-0.5">
                  Source evidence files staged for authorized ingestion
                </div>
              </div>
              {!isExistingApplicationMode && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="text-[12px] font-medium text-[#165A60] hover:underline"
                >
                  Edit step 2 →
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#D7DEDA] bg-[#F6F5F0] text-[10px] font-mono tracking-wider text-[#5C6F73] uppercase">
                    <th className="py-2.5 px-4 font-semibold">Category</th>
                    <th className="py-2.5 px-4 font-semibold">Source File</th>
                    <th className="py-2.5 px-4 font-semibold text-right">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D7DEDA] text-[13px]">
                  {stagedDocuments.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-[#8A9B9D]">
                        No documents staged.
                      </td>
                    </tr>
                  ) : (
                    stagedDocuments.map((doc) => {
                      const valBadge = computeDocumentValidationOutcome(
                        doc,
                        latestScrutinyReport || createdApplication?.scrutinyReports?.[0]
                      );

                      return (
                        <tr key={doc.id} className="hover:bg-[#FAFAF8]">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[#172E33]">
                              {doc.categoryLabel}
                            </div>
                            <div className="text-[10px] font-mono text-[#8A9B9D]">
                              {doc.categoryCode} · Ref: {doc.issuingReference}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-mono text-[12px] text-[#165A60] font-medium">
                              {doc.fileName}
                            </div>
                            <div className="text-[11px] text-[#8A9B9D]">
                              {doc.formattedSize}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`text-[11px] font-mono px-2 py-0.5 rounded-[2px] border ${valBadge.bgClass}`}
                            >
                              {valBadge.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Preliminary Validation & Officer Attestation (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Preliminary Validation Summary */}
          <div className="bg-white border border-[#D7DEDA] rounded-[2px] shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-[14px] font-bold text-[#172E33]">
                Preliminary validation
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="text-[12px] font-medium text-[#165A60] hover:underline"
              >
                Review step 3 →
              </button>
            </div>

            {/* Validation Outcome Pill */}
            <div>
              {latestScrutinyReport?.overallStatus === "DEFICIENCIES_DETECTED" || hasErrors ? (
                <div className="p-3 bg-[#FDF2F2] border border-[#E8C5C5] rounded-[2px] text-[12px] text-[#9E2A2B]">
                  <strong>Deficiencies detected in scrutiny.</strong> Regulatory findings must be resolved.
                </div>
              ) : latestScrutinyReport?.overallStatus === "MANUAL_REVIEW_REQUIRED" ? (
                <div className="p-3 bg-[#FFF9E6] border border-[#FFE58F] rounded-[2px] text-[12px] text-[#8D6B00]">
                  <strong>Needs manual approval.</strong> Ambiguous evidence requires officer review.
                </div>
              ) : (
                <div className="p-3 bg-[#EAF3EE] border border-[#C8E6C9] rounded-[2px] text-[12px] text-[#245E3F] flex items-center gap-2">
                  <span className="text-base font-bold">✓</span>
                  <span>
                    <strong>0 blocking validation errors.</strong> All intake prerequisites verified.
                  </span>
                </div>
              )}
            </div>

            {/* Checklist items */}
            <div className="space-y-2 text-[12px] text-[#172E33]">
              <div className="flex items-center gap-2">
                <span className="text-[#245E3F] font-bold">✓</span>
                <span>Institution particulars complete and formatted</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={missingCount === 0 ? "text-[#245E3F] font-bold" : "text-[#A14637] font-bold"}>
                  {missingCount === 0 ? "✓" : "✗"}
                </span>
                <span>Mandatory statutory categories staged ({stagedDocuments.length} files)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#245E3F] font-bold">✓</span>
                <span>Source file formats verified (PDF &amp; Image formats)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#245E3F] font-bold">✓</span>
                <span>Issuing authority references recorded</span>
              </div>
            </div>

            {/* Advisory Note */}
            <p className="text-[11px] text-[#8A9B9D] m-0 leading-relaxed pt-3 border-t border-[#D7DEDA]">
              Advisory notice: Preliminary validation checks file availability and local format
              compliance. Formal statutory evaluation occurs via the AICTE regulatory scrutiny engine.
            </p>
          </div>

          {/* Card 2: Officer Attestation & Approval OR Ministry Oversight Notice */}
          <div className="bg-white border border-[#D7DEDA] rounded-[2px] shadow-sm p-5 space-y-4">
            <div className="text-[14px] font-bold text-[#172E33]">
              {isMinistryAdmin
                ? "Ministry oversight & segregation of duties"
                : "Officer authorization & submission"}
            </div>

            {isMinistryAdmin ? (
              <div className="space-y-3">
                <p className="text-[12px] text-[#5C6F73] m-0 leading-relaxed">
                  Under statutory regulatory governance, application approval and intake certification are strictly reserved for the authorized processing officer assigned to this case. Ministry administrators have full visibility to audit all findings and evidence.
                </p>
                <div className="p-3 bg-[#EAEFEF] border border-[#165A60]/20 rounded-[2px] text-[11px] text-[#165A60] font-mono">
                  ◉ Mode: Oversight Inspection Only (Approval controls disabled)
                </div>
              </div>
            ) : (
              <>
                <p className="text-[12px] text-[#5C6F73] m-0 leading-relaxed">
                  As an authorized processing officer, certify that the institution particulars and document
                  manifest have been collected in accordance with AICTE Approval Process Handbook (APH)
                  2026–27.
                </p>

                {/* Attestation Checkbox */}
                <label className="flex items-start gap-3 p-3 bg-[#FAFAF8] border border-[#D7DEDA] rounded-[2px] cursor-pointer hover:bg-[#F4F6F5] transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={isAttested}
                    onChange={(e) => setIsAttested(e.target.checked)}
                    className="mt-0.5 rounded-[2px] border-[#D7DEDA] text-[#165A60] focus:ring-[#165A60]"
                  />
                  <span className="text-[12px] text-[#172E33] leading-snug">
                    I have reviewed the entered particulars and source document manifest for authorized
                    submission.
                  </span>
                </label>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-8 border-t border-[#D7DEDA]">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setCurrentStep(3)}
          className="w-full sm:w-auto bg-white border-[#D7DEDA] text-[#172E33] hover:bg-neutral-50 px-4 py-2.5 rounded-[3px] text-[13px] font-medium inline-flex items-center gap-1.5"
        >
          ← Back
        </Button>

        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-4">
          <span className="text-[12px] text-[#5C6F73]">
            {isMinistryAdmin
              ? "Ministry oversight inspection mode · Read-only"
              : "Final review · Approval pending authorized intake authorization"}
          </span>
          {!isMinistryAdmin && (
            <Button
              type="button"
              onClick={() => setIsApprovalModalOpen(true)}
              disabled={!isAttested || hasErrors}
              className={`px-5 py-2.5 rounded-[3px] text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors ${
                isAttested && !hasErrors
                  ? "bg-[#165A60] hover:bg-[#122B30] text-white cursor-pointer"
                  : "bg-[#D7DEDA] text-[#8A9B9D] cursor-not-allowed"
              }`}
            >
              Approve application
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
