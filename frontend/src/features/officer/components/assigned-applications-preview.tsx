import React from "react";
import type { AssignedApplicationPreview } from "../types/workbench.types";
import { ArrowRight, Folder } from "lucide-react";

interface AssignedApplicationsPreviewProps {
  applications: AssignedApplicationPreview[];
  totalAssigned: number;
  onViewAllClick: () => void;
  onApplicationClick: (app: AssignedApplicationPreview) => void;
}

function formatProcessingState(status: string): string {
  switch (status) {
    case "COMPLIANT":
      return "Compliant (Ready for endorsement)";
    case "DEFICIENCIES_DETECTED":
      return "Regulatory scrutiny (Deficiencies)";
    case "MANUAL_REVIEW_REQUIRED":
      return "Verification / further review";
    case "EXTRACTION_FAILED":
      return "Document extraction failed";
    case "INTAKE_SUBMITTED":
      return "Intake submitted / scrutiny pending";
    case "READY_FOR_SCRUTINY":
      return "Ready for scrutiny";
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
    return "";
  }
}

export const AssignedApplicationsPreview: React.FC<AssignedApplicationsPreviewProps> = ({
  applications,
  totalAssigned,
  onViewAllClick,
  onApplicationClick,
}) => {
  return (
    <div className="bg-white border border-[#D7DEDA] rounded-[3px] shadow-subtle p-5 sm:p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[#D7DEDA] mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#172E33] tracking-tight m-0">My applications</h3>
          </div>
          <button
            type="button"
            onClick={onViewAllClick}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#165A60] hover:text-[#12494E] hover:underline transition-colors select-none"
          >
            <span>View all {totalAssigned}</span>
            <ArrowRight className="w-3.5 h-3.5" />
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
                <tr className="border-b border-[#D7DEDA] text-[10px] font-mono uppercase tracking-wider text-[#5C6F73]">
                  <th className="py-2 font-medium w-[40%]">REFERENCE</th>
                  <th className="py-2 font-medium w-[35%]">PROCESSING STATE</th>
                  <th className="py-2 font-medium w-[25%] text-right">LATEST ACTIVITY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D7DEDA]">
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => onApplicationClick(app)}
                    className="hover:bg-[#F6F5F0]/70 cursor-pointer transition-colors group"
                  >
                    <td className="py-2.5 align-middle">
                      <div className="font-mono text-xs font-semibold text-[#172E33] group-hover:text-[#165A60] transition-colors">
                        {app.applicationNumber}
                      </div>
                      <div className="text-[11px] text-[#5C6F73] truncate max-w-[200px]">
                        {app.institutionName}
                      </div>
                    </td>
                    <td className="py-2.5 align-middle text-[#5C6F73]">
                      <span className="capitalize">{formatProcessingState(app.status)}</span>
                    </td>
                    <td className="py-2.5 align-middle text-right font-mono text-[11px] text-[#5C6F73]">
                      {formatDate(app.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
