import React from "react";
import type { IntakeStepIndex } from "../types/intake.types";

interface IntakeStepperProps {
  currentStep: IntakeStepIndex;
  onStepClick?: (step: IntakeStepIndex) => void;
}

const STEPS: Array<{ index: IntakeStepIndex; stepNumber: string; label: string }> = [
  { index: 1, stepNumber: "STEP 01", label: "Institution details" },
  { index: 2, stepNumber: "STEP 02", label: "Document intake" },
  { index: 3, stepNumber: "STEP 03", label: "Extraction & validation" },
  { index: 4, stepNumber: "STEP 04", label: "Review & approve" },
  { index: 5, stepNumber: "STEP 05", label: "Submission result" },
];

export const IntakeStepper: React.FC<IntakeStepperProps> = ({ currentStep, onStepClick }) => {
  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-5 border border-[#D7DEDA] rounded-[2px] overflow-hidden select-none mb-6">
      {STEPS.map((step) => {
        const isActive = currentStep === step.index;
        const isCompleted = currentStep > step.index;
        const isInteractive = isCompleted && onStepClick;

        let bgClass = "bg-[#EBEAE5]";
        let stepNumberClass = "text-[#8A9B9D]";
        let labelClass = "text-[#5C6F73]";

        if (isActive) {
          bgClass = "bg-[#122B30]";
          stepNumberClass = "text-[#A0B0B2]";
          labelClass = "text-white font-semibold";
        } else if (isCompleted) {
          bgClass = "bg-[#EBEAE5]";
          stepNumberClass = "text-[#376850] font-medium";
          labelClass = "text-[#172E33] font-semibold";
        }

        return (
          <div
            key={step.index}
            onClick={() => {
              if (isInteractive) {
                onStepClick(step.index);
              }
            }}
            className={`px-4 py-3 border-r border-[#D7DEDA] last:border-r-0 flex flex-col justify-center transition-colors min-h-[58px] ${bgClass} ${
              isInteractive ? "cursor-pointer hover:bg-[#E2E0D8]" : ""
            }`}
          >
            <div className={`text-[10px] tracking-wider uppercase font-mono mb-0.5 ${stepNumberClass}`}>
              {isCompleted ? "✓ COMPLETE" : step.stepNumber}
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
