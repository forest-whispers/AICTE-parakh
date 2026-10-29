import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../../shared/api/client";
import { Button } from "../../../shared/ui/button";
import { ReportSummaryCards } from "../components/report-summary-cards";
import { ReportFindingsTable } from "../components/report-findings-table";
import type { ScrutinyReportDetail } from "../types/reports.types";

interface ScrutinyReportDetailPageProps {
  userRole: "OFFICER" | "MINISTRY_ADMIN";
}

export const ScrutinyReportDetailPage: React.FC<ScrutinyReportDetailPageProps> = ({
  userRole,
}) => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<ScrutinyReportDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const isMinistry = userRole === "MINISTRY_ADMIN";
  const registerPath = isMinistry ? "/ministry/reports" : "/officer/reports";
  const effectiveError = !reportId ? "No Report ID specified in route." : errorMessage;

  useEffect(() => {
    let ignore = false;
    if (!reportId) return;

    apiClient<{ success: boolean; data: ScrutinyReportDetail }>(`/reports/${reportId}`)
      .then((res) => {
        if (!ignore) {
          if (res?.data) {
            setReport(res.data);
          } else {
            setErrorMessage("Report not found.");
          }
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          const msg =
            err instanceof Error ? err.message : "Failed to load scrutiny report details.";
          setErrorMessage(msg);
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [reportId]);

  const handleDownloadPdf = async () => {
    if (!report) return;

    setIsDownloadingPdf(true);
    setDownloadError(null);

    try {
      const token = localStorage.getItem("parakh_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/reports/${report.id}/pdf`, {
        method: "GET",
        headers,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Failed to download PDF (HTTP ${res.status})`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeAppNumber = (report.application?.applicationNumber || "APP").replace(
        /[^a-zA-Z0-9-_]/g,
        "_"
      );
      link.download = `PARAKH-Scrutiny-Report-${safeAppNumber}-${report.id.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "PDF generation failed.";
      setDownloadError(msg);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (isLoading && !effectiveError) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-8 animate-pulse space-y-6">
        <div className="h-4 bg-[#EBEAE5] rounded w-64" />
        <div className="h-8 bg-[#EBEAE5] rounded w-96" />
        <div className="h-28 bg-[#EBEAE5] rounded" />
        <div className="h-64 bg-[#EBEAE5] rounded" />
      </div>
    );
  }

  if (effectiveError || !report) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-10">
        <div className="p-6 bg-[#FDF2F2] border border-[#E8C5C5] rounded-[3px] text-[#9E2A2B] space-y-3">
          <h2 className="text-[18px] font-bold m-0">Failed to Load Scrutiny Report</h2>
          <p className="text-[13px] m-0">{effectiveError || "The requested scrutiny report could not be found."}</p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(registerPath)}
            className="text-[12px] bg-white border-[#E8C5C5] text-[#9E2A2B] px-3 py-1.5"
          >
            ← Return to Scrutiny Reports Register
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-6 select-none space-y-6">
      {/* Top Breadcrumb & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono tracking-wider uppercase text-[#5C6F73] mb-1">
            {isMinistry
              ? `MINISTRY / SCRUTINY OVERSIGHT / ${report.application?.applicationNumber || "REPORT"}`
              : `OFFICER / SCRUTINY REPORTS / ${report.application?.applicationNumber || "REPORT"}`}
          </div>
          <h1 className="text-[26px] font-bold text-[#172E33] tracking-tight m-0">
            Scrutiny Evaluation Report
          </h1>
          <p className="text-[12px] text-[#5C6F73] mt-0.5 m-0">
            Regulatory compliance determination for {report.application?.institutionName}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(registerPath)}
            className="text-[12px] bg-white border-[#D7DEDA] text-[#172E33] hover:bg-[#F6F5F0] px-3.5 py-2 rounded-[2px]"
          >
            ← Back to Register
          </Button>

          {report.application?.id && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(`/officer/applications/${report.application.id}`)}
              className="text-[12px] bg-white border-[#D7DEDA] text-[#165A60] hover:bg-[#EBF1F0] px-3.5 py-2 rounded-[2px]"
            >
              View Application Workspace ↗
            </Button>
          )}

          <Button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="text-[12px] bg-[#165A60] hover:bg-[#124B50] text-white px-4 py-2 rounded-[2px] font-medium shadow-xs inline-flex items-center gap-1.5"
          >
            {isDownloadingPdf ? (
              <>
                <span className="animate-spin text-sm">⏳</span>
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <span>📄</span>
                <span>Download PDF</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* PDF Download Error Banner */}
      {downloadError && (
        <div className="p-3 bg-[#FDF2F2] border border-[#E8C5C5] rounded-[2px] text-[12px] text-[#9E2A2B] flex items-center justify-between">
          <span>Failed to download PDF: {downloadError}</span>
          <button
            type="button"
            onClick={() => setDownloadError(null)}
            className="text-xs font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Section 1: Non-Tabular Readable Summary */}
      <ReportSummaryCards report={report} />

      {/* Section 2: Complete Rule Findings Table */}
      <ReportFindingsTable findings={report.findings || []} />
    </div>
  );
};
