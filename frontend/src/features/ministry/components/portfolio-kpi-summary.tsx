import React from "react";
import { useNavigate } from "react-router-dom";
import type { PortfolioOverviewMetrics } from "../types/ministry.types";

interface PortfolioKpiSummaryProps {
  metrics: PortfolioOverviewMetrics;
}

export const PortfolioKpiSummary: React.FC<PortfolioKpiSummaryProps> = ({ metrics }) => {
  const navigate = useNavigate();

  const issuePills = [
    {
      label: `Extraction failures · ${metrics.extractionFailures}`,
      metricKey: "extraction_failures",
      path: "/ministry/portfolio?metric=extraction_failures",
    },
    {
      label: `Incomplete submissions · ${metrics.incompleteSubmissions}`,
      metricKey: "incomplete_submissions",
      path: "/ministry/portfolio?metric=incomplete_submissions",
    },
    {
      label: `Scrutiny deficiencies · ${metrics.scrutinyDeficiencies}`,
      metricKey: "scrutiny_deficiencies",
      path: "/ministry/portfolio?metric=scrutiny_deficiencies",
    },
    {
      label: `Manual review · ${metrics.manualReviewRequired}`,
      metricKey: "manual_review",
      path: "/ministry/portfolio?metric=manual_review",
    },
    {
      label: `Pending authority confirmation · ${metrics.pendingAuthorityConfirmations}`,
      metricKey: "pending_confirmations",
      path: "/ministry/portfolio?metric=pending_confirmations",
    },
    {
      label: `Authority mismatch / expiry · ${metrics.unresolvedAuthorityMismatches}`,
      metricKey: "authority_mismatches",
      path: "/ministry/portfolio?metric=authority_mismatches",
    },
    {
      label: `Forensic advisories · ${metrics.unresolvedForensicAnomalies}`,
      metricKey: "forensic_anomalies",
      path: "/ministry/portfolio?metric=forensic_anomalies",
    },
    {
      label: `Aging >7 days · ${metrics.agingApplications}`,
      metricKey: "aging_applications",
      path: "/ministry/portfolio?metric=aging_applications",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top 3 Primary Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start pb-6 border-b border-[#D7DEDA]">
        {/* Metric 1: Total Applications */}
        <div className="md:col-span-3">
          <div className="text-[44px] font-bold text-[#172E33] tracking-tight leading-none">
            {metrics.totalApplications}
          </div>
          <button
            type="button"
            onClick={() => navigate("/ministry/portfolio")}
            className="text-[13px] text-[#165A60] hover:text-[#122B30] hover:underline font-mono mt-2 inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Total applications</span>
            <span>→</span>
          </button>
        </div>

        {/* Metric 2: Awaiting Attention */}
        <div className="md:col-span-4">
          <div className="text-[44px] font-bold text-[#94631F] tracking-tight leading-none">
            {metrics.awaitingAttention}
          </div>
          <button
            type="button"
            onClick={() => navigate("/ministry/portfolio?status=unresolved")}
            className="text-[13px] text-[#165A60] hover:text-[#122B30] hover:underline font-mono mt-2 inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Awaiting attention · filter: unresolved</span>
            <span>→</span>
          </button>
        </div>

        {/* Metric 3: Unassigned Exceptions */}
        <div className="md:col-span-3">
          <div className="text-[44px] font-bold text-[#172E33] tracking-tight leading-none">
            {metrics.unassignedExceptions}
          </div>
          <button
            type="button"
            onClick={() => navigate("/ministry/allocation")}
            className="text-[13px] text-[#165A60] hover:text-[#122B30] hover:underline font-mono mt-2 inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Unassigned · filter: no officer</span>
            <span>→</span>
          </button>
        </div>

        {/* Right Explanatory Note */}
        <div className="md:col-span-2 text-[11px] text-[#5C6F73] leading-relaxed border-l border-[#D7DEDA] pl-4 md:pl-5">
          Oversight only. Findings and verification remain read-only; allocation is permitted.
        </div>
      </div>

      {/* Horizontal Issue Category Filter Pills */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          {issuePills.map((pill) => (
            <button
              key={pill.metricKey}
              type="button"
              onClick={() => navigate(pill.path)}
              className="px-2.5 py-1.5 rounded-[2px] bg-white border border-[#D7DEDA] hover:border-[#165A60] hover:bg-[#F6F5F0] text-[12px] text-[#172E33] font-mono transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span>{pill.label}</span>
              <span className="text-[#5C6F73] text-[11px]">↗</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[#5C6F73] mt-2 mb-0 font-sans">
          Issue counts overlap; an application may appear in multiple groups.
        </p>
      </div>
    </div>
  );
};

