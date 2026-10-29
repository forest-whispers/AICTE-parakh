import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../shared/ui/button";
import { ministryApi } from "../services/ministry-api";
import { PortfolioKpiSummary } from "../components/portfolio-kpi-summary";
import { PortfolioPipelineLifecycle } from "../components/portfolio-pipeline-lifecycle";
import { PortfolioIssuesTable } from "../components/portfolio-issues-table";
import { OfficerWorkloadCard } from "../components/officer-workload-card";
import { RecentActivityCard } from "../components/recent-activity-card";
import type { MinistryDashboardData } from "../types/ministry.types";

export const MinistryDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState<MinistryDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await ministryApi.getDashboard();
      setDashboard(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load ministry portfolio overview.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    ministryApi
      .getDashboard()
      .then((data) => {
        if (!ignore) {
          setDashboard(data);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const msg =
            err instanceof Error ? err.message : "Failed to load ministry portfolio overview.";
          setErrorMessage(msg);
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Format current date for subtitle matching Figma "28 October 2026 · 10:00 IST · Academic year 2026–27"
  const formattedSubtitle = `${new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })} · Academic year 2026–27`;

  if (isLoading && !dashboard) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-8 animate-pulse space-y-8 select-none">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-4 bg-[#EBEAE5] rounded w-48" />
            <div className="h-8 bg-[#EBEAE5] rounded w-80" />
            <div className="h-3 bg-[#EBEAE5] rounded w-64" />
          </div>
          <div className="h-9 bg-[#EBEAE5] rounded w-44" />
        </div>
        <div className="h-28 bg-[#EBEAE5] rounded-[3px]" />
        <div className="h-32 bg-[#EBEAE5] rounded-[3px]" />
        <div className="h-72 bg-[#EBEAE5] rounded-[3px]" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-56 bg-[#EBEAE5] rounded-[3px]" />
          <div className="h-56 bg-[#EBEAE5] rounded-[3px]" />
        </div>
      </div>
    );
  }

  if (errorMessage && !dashboard) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-10">
        <div className="p-6 bg-[#FDF2F2] border border-[#E8C5C5] rounded-[3px] text-[#9E2A2B] space-y-3">
          <h2 className="text-[18px] font-bold m-0">Failed to Load Portfolio Overview</h2>
          <p className="text-[13px] m-0">{errorMessage}</p>
          <Button
            type="button"
            variant="secondary"
            onClick={fetchDashboard}
            className="text-[12px] bg-white border-[#E8C5C5] text-[#9E2A2B] px-3.5 py-1.5"
          >
            ↻ Retry Loading Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-6 select-none space-y-8">
      {/* Top Header & Breadcrumb Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono tracking-wider uppercase text-[#5C6F73] mb-1 font-semibold">
            MINISTRY / PORTFOLIO OVERVIEW
          </div>
          <h1 className="text-[28px] font-bold text-[#172E33] tracking-tight m-0">
            Portfolio oversight
          </h1>
          <p className="text-[12px] text-[#5C6F73] mt-1 m-0 font-mono">
            {formattedSubtitle}
          </p>
        </div>

        {/* Primary Action Button */}
        <Button
          type="button"
          onClick={() => navigate("/ministry/allocation")}
          className="bg-[#165A60] hover:bg-[#122B30] text-white text-[12px] font-medium px-4 py-2 rounded-[2px] shadow-xs self-start sm:self-center"
        >
          Allocate applications
        </Button>
      </div>

      {/* Section 1: KPI Summary & Issue Category Filter Pills */}
      <PortfolioKpiSummary metrics={dashboard.overview.metrics} />

      {/* Section 2: Five-Stage Pipeline Lifecycle */}
      <PortfolioPipelineLifecycle
        stages={dashboard.overview.pipeline}
        bottlenecks={dashboard.overview.bottlenecks}
        totalApplications={dashboard.overview.totalApplications}
      />

      {/* Section 3: Issues Requiring Attention Register */}
      <PortfolioIssuesTable
        issues={dashboard.issues.issues}
        totalCount={dashboard.issues.total}
      />

      {/* Section 4: Officer Workload & Recent Ministry Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <OfficerWorkloadCard workload={dashboard.workload} />
        <RecentActivityCard activity={dashboard.recentActivity} />
      </div>

      {/* Section 5: Standard Legal / Governance Disclaimer Footer */}
      <div className="text-center text-[11px] text-[#8A9B9D] pt-4 pb-6 border-t border-[#D7DEDA]/60">
        Decision support only. Computed findings do not constitute approval or rejection. All institutions and records shown are synthetic.
      </div>
    </div>
  );
};

