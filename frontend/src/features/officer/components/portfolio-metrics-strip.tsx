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
  const metrics = [
    {
      id: "active",
      value: overview.activeAssigned,
      label: `Active of ${overview.totalAssigned} assigned →`,
      color: "text-[#172E33]",
      badgeColor: "text-[#165A60]",
    },
    {
      id: "compliant",
      value: overview.compliantCount,
      label: "Computed compliant →",
      color: "text-[#172E33]",
      badgeColor: "text-[#376850]",
    },
    {
      id: "deficient",
      value: overview.deficienciesCount,
      label: "Deficient →",
      color: overview.deficienciesCount > 0 ? "text-[#A14637]" : "text-[#172E33]",
      badgeColor: "text-[#A14637]",
    },
    {
      id: "manual",
      value: overview.manualReviewCount,
      label: "Manual review →",
      color: overview.manualReviewCount > 0 ? "text-[#94631F]" : "text-[#172E33]",
      badgeColor: "text-[#94631F]",
    },
    {
      id: "pending_bank",
      value: overview.pendingConfirmationsCount,
      label: "Pending bank →",
      color: "text-[#172E33]",
      badgeColor: "text-[#165A60]",
    },
    {
      id: "unread",
      value: overview.unreadNotificationsCount,
      label: "Unread →",
      color: "text-[#172E33]",
      badgeColor: "text-[#165A60]",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
      {metrics.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onMetricClick(m.label)}
          className="bg-white border border-[#D7DEDA] rounded-[3px] p-4 text-left hover:border-[#165A60] hover:shadow-subtle transition-all select-none group"
        >
          <div className={`text-2xl sm:text-3xl font-bold tracking-tight mb-1 font-mono ${m.color}`}>
            {m.value}
          </div>
          <div className="text-[11px] sm:text-xs text-[#5C6F73] group-hover:text-[#172E33] transition-colors leading-tight font-medium flex items-center justify-between">
            <span>{m.label}</span>
          </div>
        </button>
      ))}
    </div>
  );
};
