import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../../shared/api/client";
import { Button } from "../../../shared/ui/button";
import type { ApplicationListItem } from "../../intake/types/intake.types";

export const MyApplicationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchApplications = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    apiClient<{ success: boolean; data: ApplicationListItem[] }>("/applications")
      .then((response) => {
        if (response && Array.isArray(response.data)) {
          setApplications(response.data);
        } else {
          setApplications([]);
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to load assigned applications.";
        setErrorMessage(msg);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    let ignore = false;
    apiClient<{ success: boolean; data: ApplicationListItem[] }>("/applications")
      .then((response) => {
        if (!ignore) {
          if (response && Array.isArray(response.data)) {
            setApplications(response.data);
          } else {
            setApplications([]);
          }
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Failed to load assigned applications.";
          setErrorMessage(msg);
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

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

    if (status === "COMPLIANT" || status === "EXTRACTION_COMPLETED" || status === "SCRUTINY_COMPLETED") {
      bg = "bg-[#EAF3EE] text-[#245E3F] border-[#C8E6C9]";
      label = status === "COMPLIANT" ? "✓ Compliant" : status.replace(/_/g, " ");
    } else if (status === "DEFICIENCIES_DETECTED" || status === "EXTRACTION_FAILED" || status === "SCRUTINY_FAILED") {
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
    <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-6 select-none">
      {/* Page Header */}
      <div className="mb-6">
        <div className="text-[10px] font-mono tracking-wider uppercase text-[#5C6F73] mb-1">
          OFFICER &nbsp;/&nbsp; MY APPLICATIONS &nbsp;/&nbsp; 2026–27
        </div>
        <h1 className="text-[28px] font-bold text-[#172E33] tracking-tight m-0">
          My applications
        </h1>
        <p className="text-[13px] text-[#5C6F73] mt-1 m-0">
          Regulatory cases and statutory applications assigned to your desk for scrutiny and review.
        </p>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-[#FDF2F2] border border-[#E8C5C5] rounded-[3px] text-[#9E2A2B] flex items-center justify-between">
          <div>
            <div className="text-[13px] font-bold">Failed to load assigned applications</div>
            <div className="text-[12px] mt-0.5">{errorMessage}</div>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={fetchApplications}
            className="text-[12px] bg-white border-[#E8C5C5] text-[#9E2A2B] px-3 py-1"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Applications Table Card */}
      <div className="bg-white border border-[#D7DEDA] rounded-[2px] shadow-sm overflow-hidden">
        {/* Table Top Bar */}
        <div className="px-5 py-3.5 border-b border-[#D7DEDA] bg-[#FAFAF8] flex items-center justify-between">
          <div>
            <div className="text-[14px] font-bold text-[#172E33]">
              Assigned application register
            </div>
            <div className="text-[11px] text-[#5C6F73] mt-0.5">
              Live lifecycle state and latest deterministic scrutiny outcomes
            </div>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 bg-[#EBEAE5] text-[#172E33] rounded-[2px] shrink-0">
            {applications.length} application{applications.length === 1 ? "" : "s"}
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
                <th className="py-2.5 px-3 font-semibold">Scrutiny Outcome</th>
                <th className="py-2.5 px-3 font-semibold">Rule Scrutiny Breakdown</th>
                <th className="py-2.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D7DEDA] text-[13px]">
              {isLoading ? (
                // Loading Skeletons
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
                      <div className="h-4 bg-[#EBEAE5] rounded w-40 mb-1" />
                      <div className="h-3 bg-[#EBEAE5] rounded w-24" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-7 bg-[#EBEAE5] rounded w-36 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#8A9B9D]">
                    <div className="text-2xl mb-1">📋</div>
                    <div className="text-[14px] font-semibold text-[#172E33]">
                      No applications assigned to your desk
                    </div>
                    <div className="text-[12px] text-[#5C6F73] mt-1">
                      Assigned statutory applications will appear here for regulatory evaluation.
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

                      {/* Col 4: Scrutiny Outcome */}
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

                      {/* Col 6: Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          type="button"
                          onClick={() => navigate(`/officer/applications/${app.id}`)}
                          className="bg-[#165A60] hover:bg-[#122B30] text-white text-[12px] font-medium px-3.5 py-1.5 rounded-[3px] inline-flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          Continue to application →
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Legal Note */}
      <div className="text-center text-[11px] text-[#8A9B9D] mt-10 pb-6 border-t border-[#D7DEDA]/40 pt-4">
        Statutory Processing Portal · AICTE Approval Process Handbook (APH) 2026–27 · Authorized personnel only.
      </div>
    </div>
  );
};
