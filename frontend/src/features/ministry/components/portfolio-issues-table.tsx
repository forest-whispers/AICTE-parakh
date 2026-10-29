import React from "react";
import { Link, useNavigate } from "react-router-dom";
import type { CrossApplicationIssueItem } from "../types/ministry.types";

interface PortfolioIssuesTableProps {
  issues: CrossApplicationIssueItem[];
  totalCount: number;
}

function formatElapsed(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "<1h";
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

function getUrgencyBadge(severity: string) {
  switch (severity) {
    case "CRITICAL":
      return (
        <span className="inline-block text-[10px] font-mono font-medium px-2 py-0.5 rounded-[2px] bg-[#FDF2F2] text-[#9E2A2B] border border-[#E8C5C5]">
          Critical
        </span>
      );
    case "HIGH":
      return (
        <span className="inline-block text-[10px] font-mono font-medium px-2 py-0.5 rounded-[2px] bg-[#FEF7EC] text-[#94631F] border border-[#FFE58F]">
          High
        </span>
      );
    case "MEDIUM":
      return (
        <span className="inline-block text-[10px] font-mono font-medium px-2 py-0.5 rounded-[2px] bg-[#FAFAF8] text-[#5C6F73] border border-[#D7DEDA]">
          Medium
        </span>
      );
    case "ADVISORY":
    default:
      return (
        <span className="inline-block text-[10px] font-mono font-medium px-2 py-0.5 rounded-[2px] bg-[#EEF4F8] text-[#165A60] border border-[#CCE0DC]">
          Review
        </span>
      );
  }
}

export const PortfolioIssuesTable: React.FC<PortfolioIssuesTableProps> = ({
  issues,
  totalCount,
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-3">
      {/* Table Section Header */}
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-bold text-[#172E33] m-0 tracking-tight">
          Issues requiring attention
        </h2>
        <button
          type="button"
          onClick={() => navigate("/ministry/portfolio")}
          className="text-[12px] font-mono text-[#165A60] hover:text-[#122B30] hover:underline cursor-pointer"
        >
          View all {totalCount} applications →
        </button>
      </div>

      {/* Issues Table Container */}
      <div className="bg-white border border-[#D7DEDA] rounded-[3px] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAFAF8] border-b border-[#D7DEDA]">
                <th className="py-2.5 px-3.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#5C6F73] w-[130px]">
                  Application
                </th>
                <th className="py-2.5 px-3.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#5C6F73] w-[220px]">
                  Institution
                </th>
                <th className="py-2.5 px-3.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#5C6F73]">
                  Issue / Human-Readable Explanation
                </th>
                <th className="py-2.5 px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-[#5C6F73] w-[90px]">
                  Urgency
                </th>
                <th className="py-2.5 px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-[#5C6F73] w-[130px]">
                  Officer
                </th>
                <th className="py-2.5 px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-[#5C6F73] w-[70px]">
                  Elapsed
                </th>
                <th className="py-2.5 px-3.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#5C6F73] w-[120px] text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D7DEDA]">
              {issues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[#5C6F73] font-mono">
                    No active regulatory issues detected. All applications are compliant or processing normally.
                  </td>
                </tr>
              ) : (
                issues.map((issue) => {
                  const isUnassigned = !issue.assignedOfficerName;
                  const isAuthorityIssue =
                    issue.issueCategory === "AUTHORITY_MISMATCH" ||
                    issue.issueCategory === "AUTHORITY_EXPIRED" ||
                    issue.issueCategory === "CONFIRMATION_PENDING";

                  let actionLabel = "Open case →";
                  let actionUrl = `/officer/applications/${issue.applicationId}`;

                  if (isUnassigned) {
                    actionLabel = "Allocate →";
                    actionUrl = "/ministry/allocation";
                  } else if (isAuthorityIssue) {
                    actionLabel = "Verification →";
                  } else if (issue.issueCategory === "COMPLIANCE_DEFICIENCY") {
                    actionLabel = "View analysis →";
                  } else if (issue.issueCategory === "FORENSIC_ADVISORY") {
                    actionLabel = "Inspect evidence →";
                  }

                  return (
                    <tr
                      key={issue.id}
                      className="hover:bg-[#FAFAF8] transition-colors text-[12px] group"
                    >
                      {/* Application Reference */}
                      <td className="py-3 px-3.5 font-mono text-[#172E33] whitespace-nowrap">
                        <Link
                          to={`/officer/applications/${issue.applicationId}`}
                          className="hover:text-[#165A60] hover:underline"
                        >
                          {issue.applicationNumber}
                        </Link>
                      </td>

                      {/* Institution Name */}
                      <td className="py-3 px-3.5 text-[#172E33] font-medium max-w-[220px]">
                        <div className="truncate" title={issue.institutionName}>
                          {issue.institutionName}
                        </div>
                      </td>

                      {/* Issue Description */}
                      <td className="py-3 px-3.5 text-[#5C6F73]">
                        <span className="text-[#172E33] font-medium">{issue.title}</span>
                        {issue.details && issue.details !== issue.title && (
                          <span className="text-[#5C6F73]"> · {issue.details}</span>
                        )}
                      </td>

                      {/* Urgency */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getUrgencyBadge(issue.severity)}
                      </td>

                      {/* Assigned Officer */}
                      <td className="py-3 px-3 text-[#172E33] whitespace-nowrap">
                        {issue.assignedOfficerName ? (
                          <span>{issue.assignedOfficerName}</span>
                        ) : (
                          <span className="text-[#94631F] font-mono text-[11px] bg-[#FEF7EC] px-1.5 py-0.5 rounded border border-[#FFE58F]">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Elapsed Time */}
                      <td className="py-3 px-3 font-mono text-[#5C6F73] whitespace-nowrap">
                        {formatElapsed(issue.timestamp)}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap font-mono text-[11px]">
                        <Link
                          to={actionUrl}
                          className="text-[#165A60] hover:text-[#122B30] hover:underline font-medium"
                        >
                          {actionLabel}
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

