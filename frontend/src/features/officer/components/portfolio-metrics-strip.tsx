import React from "react";
import type { WorkbenchOverview } from "../types/workbench.types";

interface PortfolioMetricsStripProps {
  overview: WorkbenchOverview;
  onMetricClick: (label: string) => void;
}

export const PortfolioMetricsStrip: React.FC<PortfolioMetricsStripProps> = ({
  overview,
  onMetricClick,
}) => {
  const secondaryMetrics = [
    {
      id: "compliant",
      value: overview.compliantCount,
      label: "Computed compliant →",
      width: "w-[170px]",
    },
    {
      id: "deficient",
      value: overview.deficienciesCount,
      label: "Deficient →",
      width: "w-[170px]",
    },
    {
      id: "manual",
      value: overview.manualReviewCount,
      label: "Manual review →",
      width: "w-[170px]",
    },
    {
      id: "pending_bank",
      value: overview.pendingConfirmationsCount,
      label: "Pending bank →",
      width: "w-[140px]",
    },
    {
      id: "unread",
      value: overview.unreadNotificationsCount,
      label: "Unread →",
      width: "w-[140px]",
    },
  ];

  return (
    <div className="flex flex-wrap items-end my-8 select-none">
      {/* Primary Metric: Active of assigned (Larger number & wider space per Figma 08) */}
      <button
        type="button"
        onClick={() => onMetricClick(`Active of ${overview.totalAssigned} assigned`)}
        className="text-left select-none group p-0 bg-transparent border-0 focus:outline-none cursor-pointer w-[240px] sm:w-[260px] mr-8 sm:mr-12 shrink-0"
      >
        <div className="text-[44px] font-bold font-mono text-[#000000] tracking-tight leading-none mb-2">
          {overview.activeAssigned}
        </div>
        <div className="text-xs text-[#2B686D] group-hover:underline transition-colors leading-tight font-normal">
          Active of {overview.totalAssigned} assigned →
        </div>
      </button>

      {/* Secondary Metrics: Evenly distributed with exact Figma colors & typography */}
      <div className="flex flex-wrap items-end gap-x-8 sm:gap-x-12 gap-y-4">
        {secondaryMetrics.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onMetricClick(m.label)}
            className="text-left select-none group p-0 bg-transparent border-0 focus:outline-none cursor-pointer shrink-0"
          >
            <div className="text-[28px] font-bold font-mono text-[#000000] tracking-tight leading-none mb-2">
              {m.value}
            </div>
            <div className="text-xs text-[#2B686D] group-hover:underline transition-colors leading-tight font-normal">
              {m.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
