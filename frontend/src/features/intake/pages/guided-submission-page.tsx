import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IntakeProvider } from "../context/intake-context";
import { useIntake } from "../hooks/use-intake";
import { IntakeStepper } from "../components/intake-stepper";
import { InstitutionDetailsStep } from "../components/institution-details-step";
import { DocumentIntakeStep } from "../components/document-intake-step";
import { ExtractionValidationStep } from "../components/extraction-validation-step";
import { ReviewApproveStep } from "../components/review-approve-step";
import { CancelIntakeDialog } from "../components/cancel-intake-dialog";

const GuidedSubmissionContent: React.FC = () => {
  const navigate = useNavigate();
  const { currentStep, setCurrentStep, resetIntake } = useIntake();

  const [isCancelOpen, setIsCancelOpen] = useState(false);

  const handleCancelConfirm = () => {
    resetIntake();
    setIsCancelOpen(false);
    navigate("/officer/workbench");
  };

  const handleStepClick = (stepIndex: 1 | 2 | 3 | 4 | 5) => {
    if (stepIndex < currentStep) {
      setCurrentStep(stepIndex);
    }
  };

  const getPageTitle = () => {
    switch (currentStep) {
      case 1:
        return "Institution details";
      case 2:
        return "Document intake";
      case 3:
        return "Extraction & validation";
      case 4:
        return "Review & approve";
      default:
        return "Guided submission";
    }
  };

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-6">
      {/* Cancel Intake Confirmation Dialog */}
      <CancelIntakeDialog
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onConfirm={handleCancelConfirm}
      />

      {/* Top Breadcrumb & Heading Header */}
      <div className="mb-6">
        <div className="text-[10px] font-mono tracking-wider uppercase text-[#5C6F73] mb-1">
          OFFICER &nbsp;/&nbsp; AUTHORIZED INTAKE &nbsp;/&nbsp; 2026–27
        </div>
        <h1 className="text-[28px] font-bold text-[#172E33] tracking-tight m-0">
          {getPageTitle()}
        </h1>
        <p className="text-[13px] text-[#5C6F73] mt-1 m-0">
          Personnel-operated submission workflow. This is not an external applicant portal.
        </p>
      </div>

      {/* 5-Stage Stepper Strip */}
      <IntakeStepper currentStep={currentStep} onStepClick={handleStepClick} />

      {/* Dynamic Step Content */}
      {currentStep === 1 && (
        <InstitutionDetailsStep onCancelClick={() => setIsCancelOpen(true)} />
      )}
      {currentStep === 2 && (
        <DocumentIntakeStep onBoundaryProceed={() => setCurrentStep(3)} />
      )}
      {currentStep === 3 && (
        <ExtractionValidationStep onProceedToReview={() => setCurrentStep(4)} />
      )}
      {currentStep === 4 && <ReviewApproveStep />}

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
