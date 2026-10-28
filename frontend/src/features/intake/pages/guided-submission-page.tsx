import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IntakeProvider } from "../context/intake-context";
import { useIntake } from "../hooks/use-intake";
import { IntakeStepper } from "../components/intake-stepper";
import { InstitutionDetailsStep } from "../components/institution-details-step";
import { DocumentIntakeStep } from "../components/document-intake-step";
import { CancelIntakeDialog } from "../components/cancel-intake-dialog";
import { PlannedFeatureDialog } from "../../../shared/ui/planned-feature-dialog";

const GuidedSubmissionContent: React.FC = () => {
  const navigate = useNavigate();
  const { currentStep, setCurrentStep, resetIntake, institutionDetails, stagedDocuments } = useIntake();

  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isBoundaryModalOpen, setIsBoundaryModalOpen] = useState(false);

  const handleCancelConfirm = () => {
    resetIntake();
    setIsCancelOpen(false);
    navigate("/officer/workbench");
  };

  const handleStepClick = (stepIndex: 1 | 2 | 3 | 4 | 5) => {
    if (stepIndex === 1 && currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const pageTitle = currentStep === 1 ? "Institution details" : "Document intake";

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-6">
      {/* Cancel Intake Confirmation Dialog */}
      <CancelIntakeDialog
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onConfirm={handleCancelConfirm}
      />

      {/* Slice Boundary Modal: Handover to Slice 3 (Step 3: Extraction & Validation) */}
      <PlannedFeatureDialog
        isOpen={isBoundaryModalOpen}
        onClose={() => setIsBoundaryModalOpen(false)}
        title="Intake Steps 1 & 2 Complete"
        description={`Application particulars for "${institutionDetails.institutionName || 'the institution'}" (Ref: ${institutionDetails.institutionApplicationReference || 'TCE/EOA/2026/019'}) and ${stagedDocuments.length} statutory document(s) have been verified and staged locally. Step 3 (Multimodal VLM Extraction & Deterministic Scrutiny) is scheduled for the subsequent slice.`}
        scheduledSlice="Frontend Slice 3 (Extraction & Validation)"
      />

      {/* Top Breadcrumb & Heading Header */}
      <div className="mb-6">
        <div className="text-[10px] font-mono tracking-wider uppercase text-[#5C6F73] mb-1">
          OFFICER &nbsp;/&nbsp; AUTHORIZED INTAKE &nbsp;/&nbsp; 2026–27
        </div>
        <h1 className="text-[28px] font-bold text-[#172E33] tracking-tight m-0">
          {pageTitle}
        </h1>
        <p className="text-[13px] text-[#5C6F73] mt-1 m-0">
          Personnel-operated submission workflow. This is not an external applicant portal.
        </p>
      </div>

      {/* 5-Stage Stepper Strip */}
      <IntakeStepper currentStep={currentStep} onStepClick={handleStepClick} />

      {/* Dynamic Step Content */}
      {currentStep === 1 ? (
        <InstitutionDetailsStep onCancelClick={() => setIsCancelOpen(true)} />
      ) : (
        <DocumentIntakeStep onBoundaryProceed={() => setIsBoundaryModalOpen(true)} />
      )}

      {/* Footer Legal / Disclaimer Note */}
      <div className="text-center text-[11px] text-[#8A9B9D] mt-12 pb-6 select-none border-t border-[#D7DEDA]/40 pt-4">
        Decision support only. Computed findings do not constitute approval or rejection. All institutions and records shown are synthetic.
      </div>
    </div>
  );
};

export const GuidedSubmissionPage: React.FC = () => {
  return (
    <IntakeProvider>
      <GuidedSubmissionContent />
    </IntakeProvider>
  );
};
