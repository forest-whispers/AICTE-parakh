import React from "react";
import type { IntakeStepIndex } from "../types/intake.types";

interface IntakeStepperProps {
  currentStep: IntakeStepIndex;
  onStepClick?: (step: IntakeStepIndex) => void;
  disabledSteps?: number[];
}

const STEPS: Array<{ index: IntakeStepIndex; stepNumber: string; label: string }> = [
  { index: 1, stepNumber: "STEP 01", label: "Institution details" },
  { index: 2, stepNumber: "STEP 02", label: "Document intake" },
  { index: 3, stepNumber: "STEP 03", label: "Extraction & validation" },
  { index: 4, stepNumber: "STEP 04", label: "Review & approve" },
  { index: 5, stepNumber: "STEP 05", label: "Submission result" },
];

export const IntakeStepper: React.FC<IntakeStepperProps> = ({
  currentStep,
  onStepClick,
  disabledSteps = [],
}) => {
  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-5 border border-[#D7DEDA] rounded-[2px] overflow-hidden select-none mb-6">
      {STEPS.map((step) => {
        const isDisabled = disabledSteps.includes(step.index);
        const isActive = currentStep === step.index;
        const isCompleted = currentStep > step.index && !isDisabled;
        const isInteractive = isCompleted && onStepClick && !isDisabled;

        let bgClass = "bg-[#EBEAE5]";
        let stepNumberClass = "text-[#8A9B9D]";
        let labelClass = "text-[#5C6F73]";
        let stepBadgeText = step.stepNumber;

        if (isDisabled) {
          bgClass = "bg-[#EBEAE5]/80";
          stepNumberClass = "text-[#8A9B9D]";
          labelClass = "text-[#8A9B9D]";
          stepBadgeText = "🔒 LOCKED";
        } else if (isActive) {
          bgClass = "bg-[#122B30]";
          stepNumberClass = "text-[#A0B0B2]";
          labelClass = "text-white font-semibold";
        } else if (isCompleted) {
          bgClass = "bg-[#EBEAE5]";
          stepNumberClass = "text-[#376850] font-medium";
          labelClass = "text-[#172E33] font-semibold";
          stepBadgeText = "✓ COMPLETE";
        }

        return (
          <div
            key={step.index}
            onClick={() => {
              if (isInteractive && !isDisabled) {
                onStepClick(step.index);
              }
            }}
            title={
              isDisabled
                ? "Intake particulars and files are permanently locked for existing applications"
                : undefined
            }
            className={`px-4 py-3 border-r border-[#D7DEDA] last:border-r-0 flex flex-col justify-center transition-colors min-h-[58px] ${bgClass} ${
              isDisabled
                ? "cursor-not-allowed select-none"
                : isInteractive
                ? "cursor-pointer hover:bg-[#E2E0D8]"
                : ""
            }`}
          >
            <div className={`text-[10px] tracking-wider uppercase font-mono mb-0.5 ${stepNumberClass}`}>
              {stepBadgeText}
            </div>
            <div className={`text-[13px] tracking-tight truncate ${labelClass}`}>
              {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};
