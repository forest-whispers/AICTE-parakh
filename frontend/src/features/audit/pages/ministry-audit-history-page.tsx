import React, { useState, useEffect } from "react";
import { auditApi } from "../services/audit-api";
import { AuditFilterBar } from "../components/audit-filter-bar";
import { AuditEventDetailPanel } from "../components/audit-event-detail-panel";
import type { AuditLogItem, AuditPagination } from "../types/audit.types";
import { AlertCircle, ChevronLeft, ChevronRight, Cpu, UserCheck, ShieldCheck } from "lucide-react";

export const MinistryAuditHistoryPage: React.FC = () => {
  const [events, setEvents] = useState<AuditLogItem[]>([]);
  const [pagination, setPagination] = useState<AuditPagination>({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 1,
  });
  const [selectedEvent, setSelectedEvent] = useState<AuditLogItem | null>(null);

  // Filter states
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [action, setAction] = useState<string>("ALL");
  const [actorRole, setActorRole] = useState<string>("ALL");
  const [page, setPage] = useState<number>(1);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Load audit data on filter/page change
  useEffect(() => {
    let ignore = false;

    auditApi
      .getOperationalActivity({
        search: debouncedSearch,
        action,
        actorRole,
        page,
        limit: 25,
      })
      .then((res) => {
        if (!ignore) {
          if (res?.data) {
            setEvents(res.data);
            setPagination(res.pagination);
            // If the currently selected event is still in the loaded page, keep it; otherwise select first if desktop
            if (res.data.length > 0 && !selectedEvent) {
              setSelectedEvent(res.data[0]);
            }
          }
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err?.message || "Failed to load audit history records.");
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [debouncedSearch, action, actorRole, page, selectedEvent]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    auditApi
      .getOperationalActivity({
        search: debouncedSearch,
        action,
        actorRole,
        page,
        limit: 25,
      })
      .then((res) => {
        if (res?.data) {
          setEvents(res.data);
          setPagination(res.pagination);
          if (res.data.length > 0 && !selectedEvent) {
            setSelectedEvent(res.data[0]);
          }
        }
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err?.message || "Failed to load audit history records.");
        setIsLoading(false);
      });
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setAction("ALL");
    setActorRole("ALL");
    setPage(1);
  };

  const formatEventTimestamp = (iso: string) => {
    const d = new Date(iso);
    const day = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    return { day, time };
  };

  const formatActionName = (act: string) => {
    return act
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const startRecord = (pagination.page - 1) * pagination.limit + 1;
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="max-w-[1440px] mx-auto px-6 sm:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="space-y-1">
        <div className="text-xs font-mono uppercase tracking-wider text-[#5C6F73]">
          MINISTRY &nbsp;/&nbsp; AUDIT HISTORY
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#172E33]">
          Traceable operational history
        </h1>
        <p className="text-xs text-[#5C6F73] max-w-3xl leading-relaxed">
          Ministry-wide chronology. System events and authorized human actions are separately attributed.
          Audit records cannot be edited or deleted.
        </p>
      </div>

      {/* Filter Controls Bar */}
      <AuditFilterBar
        search={search}
        onSearchChange={setSearch}
        action={action}
        onActionChange={(val) => {
          setAction(val);
          setPage(1);
        }}
        actorRole={actorRole}
        onActorRoleChange={(val) => {
          setActorRole(val);
          setPage(1);
        }}
        totalEvents={pagination.total}
        onReset={handleResetFilters}
      />

      {/* Error Feedback */}
      {error && (
        <div className="bg-[#FDF2F2] border border-[#E8C5C5] rounded-[3px] p-4 flex items-start gap-3 text-xs text-[#9E2A2B]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Failed to retrieve audit trail</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="underline font-mono text-[11px] hover:text-[#781F20]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Content: Table + Side Detail Panel */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Chronology Table Container */}
        <div className="flex-1 w-full bg-white border border-[#D7DEDA] rounded-[4px] shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-4 animate-pulse">
              <div className="h-6 bg-[#EBEAE5] rounded w-1/3" />
              <div className="h-10 bg-[#EBEAE5] rounded" />
              <div className="h-10 bg-[#EBEAE5] rounded" />
              <div className="h-10 bg-[#EBEAE5] rounded" />
              <div className="h-10 bg-[#EBEAE5] rounded" />
            </div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#8A9B9D] block">
                No audit events recorded
              </span>
              <p className="text-xs text-[#5C6F73] max-w-sm mx-auto">
                No matching operational activities found for the selected filter parameters.
              </p>
              {(search || action !== "ALL" || actorRole !== "ALL") && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-3 text-xs text-[#165A60] underline font-semibold"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F6F5F0] border-b border-[#D7DEDA] text-[#5C6F73] font-mono uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-semibold">Timestamp ↓ / Ref</th>
                    <th className="py-3 px-4 font-semibold">Event / Description</th>
                    <th className="py-3 px-4 font-semibold">Actor / Role</th>
                    <th className="py-3 px-4 font-semibold text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBEAE5]">
                  {events.map((evt) => {
                    const isSelected = selectedEvent?.id === evt.id;
                    const { day, time } = formatEventTimestamp(evt.timestamp);
                    const isSystem = evt.actor.isSystem || evt.actor.role === "SYSTEM";
                    const isOfficer = evt.actor.role === "OFFICER";

                    return (
                      <tr
                        key={evt.id}
                        onClick={() => setSelectedEvent(evt)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-[#F0F6F5] hover:bg-[#EBF3F2]"
                            : "hover:bg-[#FAFAF8]"
                        }`}
                      >
                        {/* Timestamp & Application Ref */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono text-xs text-[#172E33] font-medium">
                            {day} {time}
                          </div>
                          <div className="font-mono text-[11px] text-[#5C6F73] mt-0.5">
                            {evt.application?.applicationNumber || `RES: ${evt.resourceType}`}
                          </div>
                        </td>

                        {/* Event & Details */}
                        <td className="py-3.5 px-4 min-w-[260px]">
                          <div className="font-semibold text-xs text-[#172E33]">
                            {formatActionName(evt.action)}
                          </div>
                          <div className="text-[11px] text-[#5C6F73] line-clamp-2 mt-0.5">
                            {evt.details}
                          </div>
                        </td>

                        {/* Actor & Role Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-medium text-xs text-[#172E33]">
                            {isSystem ? (
                              <Cpu className="w-3.5 h-3.5 text-[#165A60]" />
                            ) : isOfficer ? (
                              <UserCheck className="w-3.5 h-3.5 text-[#245E3F]" />
                            ) : (
                              <ShieldCheck className="w-3.5 h-3.5 text-[#553285]" />
                            )}
                            <span>{evt.actor.name}</span>
                          </div>
                          <div className="font-mono text-[10px] uppercase tracking-wider text-[#5C6F73] mt-0.5">
                            {evt.actor.role}
                          </div>
                        </td>

                        {/* Inspect action */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(evt);
                            }}
                            className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${
                              isSelected
                                ? "text-[#165A60] font-bold"
                                : "text-[#5C6F73] hover:text-[#165A60]"
                            }`}
                          >
                            Inspect →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls Footer */}
          {pagination.total > 0 && (
            <div className="bg-[#FAF9F5] border-t border-[#D7DEDA] px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#5C6F73]">
              <div>
                Showing <span className="font-mono font-semibold text-[#172E33]">{startRecord}</span>–
                <span className="font-mono font-semibold text-[#172E33]">{endRecord}</span> of{" "}
                <span className="font-mono font-semibold text-[#172E33]">{pagination.total}</span> events
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1 || isLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 text-xs border border-[#D7DEDA] rounded-[2px] bg-white text-[#172E33] hover:bg-[#F6F5F0] disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter((pNum) => {
                      // show first, last, and current +/- 1
                      return (
                        pNum === 1 ||
                        pNum === pagination.totalPages ||
                        Math.abs(pNum - pagination.page) <= 1
                      );
                    })
                    .map((pNum) => (
                      <button
                        key={pNum}
                        type="button"
                        onClick={() => setPage(pNum)}
                        className={`w-7 h-7 text-xs font-mono rounded-[2px] border transition-colors ${
                          pNum === pagination.page
                            ? "bg-[#165A60] text-white border-[#165A60] font-semibold"
                            : "bg-white text-[#172E33] border-[#D7DEDA] hover:bg-[#F6F5F0]"
                        }`}
                      >
                        {pNum}
                      </button>
                    ))}
                </div>

                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages || isLoading}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-2.5 py-1 text-xs border border-[#D7DEDA] rounded-[2px] bg-white text-[#172E33] hover:bg-[#F6F5F0] disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Selected Event Detail Panel */}
        {selectedEvent && (
          <AuditEventDetailPanel
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </div>

      {/* Informational Callout matching Figma 25 bottom scope marker */}
      <div className="bg-[#EAEFF0] border border-[#CCD8D9] rounded-[4px] p-4 text-xs space-y-1">
        <div className="font-mono uppercase tracking-wider text-[10px] text-[#165A60] font-semibold flex items-center gap-1.5">
          <span>Officer scope / alternate audit view</span>
          <span className="text-[#8A9B9D]">/</span>
          <span className="text-[#5C6F73]">ASSIGNED-CASE HISTORY ONLY</span>
        </div>
        <p className="text-[#334155] leading-relaxed">
          For scrutiny officers, this same chronology is strictly restricted to assigned applications.
          Application history is available in the officer case workspace; ministry-wide events and other officers&apos;
          assignments remain confidential and are not exposed.
        </p>
      </div>
    </div>
  );
};
