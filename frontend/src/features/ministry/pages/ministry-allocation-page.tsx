import React, { useState, useEffect, useCallback, useTransition } from "react";
import { apiClient } from "../../../shared/api/client";
import { Button } from "../../../shared/ui/button";
import { AllocationFilterPills } from "../components/allocation-filter-pills";
import { ApplicationInspectionAllocationModal } from "../components/application-inspection-allocation-modal";
import type { ApplicationListItem } from "../../intake/types/intake.types";

interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const MinistryAllocationPage: React.FC = () => {
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
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [reloadTrigger, setReloadTrigger] = useState<number>(0);

  // Modal & Success Feedback state
  const [selectedAppForModal, setSelectedAppForModal] = useState<ApplicationListItem | null>(null);
  const [successToast, setSuccessToast] = useState<{
    applicationNumber: string;
    officerName: string;
  } | null>(null);

  // Debounce search
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

  const handleStatusSelect = (status: string) => {
    setIsLoading(true);
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setIsLoading(true);
    setStatusFilter("");
    setSearchInput("");
    setDebouncedSearch("");
    setCurrentPage(1);
  };

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    setReloadTrigger((prev) => prev + 1);
  }, []);

  // Fetch unassigned applications
  useEffect(() => {
    let ignore = false;

    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());
    if (statusFilter) params.append("status", statusFilter);
    params.append("page", String(currentPage));
    params.append("limit", "10");

    apiClient<{
      success: boolean;
      data: ApplicationListItem[];
      pagination?: PaginationMetadata;
    }>(`/applications/unassigned?${params.toString()}`)
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
            err instanceof Error ? err.message : "Failed to load unassigned applications queue.";
          setErrorMessage(msg);
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [debouncedSearch, statusFilter, currentPage, reloadTrigger]);

  const handleAllocated = (applicationId: string, officerName: string) => {
    const allocatedApp = applications.find((a) => a.id === applicationId);
    const refNum = allocatedApp?.applicationNumber || applicationId;

    // Set success toast
    setSuccessToast({
      applicationNumber: refNum,
      officerName,
    });

    // Optimistically remove from current queue view immediately
    setApplications((prev) => prev.filter((a) => a.id !== applicationId));
    setPagination((prev) => ({
      ...prev,
      total: Math.max(0, prev.total - 1),
    }));

    // Trigger fresh reload in background
    setReloadTrigger((prev) => prev + 1);
  };

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

  const hasActiveFilters = Boolean(statusFilter || debouncedSearch.trim());

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-6 select-none">
      {/* Inspection & Allocation Modal */}
      <ApplicationInspectionAllocationModal
        application={selectedAppForModal}
        isOpen={Boolean(selectedAppForModal)}
        onClose={() => setSelectedAppForModal(null)}
        onAllocated={handleAllocated}
      />

      {/* Page Header */}
      <div className="mb-6">
        <div className="text-[10px] font-mono tracking-wider uppercase text-[#5C6F73] mb-1">
          MINISTRY &nbsp;/&nbsp; OFFICER ALLOCATION &nbsp;/&nbsp; 2026–27
        </div>
        <h1 className="text-[28px] font-bold text-[#172E33] tracking-tight m-0">
          Officer allocation queue
        </h1>
        <p className="text-[13px] text-[#5C6F73] mt-1 m-0">
          Statutory applications awaiting desk officer assignment. Inspect application evidence and assign an authorized processing officer.
        </p>
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div className="mb-6 p-4 bg-[#EAF3EE] border border-[#C8E6C9] rounded-[3px] text-[#245E3F] flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="text-base font-bold">✓</span>
            <div>
              <span className="text-[13px] font-bold">
                Application {successToast.applicationNumber} successfully allocated
              </span>
              <span className="text-xs text-[#245E3F]/80 block mt-0.5">
                Assigned to {successToast.officerName}. Removed from the unassigned backlog queue.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-xs text-[#245E3F] font-mono hover:underline p-1"
          >
            Dismiss ✕
          </button>
        </div>
      )}

      {/* Error Notice */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-[#FDF2F2] border border-[#E8C5C5] rounded-[3px] text-[#9E2A2B] flex items-center justify-between">
          <div>
            <div className="text-[13px] font-bold">Failed to load allocation queue</div>
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

      {/* Horizontal Filter Options & Search Bar */}
      <div className="mb-5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Horizontal Lifecycle Status Pills */}
          <AllocationFilterPills
            selectedStatus={statusFilter}
            onSelectStatus={handleStatusSelect}
            disabled={isLoading}
          />

          {/* Search Input */}
          <div className="relative w-full md:w-72 shrink-0">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search reference or institution..."
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-[#D7DEDA] rounded-[2px] text-[#172E33] placeholder-[#8A9B9D] focus:outline-none focus:border-[#165A60] bg-white shadow-2xs"
            />
            <span className="absolute left-2.5 top-2 text-[#8A9B9D] text-xs pointer-events-none">
              🔍
            </span>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-xs text-[#5C6F73]">
            <span>Active filters applied</span>
            <span>·</span>
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-[#A14637] hover:underline font-medium"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Applications Queue Table Card */}
      <div className="bg-white border border-[#D7DEDA] rounded-[2px] shadow-sm overflow-hidden">
        {/* Table Top Bar */}
        <div className="px-5 py-3.5 border-b border-[#D7DEDA] bg-[#FAFAF8] flex items-center justify-between">
          <div>
            <div className="text-[14px] font-bold text-[#172E33]">
              Unassigned statutory applications
            </div>
            <div className="text-[11px] text-[#5C6F73] mt-0.5">
              Select an application row to inspect institutional evidence and allocate a scrutiny officer
            </div>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 bg-[#FFF9E6] text-[#8D6B00] border border-[#FFE58F] rounded-[2px] shrink-0 font-medium">
            {pagination.total} unassigned case{pagination.total === 1 ? "" : "s"}
          </span>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#D7DEDA] bg-[#F6F5F0] text-[10px] font-mono tracking-wider text-[#5C6F73] uppercase">
                <th className="py-2.5 px-4 font-semibold">Application &amp; Institution</th>
                <th className="py-2.5 px-3 font-semibold">Program &amp; Intake</th>
                <th className="py-2.5 px-3 font-semibold">Lifecycle Status</th>
                <th className="py-2.5 px-3 font-semibold">Deterministic Scrutiny</th>
                <th className="py-2.5 px-3 font-semibold">Evidence Items</th>
                <th className="py-2.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D7DEDA] text-[13px]">
              {isLoading ? (
                // Skeletons
                Array.from({ length: 4 }).map((_, idx) => (
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
                      <div className="h-4 bg-[#EBEAE5] rounded w-20" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-7 bg-[#EBEAE5] rounded w-32 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#8A9B9D]">
                    <div className="text-2xl mb-1">📋</div>
                    <div className="text-[14px] font-semibold text-[#172E33]">
                      {hasActiveFilters
                        ? "No unassigned applications match selected status or search filter"
                        : "No unassigned applications in queue"}
                    </div>
                    <div className="text-[12px] text-[#5C6F73] mt-1 max-w-md mx-auto">
                      {hasActiveFilters ? (
                        <span>
                          Try selecting another lifecycle status pill or clearing the search query.
                          <button
                            type="button"
                            onClick={handleClearFilters}
                            className="block mx-auto mt-2 text-[#165A60] font-medium hover:underline"
                          >
                            Reset filters
                          </button>
                        </span>
                      ) : (
                        "All statutory applications currently have an assigned officer desk."
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
                      onClick={() => setSelectedAppForModal(app)}
                      className="hover:bg-[#FAFAF8] transition-colors cursor-pointer"
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

                      {/* Col 3: Lifecycle Status Badge */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {getApplicationStatusBadge(app.status)}
                      </td>

                      {/* Col 4: Scrutiny Findings Badge */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {getScrutinyOutcomeBadge(latestScrutiny?.overallStatus)}
                      </td>

                      {/* Col 5: Evidence Manifest Count */}
                      <td className="py-3.5 px-3">
                        <span className="text-[11px] font-mono px-2 py-0.5 bg-[#EBEAE5] text-[#172E33] rounded-[2px]">
                          {app.documents?.length || 0} document{app.documents?.length === 1 ? "" : "s"}
                        </span>
                      </td>

                      {/* Col 6: Action Button */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAppForModal(app);
                          }}
                          className="bg-[#165A60] hover:bg-[#122B30] text-white text-[12px] font-medium px-3.5 py-1.5 rounded-[3px] inline-flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          Inspect &amp; allocate →
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
            of <strong className="text-[#172E33]">{pagination.total}</strong> unassigned applications
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
        Statutory Processing Portal · AICTE Approval Process Handbook (APH) 2026–27 · Ministry Administrative Oversight.
      </div>
    </div>
  );
};
