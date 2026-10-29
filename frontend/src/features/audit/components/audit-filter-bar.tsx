import React from "react";
import { Search, RotateCcw } from "lucide-react";

interface AuditFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  action: string;
  onActionChange: (value: string) => void;
  actorRole: string;
  onActorRoleChange: (value: string) => void;
  totalEvents: number;
  onReset: () => void;
}

export const AuditFilterBar: React.FC<AuditFilterBarProps> = ({
  search,
  onSearchChange,
  action,
  onActionChange,
  actorRole,
  onActorRoleChange,
  totalEvents,
  onReset,
}) => {
  const hasActiveFilters = Boolean(
    search.trim() || action !== "ALL" || actorRole !== "ALL"
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5C6F73] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search event, actor or application reference"
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#D7DEDA] rounded-[2px] text-[#172E33] placeholder:text-[#8A9B9D] focus:outline-none focus:border-[#165A60] transition-colors"
          />
        </div>

        {/* Action / Event Type Filter */}
        <div className="w-full md:w-52">
          <select
            value={action}
            onChange={(e) => onActionChange(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-[#D7DEDA] rounded-[2px] text-[#172E33] focus:outline-none focus:border-[#165A60] cursor-pointer"
          >
            <option value="ALL">Event type: All</option>
            <option value="AUTHORITY_VERIFICATION_EXECUTED">Authority Verification</option>
            <option value="BANK_CONFIRMATION_RECORDED">Bank Confirmation</option>
            <option value="SCRUTINY_EVALUATED">Scrutiny Evaluated</option>
            <option value="APPLICATION_ASSIGNED">Application Assigned</option>
            <option value="APPLICATION_REASSIGNED">Application Reassigned</option>
            <option value="APPLICATION_CREATED">Application Created</option>
            <option value="DOCUMENT_UPLOADED">Document Uploaded</option>
            <option value="EXTRACTION_COMPLETED">Extraction Completed</option>
            <option value="EXTRACTION_FAILED">Extraction Failed</option>
            <option value="DOCUMENT_STATUS_UPDATED">Document Status Updated</option>
            <option value="AUTH_LOGIN">User Sign-in</option>
            <option value="AUTH_LOGOUT">User Sign-out</option>
          </select>
        </div>

        {/* Actor Role Filter */}
        <div className="w-full md:w-44">
          <select
            value={actorRole}
            onChange={(e) => onActorRoleChange(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-[#D7DEDA] rounded-[2px] text-[#172E33] focus:outline-none focus:border-[#165A60] cursor-pointer"
          >
            <option value="ALL">Actor role: All</option>
            <option value="SYSTEM">System (Automated)</option>
            <option value="OFFICER">Scrutiny Officer</option>
            <option value="MINISTRY_ADMIN">Ministry Admin</option>
          </select>
        </div>

        {/* Reset Filter Action */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-[#5C6F73] hover:text-[#172E33] bg-white border border-[#D7DEDA] rounded-[2px] hover:bg-[#F6F5F0] transition-colors"
            title="Reset filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Scope & Metadata Row */}
      <div className="flex items-center justify-between text-xs text-[#5C6F73]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[#172E33] font-semibold">
            {totalEvents} {totalEvents === 1 ? "event" : "events"}
          </span>
          <span className="text-[#8A9B9D]">·</span>
          <span>Ministry-wide scope</span>
        </div>
        <div className="text-[11px] font-mono text-[#8A9B9D]">
          Sort: Last activity ↓
        </div>
      </div>
    </div>
  );
};

