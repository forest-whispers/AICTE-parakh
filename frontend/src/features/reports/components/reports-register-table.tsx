import React, { useEffect, useState, useCallback, useTransition } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../../shared/api/client";
import { Button } from "../../../shared/ui/button";
import type { ScrutinyReportListItem, PaginationMetadata } from "../types/reports.types";

interface ReportsRegisterTableProps {
  userRole: "OFFICER" | "MINISTRY_ADMIN";
  breadcrumb: string;
  pageTitle: string;
  pageSubtitle: string;
  showOfficerColumn?: boolean;
}

export const ReportsRegisterTable: React.FC<ReportsRegisterTableProps> = ({
  userRole,
  breadcrumb,
  pageTitle,
  pageSubtitle,
  showOfficerColumn = false,
}) => {
  const navigate = useNavigate();
  const [, startTransition] = useTransition();

  // Data state
  const [reports, setReports] = useState<ScrutinyReportListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter state
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [officerFilter, setOfficerFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [reloadCounter, setReloadCounter] = useState<number>(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setIsLoading(true);
        setDebouncedSearch(searchInput);
        setCurrentPage(1);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleStatusChange = (val: string) => {
    setIsLoading(true);
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleCategoryChange = (val: string) => {
    setIsLoading(true);
    setCategoryFilter(val);
    setCurrentPage(1);
  };

  const handleOfficerChange = (val: string) => {
    setIsLoading(true);
    setOfficerFilter(val);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setIsLoading(true);
    setSearchInput("");
    setDebouncedSearch("");
    setStatusFilter("");
    setCategoryFilter("");
    setOfficerFilter("");
    setCurrentPage(1);
  };

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    setReloadCounter((prev) => prev + 1);
  }, []);

  const hasActiveFilters = Boolean(
    debouncedSearch.trim() || statusFilter || categoryFilter || officerFilter
  );

  // Fetch reports from /api/reports
  useEffect(() => {
    let ignore = false;

    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());
    if (statusFilter) params.append("status", statusFilter);
    if (categoryFilter) params.append("programCategory", categoryFilter);
    if (officerFilter && userRole === "MINISTRY_ADMIN") params.append("officerId", officerFilter);
    params.append("page", String(currentPage));
    params.append("limit", "10");

    apiClient<{
      success: boolean;
      data: ScrutinyReportListItem[];
      pagination?: PaginationMetadata;
    }>(`/reports?${params.toString()}`)
      .then((res) => {
        if (!ignore) {
          if (res && Array.isArray(res.data)) {
            setReports(res.data);
            if (res.pagination) {
              setPagination(res.pagination);
            } else {
              setPagination({
                total: res.data.length,
                page: currentPage,
                limit: 10,
                totalPages: Math.max(1, Math.ceil(res.data.length / 10)),
              });
            }
          } else {
            setReports([]);
          }
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const msg =
            err instanceof Error ? err.message : "Failed to load scrutiny reports register.";
          setErrorMessage(msg);
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [debouncedSearch, statusFilter, categoryFilter, officerFilter, currentPage, reloadCounter, userRole]);

  const formatProgramCategory = (category?: string | null) => {
    if (!category) return "—";
    switch (category) {
      case "ENGINEERING_AND_TECHNOLOGY":
        return "Engineering & Technology";
      case "MANAGEMENT":
        return "Management (MBA/PGDM)";
      case "PHARMACY":
        return "Pharmacy";
      case "ARCHITECTURE":
        return "Architecture & Planning";
      default:
        return category.replace(/_/g, " ");
    }
  };

  const getScrutinyOutcomeBadge = (overallStatus: string) => {
    let bg = "bg-[#F0F2F2] text-[#5C6F73] border-[#D7DEDA]";
    let label = overallStatus.replace(/_/g, " ");

    if (overallStatus === "COMPLIANT") {
      bg = "bg-[#EAF3EE] text-[#245E3F] border-[#C8E6C9]";
      label = "✓ Compliant";
    } else if (overallStatus === "DEFICIENCIES_DETECTED") {
      bg = "bg-[#FDF2F2] text-[#9E2A2B] border-[#E8C5C5]";
      label = "! Deficiencies Detected";
    } else if (overallStatus === "MANUAL_REVIEW_REQUIRED") {
      bg = "bg-[#FFF9E6] text-[#8D6B00] border-[#FFE58F]";
      label = "△ Needs Manual Review";
    } else if (overallStatus === "INSUFFICIENT_INPUT") {
      bg = "bg-[#F0F2F2] text-[#5C6F73] border-[#D7DEDA]";
      label = "○ Insufficient Input";
    }

    return (
      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-[2px] border font-semibold ${bg}`}>
        {label}
      </span>
    );
  };

  const basePath = userRole === "MINISTRY_ADMIN" ? "/ministry" : "/officer";

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-6 select-none">
      {/* Page Header */}
      <div className="mb-6">
        <div className="text-[10px] font-mono tracking-wider uppercase text-[#5C6F73] mb-1">
          {breadcrumb}
        </div>
        <h1 className="text-[28px] font-bold text-[#172E33] tracking-tight m-0">
          {pageTitle}
        </h1>
        <p className="text-[13px] text-[#5C6F73] mt-1 m-0">
          {pageSubtitle}
        </p>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-[#FDF2F2] border border-[#E8C5C5] rounded-[3px] text-[#9E2A2B] flex items-center justify-between">
          <div>
            <div className="text-[13px] font-bold">Failed to load scrutiny reports</div>
            <div className="text-[12px] mt-0.5">{errorMessage}</div>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleRetry}
            className="text-[12px] bg-white border-[#E8C5C5] text-[#9E2A2B] px-3 py-1"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Search and Filter Toolbar */}
      <div className="mb-4 bg-white border border-[#D7DEDA] rounded-[2px] p-3 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by reference number or institution name..."
              className="w-full text-[13px] pl-8 pr-3 py-1.5 border border-[#D7DEDA] rounded-[2px] text-[#172E33] placeholder-[#8A9B9D] focus:outline-none focus:border-[#165A60] bg-[#FAFAF8]"
            />
            <span className="absolute left-2.5 top-2 text-[#8A9B9D] text-xs pointer-events-none">
              🔍
            </span>
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Scrutiny Outcome Filter */}
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="text-[12px] border border-[#D7DEDA] rounded-[2px] px-2.5 py-1.5 text-[#172E33] bg-[#FAFAF8] focus:outline-none focus:border-[#165A60] cursor-pointer"
            >
              <option value="">All Scrutiny Outcomes</option>
              <option value="COMPLIANT">✓ Compliant</option>
              <option value="DEFICIENCIES_DETECTED">! Deficiencies Detected</option>
              <option value="MANUAL_REVIEW_REQUIRED">△ Needs Manual Review</option>
              <option value="INSUFFICIENT_INPUT">○ Insufficient Input</option>
            </select>

            {/* Program Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="text-[12px] border border-[#D7DEDA] rounded-[2px] px-2.5 py-1.5 text-[#172E33] bg-[#FAFAF8] focus:outline-none focus:border-[#165A60] cursor-pointer"
            >
              <option value="">All Program Categories</option>
              <option value="ENGINEERING_AND_TECHNOLOGY">Engineering &amp; Technology</option>
              <option value="MANAGEMENT">Management (MBA/PGDM)</option>
              <option value="PHARMACY">Pharmacy</option>
              <option value="ARCHITECTURE">Architecture &amp; Planning</option>
            </select>

            {/* Officer Filter (Ministry Admin only) */}
            {userRole === "MINISTRY_ADMIN" && (
              <select
                value={officerFilter}
                onChange={(e) => handleOfficerChange(e.target.value)}
                className="text-[12px] border border-[#D7DEDA] rounded-[2px] px-2.5 py-1.5 text-[#172E33] bg-[#FAFAF8] focus:outline-none focus:border-[#165A60] cursor-pointer"
              >
                <option value="">All Desk Officers</option>
                <option value="unassigned">Unassigned Only</option>
              </select>
            )}

            {/* Reset Filters */}
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleClearFilters}
                className="text-[12px] text-[#165A60] hover:bg-[#EBF1F0] px-2.5 py-1.5 rounded-[2px]"
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Reports Table */}
      <div className="bg-white border border-[#D7DEDA] rounded-[2px] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#D7DEDA] bg-[#F6F5F0] text-[10px] font-mono tracking-wider text-[#5C6F73] uppercase">
                <th className="py-2.5 px-4 font-semibold">Application &amp; Institution</th>
                <th className="py-2.5 px-3 font-semibold">Report Ref &amp; Evaluation Date</th>
                <th className="py-2.5 px-3 font-semibold">Scrutiny Outcome</th>
                <th className="py-2.5 px-3 font-semibold">Rule Findings Breakdown</th>
                {showOfficerColumn && (
                  <th className="py-2.5 px-3 font-semibold">Desk Officer</th>
                )}
                <th className="py-2.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D7DEDA] text-[13px]">
              {isLoading ? (
                // Loading Skeletons
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3.5 px-4">
                      <div className="h-4 bg-[#EBEAE5] rounded w-48 mb-1.5" />
                      <div className="h-3 bg-[#EBEAE5] rounded w-32" />
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="h-4 bg-[#EBEAE5] rounded w-36 mb-1" />
                      <div className="h-3 bg-[#EBEAE5] rounded w-28" />
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="h-5 bg-[#EBEAE5] rounded w-28" />
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="h-4 bg-[#EBEAE5] rounded w-40 mb-1" />
                      <div className="h-3 bg-[#EBEAE5] rounded w-24" />
                    </td>
                    {showOfficerColumn && (
                      <td className="py-3.5 px-3">
                        <div className="h-4 bg-[#EBEAE5] rounded w-28" />
                      </td>
                    )}
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-7 bg-[#EBEAE5] rounded w-36 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : reports.length === 0 ? (
                <tr>
                  <td
                    colSpan={showOfficerColumn ? 6 : 5}
                    className="py-12 text-center text-[#8A9B9D]"
                  >
                    <div className="text-2xl mb-1">📋</div>
                    <div className="text-[14px] font-semibold text-[#172E33]">
                      {hasActiveFilters
                        ? "No scrutiny reports match selected criteria"
                        : userRole === "MINISTRY_ADMIN"
                        ? "No scrutiny reports persisted in ministry register"
                        : "No scrutiny evaluations recorded for your assigned cases"}
                    </div>
                    <div className="text-[12px] text-[#5C6F73] mt-1 max-w-md mx-auto">
                      {hasActiveFilters ? (
                        <span>
                          Try adjusting search terms or clearing one or more active filters.
                          <button
                            type="button"
                            onClick={handleClearFilters}
                            className="block mx-auto mt-2 text-[#165A60] font-medium hover:underline"
                          >
                            Reset all filters
                          </button>
                        </span>
                      ) : (
                        "Statutory scrutiny reports will be logged here automatically once compliance evaluations are executed."
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const evalDate = report.evaluationDate
                    ? new Date(report.evaluationDate).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—";

                  return (
                    <tr
                      key={report.id}
                      className="hover:bg-[#FAFAF8] transition-colors"
                    >
                      {/* Col 1: Reference & Institution Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#172E33] leading-snug">
                          {report.application?.institutionName || "Unknown Institution"}
                        </div>
                        <div className="text-[11px] font-mono text-[#165A60] mt-0.5 font-semibold">
                          {report.application?.applicationNumber || "Ref Pending"}
                        </div>
                        <div className="text-[11px] text-[#5C6F73] mt-0.5">
                          {formatProgramCategory(report.application?.programCategory)}
                          {report.application?.proposedIntake ? ` · ${report.application.proposedIntake} Seats` : ""}
                        </div>
                      </td>

                      {/* Col 2: Report Ref & Evaluation Date */}
                      <td className="py-3.5 px-3">
                        <div className="font-mono text-[11px] text-[#172E33] font-semibold">
                          {report.id}
                        </div>
                        <div className="text-[11px] font-mono text-[#5C6F73] mt-0.5">
                          {evalDate}
                        </div>
                      </td>

                      {/* Col 3: Overall Scrutiny Outcome */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {getScrutinyOutcomeBadge(report.overallStatus)}
                      </td>

                      {/* Col 4: Findings Breakdown */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-0.5">
                          <div className="text-[12px] font-mono text-[#172E33] font-medium flex items-center gap-1.5 flex-wrap">
                            <span className="text-[#245E3F] font-bold">
                              {report.passedCount}&thinsp;pass
                            </span>
                            <span className="text-[#8A9B9D]">·</span>
                            <span
                              className={
                                report.deficiencyCount > 0
                                  ? "text-[#9E2A2B] font-bold"
                                  : "text-[#5C6F73]"
                              }
                            >
                              {report.deficiencyCount}&thinsp;defic.
                            </span>
                            <span className="text-[#8A9B9D]">·</span>
                            <span
                              className={
                                report.reviewCount > 0
                                  ? "text-[#8D6B00] font-bold"
                                  : "text-[#5C6F73]"
                              }
                            >
                              {report.reviewCount}&thinsp;rev.
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-[#8A9B9D]">
                            {report.totalRulesRun} total statutory rules evaluated
                          </div>
                        </div>
                      </td>

                      {/* Col 5 (Optional): Desk Officer */}
                      {showOfficerColumn && (
                        <td className="py-3.5 px-3">
                          {report.application?.assignedOfficer ? (
                            <div>
                              <div className="text-[12px] font-medium text-[#172E33]">
                                {report.application.assignedOfficer.name}
                              </div>
                              <div className="text-[10px] text-[#8A9B9D]">
                                {report.application.assignedOfficer.designation || "Desk Officer"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-[#8A9B9D] italic">
                              Unassigned
                            </span>
                          )}
                        </td>
                      )}

                      {/* Col 6: Action */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => navigate(`${basePath}/reports/${report.id}`)}
                          className="text-[12px] bg-white border-[#D7DEDA] text-[#165A60] hover:bg-[#EBF1F0] hover:border-[#165A60] px-3 py-1.5 font-medium rounded-[2px]"
                        >
                          View complete report →
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        {!isLoading && reports.length > 0 && (
          <div className="px-4 py-3 border-t border-[#D7DEDA] bg-[#FAFAF8] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[#5C6F73]">
            <div>
              Showing{" "}
              <span className="font-semibold text-[#172E33]">
                {Math.min(
                  pagination.total,
                  (pagination.page - 1) * pagination.limit + 1
                )}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-[#172E33]">
                {Math.min(pagination.total, pagination.page * pagination.limit)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-[#172E33]">
                {pagination.total}
              </span>{" "}
              persisted scrutiny reports
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="secondary"
                disabled={pagination.page <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="text-[12px] px-2.5 py-1 bg-white border-[#D7DEDA] text-[#172E33] disabled:opacity-40"
              >
                Previous
              </Button>
              <span className="px-2 font-mono text-[11px]">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                className="text-[12px] px-2.5 py-1 bg-white border-[#D7DEDA] text-[#172E33] disabled:opacity-40"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

