import React, { useState, useEffect, useMemo } from "react";
import { apiClient } from "../../../shared/api/client";
import type { OfficerListItem } from "../types/allocation.types";

interface OfficerSelectorProps {
  selectedOfficerId: string | null;
  onSelectOfficer: (officer: OfficerListItem) => void;
  disabled?: boolean;
}

export const OfficerSelector: React.FC<OfficerSelectorProps> = ({
  selectedOfficerId,
  onSelectOfficer,
  disabled = false,
}) => {
  const [officers, setOfficers] = useState<OfficerListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    apiClient<{ success: boolean; data: OfficerListItem[] }>("/auth/officers")
      .then((res) => {
        if (isMounted) {
          if (res && Array.isArray(res.data)) {
            setOfficers(res.data);
          } else {
            setOfficers([]);
          }
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Failed to load active officers directory.";
          setLoadError(msg);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredOfficers = useMemo(() => {
    if (!searchQuery.trim()) return officers;
    const q = searchQuery.toLowerCase().trim();
    return officers.filter(
      (off) =>
        off.name.toLowerCase().includes(q) ||
        off.email.toLowerCase().includes(q) ||
        (off.designation && off.designation.toLowerCase().includes(q)) ||
        (off.department && off.department.toLowerCase().includes(q))
    );
  }, [officers, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-2 p-3 bg-[#FAFAF8] border border-[#D7DEDA] rounded-[2px]">
        <div className="h-4 bg-[#EBEAE5] rounded w-3/4 animate-pulse" />
        <div className="h-10 bg-[#EBEAE5] rounded animate-pulse" />
        <div className="h-10 bg-[#EBEAE5] rounded animate-pulse" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-3 bg-[#FDF2F2] border border-[#E8C5C5] rounded-[2px] text-[#9E2A2B] text-xs">
        <span className="font-bold">Error loading officers:</span> {loadError}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={disabled}
          placeholder="Search officer by name, email, designation, or department..."
          className="w-full text-[12px] pl-8 pr-3 py-1.5 border border-[#D7DEDA] rounded-[2px] text-[#172E33] placeholder-[#8A9B9D] focus:outline-none focus:border-[#165A60] bg-white disabled:opacity-60"
        />
        <span className="absolute left-2.5 top-2 text-[#8A9B9D] text-xs pointer-events-none">
          🔍
        </span>
      </div>

      {/* Officers List */}
      <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-[#D7DEDA]/40">
        {filteredOfficers.length === 0 ? (
          <div className="py-6 text-center text-[#8A9B9D] text-xs">
            {searchQuery.trim()
              ? `No officers match "${searchQuery}"`
              : "No active scrutiny officers provisioned in system."}
          </div>
        ) : (
          filteredOfficers.map((officer) => {
            const isSelected = selectedOfficerId === officer.id;

            return (
              <div
                key={officer.id}
                onClick={() => {
                  if (!disabled) onSelectOfficer(officer);
                }}
                className={`p-2.5 rounded-[2px] border transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
                  isSelected
                    ? "bg-[#EAF3EE] border-[#165A60] text-[#172E33] shadow-xs ring-1 ring-[#165A60]"
                    : "bg-white border-[#D7DEDA] hover:bg-[#FAFAF8] text-[#172E33]"
                } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-[#172E33] truncate">
                      {officer.name}
                    </span>
                    {officer.department && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-[2px] bg-[#EBEAE5] text-[#5C6F73] shrink-0">
                        {officer.department}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#5C6F73] mt-0.5 truncate">
                    {officer.designation || "Scrutiny Officer"}
                  </div>
                  <div className="text-[10px] font-mono text-[#8A9B9D] mt-0.5 truncate">
                    {officer.email}
                  </div>
                </div>

                {/* Selection Radio / Check Indicator */}
                <div className="pt-0.5 shrink-0">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected
                        ? "border-[#165A60] bg-[#165A60] text-white"
                        : "border-[#D7DEDA] bg-white"
                    }`}
                  >
                    {isSelected && <span className="text-[10px] leading-none">✓</span>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
