import React from "react";
import type { PipelineStageItem, PipelineBottleneckItem } from "../types/ministry.types";

interface PortfolioPipelineLifecycleProps {
  stages: PipelineStageItem[];
  bottlenecks: PipelineBottleneckItem[];
  totalApplications: number;
}

export const PortfolioPipelineLifecycle: React.FC<PortfolioPipelineLifecycleProps> = ({
  stages,
  bottlenecks,
  totalApplications,
}) => {
  // If backend returns stages, use them. If not, default to 5 standard stages
  const displayStages =
    stages && stages.length >= 5
      ? stages
      : [
          {
            stageKey: "STAGE_1_INTAKE",
            stageName: "Received / registered",
            applicationCount: totalApplications,
            description: "Registered technical applications",
          },
          {
            stageKey: "STAGE_2_EXTRACTION",
            stageName: "Document extraction",
            applicationCount: 0,
            description: "Document ingestion & extraction",
          },
          {
            stageKey: "STAGE_3_SCRUTINY",
            stageName: "Regulatory scrutiny",
            applicationCount: 0,
            description: "Deterministic scrutiny evaluation",
          },
          {
            stageKey: "STAGE_4_AUTHORITY_VERIFICATION",
            stageName: "Verification / further review",
            applicationCount: 0,
            description: "Issuing authority verification & reviews",
          },
          {
            stageKey: "STAGE_5_DECISION_SUPPORT",
            stageName: "Ready for next administrative action",
            applicationCount: 0,
            description: "Compliant applications ready for committee",
          },
        ];

  // Determine bottleneck stage: from backend bottlenecks or stage 4 (Verification/review)
  const primaryBottleneck = bottlenecks && bottlenecks.length > 0 ? bottlenecks[0] : null;
  const bottleneckStageKey =
    primaryBottleneck?.stage === "EXTRACTION"
      ? "STAGE_2_EXTRACTION"
      : primaryBottleneck?.stage === "INTAKE_ASSIGNMENT"
      ? "STAGE_1_INTAKE"
      : "STAGE_4_AUTHORITY_VERIFICATION";

  const bottleneckStageObj =
    displayStages.find((s) => s.stageKey === bottleneckStageKey) || displayStages[3];

  const sumExpression = displayStages.map((s) => s.applicationCount).join(" + ");

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-bold text-[#172E33] m-0 tracking-tight">
          Five-stage lifecycle
        </h2>
        <span className="text-[11px] font-mono text-[#5C6F73]">
          Mutually exclusive stages · {sumExpression} = {totalApplications}
        </span>
      </div>

      {/* 5-Stage Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {displayStages.map((stage) => {
          const isBottleneck = stage.stageKey === bottleneckStageKey;

          return (
            <div
              key={stage.stageKey}
              className={`p-4 rounded-[3px] border transition-all flex flex-col justify-between min-h-[96px] ${
                isBottleneck
                  ? "bg-[#165A60] border-[#165A60] text-white shadow-sm"
                  : "bg-[#FAFAF8] border-[#D7DEDA] text-[#172E33]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[26px] font-bold tracking-tight leading-none ${
                    isBottleneck ? "text-white" : "text-[#172E33]"
                  }`}
                >
                  {stage.applicationCount}
                </span>
                <span
                  className={`text-sm font-mono ${
                    isBottleneck ? "text-white/80" : "text-[#165A60]"
                  }`}
                >
                  →
                </span>
              </div>
              <div
                className={`text-[12px] font-medium leading-tight mt-2 ${
                  isBottleneck ? "text-white" : "text-[#5C6F73]"
                }`}
              >
                {stage.stageName}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottleneck Summary Footnote */}
      <div className="text-[11px] text-[#94631F] font-mono">
        Bottleneck: {bottleneckStageObj?.stageName.toLowerCase()} · {bottleneckStageObj?.applicationCount} cases. &quot;Ready&quot; does not mean approved.
      </div>
    </div>
  );
};

