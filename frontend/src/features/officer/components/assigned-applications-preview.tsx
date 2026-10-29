import React from "react";
import type { AssignedApplicationPreview } from "../types/workbench.types";
import { Folder } from "lucide-react";

interface AssignedApplicationsPreviewProps {
  applications: AssignedApplicationPreview[];
  totalAssigned: number;
  onViewAllClick: () => void;
  onApplicationClick: (app: AssignedApplicationPreview) => void;
}

function formatShortRef(appNumber: string, instName: string): string {
  const parts = appNumber.split("/");
  const num = parts[parts.length - 1] || appNumber;
  const shortName = instName.split(" ")[0] || instName;
  return `${num} · ${shortName}`;
}

function formatProcessingState(status: string): string {
  switch (status) {
    case "APPROVED":
      return "Application approved";
    case "COMPLIANT":
      return "Computed compliant";
    case "DEFICIENCIES_DETECTED":
      return "Regulatory scrutiny";
    case "MANUAL_REVIEW_REQUIRED":
      return "Verification / further review";
    case "EXTRACTION_FAILED":
      return "Document extraction";
    case "INTAKE_SUBMITTED":
      return "Document extraction";
    case "READY_FOR_SCRUTINY":
      return "Regulatory scrutiny";
    default:
      return status.replace(/_/g, " ").toLowerCase();
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "28 Oct 09:44";
  }
}

export const AssignedApplicationsPreview: React.FC<AssignedApplicationsPreviewProps> = ({
  applications,
  totalAssigned,
  onViewAllClick,
  onApplicationClick,
}) => {
  return (
    <div className="bg-white border border-[#D7DEDA] rounded-[2px] p-6">
      {/* Header matching Figma 08: My applications / View all 38 → */}
      <div className="flex items-baseline gap-2 mb-4">
        <h3 className="text-xl font-bold text-[#172E33] tracking-tight m-0">My applications</h3>
        <span className="text-xs text-[#5C6F73]">/</span>
        <button
          type="button"
          onClick={onViewAllClick}
          className="text-xs font-normal text-[#2B686D] hover:underline transition-colors select-none p-0 bg-transparent border-0 cursor-pointer"
        >
          View all {totalAssigned} →
        </button>
      </div>

      {applications.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#5C6F73]">
          <Folder className="w-6 h-6 mx-auto mb-2 text-[#8A9B9D]" />
          No applications currently assigned.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#ECEFEA] text-[10px] font-mono uppercase tracking-wider text-[#5C6F73]">
                <th className="py-2.5 px-4 font-medium w-[40%]">REFERENCE</th>
                <th className="py-2.5 px-4 font-medium w-[38%]">PROCESSING STATE</th>
                <th className="py-2.5 px-4 font-medium w-[22%] text-right">LATEST ACTIVITY</th>
              </tr>
            </thead>
            <tbody>
              {applications.slice(0, 5).map((app, index) => {
                const shortRef = formatShortRef(app.applicationNumber, app.institutionName);
                const isFirst = index === 0;

                return (
                  <tr
                    key={app.id}
                    onClick={() => onApplicationClick(app)}
                    className={`cursor-pointer transition-colors ${
                      isFirst
                        ? "bg-[#E6F0EE]"
                        : "bg-white border-b border-[#EBECE7] hover:bg-[#F6F5F0]/70"
                    }`}
                  >
                    <td className="py-3 px-4 font-mono text-xs text-[#172E33]">
                      {shortRef}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#172E33]">
                      {formatProcessingState(app.status)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-[#2B686D]">
                      {formatDate(app.updatedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
