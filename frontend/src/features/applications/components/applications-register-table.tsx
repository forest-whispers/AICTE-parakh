import React, { useEffect, useState, useCallback, useTransition } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../../shared/api/client";
import { Button } from "../../../shared/ui/button";
import type { ApplicationListItem } from "../../intake/types/intake.types";

export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ApplicationsRegisterTableProps {
  endpoint: string;
  pageTitle: string;
  pageSubtitle: string;
  breadcrumb: string;
  userRole: "OFFICER" | "MINISTRY_ADMIN";
  showOfficerColumn?: boolean;
  showOfficerFilter?: boolean;
}

export const ApplicationsRegisterTable: React.FC<ApplicationsRegisterTableProps> = ({
  endpoint,
  pageTitle,
  pageSubtitle,
  breadcrumb,
  userRole,
  showOfficerColumn = false,
  showOfficerFilter = false,
}) => {
  const navigate = useNavigate();
  const [, startTransition] = useTransition();

  // Data state
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
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
  const [scrutinyFilter, setScrutinyFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [officerFilter, setOfficerFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);

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

  const [reloadCounter, setReloadCounter] = useState<number>(0);

  // Reset page and trigger loading when any dropdown filter changes
  const handleStatusChange = (val: string) => {
    setIsLoading(true);
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleScrutinyChange = (val: string) => {
    setIsLoading(true);
    setScrutinyFilter(val);
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
    setScrutinyFilter("");
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
    debouncedSearch.trim() ||
    statusFilter ||
    scrutinyFilter ||
    categoryFilter ||
    officerFilter
  );

  useEffect(() => {
    let ignore = false;

    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());
    if (statusFilter) params.append("status", statusFilter);
    if (scrutinyFilter) params.append("scrutinyStatus", scrutinyFilter);
    if (categoryFilter) params.append("programCategory", categoryFilter);
    if (officerFilter) params.append("officerId", officerFilter);
    params.append("page", String(currentPage));
    params.append("limit", "10");

    apiClient<{
      success: boolean;
      data: ApplicationListItem[];
      pagination?: PaginationMetadata;
    }>(`${endpoint}?${params.toString()}`)
      .then((res) => {
        if (!ignore) {
          if (res && Array.isArray(res.data)) {
            setApplications(res.data);
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
            setApplications([]);
          }
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const msg =
            err instanceof Error ? err.message : "Failed to load statutory applications.";
          setErrorMessage(msg);
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [
    endpoint,
    debouncedSearch,
    statusFilter,
    scrutinyFilter,
    categoryFilter,
    officerFilter,
    currentPage,
    reloadCounter,
  ]);

  const formatProgramCategory = (category: string | null) => {
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

  const getApplicationStatusBadge = (status: string) => {
    let bg = "bg-[#F0F2F2] text-[#5C6F73] border-[#D7DEDA]";
    let label = status.replace(/_/g, " ");

    if (
      status === "COMPLIANT" ||
      status === "EXTRACTION_COMPLETED" ||
      status === "SCRUTINY_COMPLETED"
    ) {
      bg = "bg-[#EAF3EE] text-[#245E3F] border-[#C8E6C9]";
      label = status === "COMPLIANT" ? "✓ Compliant" : status.replace(/_/g, " ");
    } else if (status === "APPROVED") {
      bg = "bg-[#EAF3EE] text-[#245E3F] border-[#C8E6C9]";
      label = "✓ Approved";
    } else if (
      status === "DEFICIENCIES_DETECTED" ||
      status === "EXTRACTION_FAILED" ||
      status === "SCRUTINY_FAILED"
    ) {
      bg = "bg-[#FDF2F2] text-[#9E2A2B] border-[#E8C5C5]";
      label = status === "DEFICIENCIES_DETECTED" ? "! Deficiencies Detected" : status.replace(/_/g, " ");
    } else if (status === "PROCESSING_EXTRACTION") {
      bg = "bg-[#FFF9E6] text-[#8D6B00] border-[#FFE58F]";
      label = "⚡ Processing Extraction";
    } else if (status === "MANUAL_REVIEW_REQUIRED") {
      bg = "bg-[#FFF9E6] text-[#8D6B00] border-[#FFE58F]";
      label = "△ Manual Review Required";
    } else if (status === "SUBMITTED") {
      bg = "bg-[#EBEAE5] text-[#172E33] border-[#D7DEDA]";
      label = "Submitted";
    }

    return (
      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-[2px] border font-medium ${bg}`}>
        {label}
      </span>
    );
  };

  const getScrutinyOutcomeBadge = (overallStatus?: string) => {
    if (!overallStatus) {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-[2px] border bg-[#F0F2F2] text-[#8A9B9D] border-[#D7DEDA]">
          — Awaiting Scrutiny
        </span>
      );
    }

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
            <div className="text-[13px] font-bold">Failed to load applications</div>
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
              value={scrutinyFilter}
              onChange={(e) => handleScrutinyChange(e.target.value)}
              className="text-[12px] border border-[#D7DEDA] rounded-[2px] px-2.5 py-1.5 text-[#172E33] bg-[#FAFAF8] focus:outline-none focus:border-[#165A60] cursor-pointer"
            >
              <option value="">All Scrutiny Outcomes</option>
              <option value="COMPLIANT">✓ Compliant</option>
              <option value="DEFICIENCIES_DETECTED">! Deficiencies Detected</option>
              <option value="MANUAL_REVIEW_REQUIRED">△ Needs Manual Review</option>
              <option value="INSUFFICIENT_INPUT">○ Insufficient Input</option>
              <option value="UNASSESSED">— Awaiting Scrutiny</option>
            </select>

            {/* Application Lifecycle Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="text-[12px] border border-[#D7DEDA] rounded-[2px] px-2.5 py-1.5 text-[#172E33] bg-[#FAFAF8] focus:outline-none focus:border-[#165A60] cursor-pointer"
            >
              <option value="">All Lifecycle Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="PROCESSING_EXTRACTION">Processing Extraction</option>
              <option value="EXTRACTION_COMPLETED">Extraction Completed</option>
              <option value="EXTRACTION_FAILED">Extraction Failed</option>
              <option value="SCRUTINY_COMPLETED">Scrutiny Completed</option>
              <option value="SCRUTINY_FAILED">Scrutiny Failed</option>
              <option value="COMPLIANT">Compliant</option>
              <option value="APPROVED">Approved</option>
              <option value="DEFICIENCIES_DETECTED">Deficiencies Detected</option>
              <option value="MANUAL_REVIEW_REQUIRED">Manual Review Required</option>
            </select>

            {/* Program Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="text-[12px] border border-[#D7DEDA] rounded-[2px] px-2.5 py-1.5 text-[#172E33] bg-[#FAFAF8] focus:outline-none focus:border-[#165A60] cursor-pointer"
            >
              <option value="">All Programs</option>
              <option value="ENGINEERING_AND_TECHNOLOGY">Engineering &amp; Tech</option>
              <option value="MANAGEMENT">Management (MBA/PGDM)</option>
              <option value="PHARMACY">Pharmacy</option>
              <option value="ARCHITECTURE">Architecture &amp; Planning</option>
            </select>

            {/* Ministry Admin: Desk Assignment Filter */}
            {showOfficerFilter && (
              <select
                value={officerFilter}
                onChange={(e) => handleOfficerChange(e.target.value)}
                className="text-[12px] border border-[#D7DEDA] rounded-[2px] px-2.5 py-1.5 text-[#172E33] bg-[#FAFAF8] focus:outline-none focus:border-[#165A60] cursor-pointer"
              >
                <option value="">All Desk Allocations</option>
                <option value="unassigned">Unassigned Queue Only</option>
              </select>
            )}

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-[12px] text-[#A14637] hover:underline px-2 py-1 font-medium"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Applications Table Card */}
      <div className="bg-white border border-[#D7DEDA] rounded-[2px] shadow-sm overflow-hidden">
        {/* Table Top Bar */}
        <div className="px-5 py-3.5 border-b border-[#D7DEDA] bg-[#FAFAF8] flex items-center justify-between">
          <div>
            <div className="text-[14px] font-bold text-[#172E33]">
              {userRole === "MINISTRY_ADMIN"
                ? "Statutory Portfolio Register"
                : "Assigned application register"}
            </div>
            <div className="text-[11px] text-[#5C6F73] mt-0.5">
              Live lifecycle state and latest deterministic scrutiny outcomes
            </div>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 bg-[#EBEAE5] text-[#172E33] rounded-[2px] shrink-0">
            {pagination.total} application{pagination.total === 1 ? "" : "s"}
          </span>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#D7DEDA] bg-[#F6F5F0] text-[10px] font-mono tracking-wider text-[#5C6F73] uppercase">
                <th className="py-2.5 px-4 font-semibold">Application &amp; Institution</th>
                <th className="py-2.5 px-3 font-semibold">Program &amp; Intake</th>
                <th className="py-2.5 px-3 font-semibold">Application Status</th>
                <th className="py-2.5 px-3 font-semibold">Latest Scrutiny</th>
                <th className="py-2.5 px-3 font-semibold">Scrutiny Breakdown</th>
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
                      <div className="h-3 bg-[#EBEAE5] rounded w-20" />
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="h-5 bg-[#EBEAE5] rounded w-24" />
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
              ) : applications.length === 0 ? (
                <tr>
                  <td
                    colSpan={showOfficerColumn ? 7 : 6}
                    className="py-12 text-center text-[#8A9B9D]"
                  >
                    <div className="text-2xl mb-1">📋</div>
                    <div className="text-[14px] font-semibold text-[#172E33]">
                      {hasActiveFilters
                        ? "No applications match selected search & filter criteria"
                        : userRole === "MINISTRY_ADMIN"
                        ? "No statutory applications registered in ministry portfolio"
                        : "No applications assigned to your desk"}
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
                        "Statutory institutional applications will appear here for regulatory evaluation."
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                applications.map((app) => {
                  const latestScrutiny = app.scrutinyReports?.[0];
                  const createdDate = app.createdAt
                    ? new Date(app.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—";

                  return (
                    <tr
                      key={app.id}
                      className="hover:bg-[#FAFAF8] transition-colors"
                    >
                      {/* Col 1: Reference & Institution Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#172E33] leading-snug">
                          {app.institutionName}
                        </div>
                        <div className="text-[11px] font-mono text-[#165A60] mt-0.5 font-semibold">
                          {app.applicationNumber}
                        </div>
                        <div className="text-[10px] font-mono text-[#8A9B9D] mt-0.5">
                          Submitted: {createdDate}
                        </div>
                      </td>

                      {/* Col 2: Program & Proposed Intake */}
                      <td className="py-3.5 px-3">
                        <div className="text-[12px] text-[#172E33] font-medium">
                          {formatProgramCategory(app.programCategory)}
                        </div>
                        <div className="text-[11px] font-mono text-[#5C6F73] mt-0.5">
                          {app.proposedIntake ? `${app.proposedIntake} Approved Seats` : "—"}
                        </div>
                      </td>

                      {/* Col 3: Real Lifecycle Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {getApplicationStatusBadge(app.status)}
                      </td>

                      {/* Col 4: Scrutiny Outcome (Evaluated on Latest Persisted Report) */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {getScrutinyOutcomeBadge(latestScrutiny?.overallStatus)}
                      </td>

                      {/* Col 5: Scrutiny Rule Breakdown */}
                      <td className="py-3.5 px-3">
                        {latestScrutiny ? (
                          <div className="space-y-0.5">
                            <div className="text-[12px] font-mono text-[#172E33] font-medium flex items-center gap-1.5 flex-wrap">
                              <span className="text-[#245E3F] font-bold">
                                {latestScrutiny.passedCount}&thinsp;pass
                              </span>
                              <span className="text-[#8A9B9D]">·</span>
                              <span
                                className={
                                  latestScrutiny.deficiencyCount > 0
                                    ? "text-[#9E2A2B] font-bold"
                                    : "text-[#5C6F73]"
                                }
                              >
                                {latestScrutiny.deficiencyCount}&thinsp;defic.
                              </span>
                              <span className="text-[#8A9B9D]">·</span>
                              <span
                                className={
                                  latestScrutiny.reviewCount > 0
                                    ? "text-[#8D6B00] font-bold"
                                    : "text-[#5C6F73]"
                                }
                              >
                                {latestScrutiny.reviewCount}&thinsp;rev.
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-[#8A9B9D]">
                              {latestScrutiny.totalRulesRun
                                ? `${latestScrutiny.totalRulesRun} total rules evaluated`
                                : latestScrutiny.evaluationDate
                                ? `Evaluated ${new Date(
                                    latestScrutiny.evaluationDate
                                  ).toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                  })}`
                                : "Persisted Scrutiny Report"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] font-mono text-[#8A9B9D] italic">
                            No scrutiny evaluation recorded
                          </span>
                        )}
                      </td>

                      {/* Col 6 (Optional): Desk Officer */}
                      {showOfficerColumn && (
                        <td className="py-3.5 px-3">
                          {app.assignedOfficer ? (
                            <div>
                              <div className="text-[12px] font-medium text-[#172E33]">
                                {app.assignedOfficer.name}
                              </div>
                              <div className="text-[10px] font-mono text-[#5C6F73]">
                                {app.assignedOfficer.designation || "Assigned Officer"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-[#8D6B00] bg-[#FFF9E6] border border-[#FFE58F] px-1.5 py-0.5 rounded-[2px] whitespace-nowrap">
                              Unassigned
                            </span>
                          )}
                        </td>
                      )}

                      {/* Col 7: Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          type="button"
                          onClick={() => navigate(`/officer/applications/${app.id}`)}
                          className="bg-[#165A60] hover:bg-[#122B30] text-white text-[12px] font-medium px-3.5 py-1.5 rounded-[3px] inline-flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          {userRole === "MINISTRY_ADMIN"
                            ? "Inspect application →"
                            : "Continue to application →"}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-5 py-3 border-t border-[#D7DEDA] bg-[#FAFAF8] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[#5C6F73]">
          <div>
            Showing{" "}
            <strong className="text-[#172E33]">
              {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
            </strong>{" "}
            to{" "}
            <strong className="text-[#172E33]">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </strong>{" "}
            of <strong className="text-[#172E33]">{pagination.total}</strong> applications
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => {
                setIsLoading(true);
                setCurrentPage((prev) => Math.max(1, prev - 1));
              }}
              className="text-[11px] bg-white border-[#D7DEDA] px-2.5 py-1 disabled:opacity-40"
            >
              ← Previous
            </Button>
            <span className="text-[11px] font-mono px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              type="button"
              variant="secondary"
              disabled={pagination.page >= pagination.totalPages || isLoading}
              onClick={() => {
                setIsLoading(true);
                setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1));
              }}
              className="text-[11px] bg-white border-[#D7DEDA] px-2.5 py-1 disabled:opacity-40"
            >
              Next →
            </Button>
          </div>
        </div>
      </div>

      {/* Footer Legal Note */}
      <div className="text-center text-[11px] text-[#8A9B9D] mt-10 pb-6 border-t border-[#D7DEDA]/40 pt-4">
        Statutory Processing Portal · AICTE Approval Process Handbook (APH) 2026–27 · Authorized personnel only.
      </div>
    </div>
  );
};