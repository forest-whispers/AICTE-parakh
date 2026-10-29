import React from "react";
import { Link, useNavigate } from "react-router-dom";
import type { OfficerWorkloadData } from "../types/ministry.types";

interface OfficerWorkloadCardProps {
  workload: OfficerWorkloadData;
}

export const OfficerWorkloadCard: React.FC<OfficerWorkloadCardProps> = ({ workload }) => {
  const navigate = useNavigate();
  const { officers, unassignedQueue, distributionSummary } = workload;

  // Max assigned applications to normalize progress bar
  const maxAssigned = Math.max(1, distributionSummary?.maxApplicationsPerOfficer || 40);

  const oldestUnassigned =
    unassignedQueue.applications && unassignedQueue.applications.length > 0
      ? unassignedQueue.applications[0]
      : null;

  return (
    <div className="bg-white border border-[#D7DEDA] rounded-[3px] p-5 shadow-2xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-[15px] font-bold text-[#172E33] m-0 tracking-tight">
            Officer workload
          </h3>
          <button
            type="button"
            onClick={() => navigate("/ministry/allocation")}
            className="text-[12px] font-mono text-[#165A60] hover:text-[#122B30] hover:underline cursor-pointer"
          >
            Open allocation →
          </button>
        </div>

        {/* Legend */}
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#5C6F73] pb-2 border-b border-[#D7DEDA]">
          ASSIGNED / ACTIVE · DEFICIENCIES · AGING · REVIEW
        </div>

        {/* Officer Workload Rows */}
        <div className="divide-y divide-[#D7DEDA]/40 mt-1">
          {officers.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#5C6F73] font-mono">
              No regional officers registered.
            </div>
          ) : (
            officers.map((item) => {
              const activeRatio = Math.min(100, (item.totalAssigned / maxAssigned) * 100);

              return (
                <div
                  key={item.officer.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  {/* Officer Name */}
                  <div className="w-[110px] shrink-0 truncate font-medium text-[#172E33]" title={item.officer.name}>
                    {item.officer.name}
                  </div>

                  {/* Horizontal Bar */}
                  <div className="flex-1 bg-[#EBEAE5] h-[6px] rounded-[1px] overflow-hidden max-w-[140px]">
                    <div
                      className="bg-[#165A60] h-full transition-all"
                      style={{ width: `${Math.max(5, activeRatio)}%` }}
                    />
                  </div>

                  {/* Metrics String */}
                  <div className="text-[11px] font-mono text-[#5C6F73] shrink-0 text-right">
                    <span className="font-semibold text-[#172E33]">
                      {item.totalAssigned}/{item.activeCount}
                    </span>{" "}
                    · {item.deficienciesCount} · {item.agingCount} · {item.manualReviewCount}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Unassigned Quick Callout */}
      <div className="pt-4 mt-3 border-t border-[#D7DEDA] text-[11px]">
        <div className="text-[#172E33] font-mono font-medium flex items-center justify-between">
          <span>
            {unassignedQueue.count} unassigned
            {oldestUnassigned?.createdAt
              ? ` · oldest received ${new Date(oldestUnassigned.createdAt).toLocaleDateString([], {
                  day: "numeric",
                  month: "short",
                })}`
              : ""}
          </span>
        </div>

        {oldestUnassigned && (
          <div className="mt-1 flex items-center justify-between text-[#5C6F73] font-mono text-[11px] truncate">
            <span className="truncate mr-2">
              {oldestUnassigned.applicationNumber} · {oldestUnassigned.institutionName}
            </span>
            <Link
              to="/ministry/allocation"
              className="text-[#165A60] hover:text-[#122B30] hover:underline font-semibold shrink-0"
            >
              → Allocate
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

