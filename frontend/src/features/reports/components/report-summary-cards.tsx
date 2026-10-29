import React from "react";
import type { ScrutinyReportDetail } from "../types/reports.types";

interface ReportSummaryCardsProps {
  report: ScrutinyReportDetail;
}

export const ReportSummaryCards: React.FC<ReportSummaryCardsProps> = ({ report }) => {
  const evalDate = report.evaluationDate
    ? new Date(report.evaluationDate).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const formatProgramCategory = (category?: string | null) => {
    if (!category) return "Not Specified";
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

  const getOverallStatusDisplay = () => {
    switch (report.overallStatus) {
      case "COMPLIANT":
        return {
          title: "Compliant — All Statutory Standards Met",
          desc: "The institution satisfies all evaluated regulatory requirements under AICTE Approval Process Handbook (APH) 2026–27.",
          badge: "bg-[#EAF3EE] text-[#245E3F] border-[#C8E6C9]",
          icon: "✓",
        };
      case "DEFICIENCIES_DETECTED":
        return {
          title: "Deficiencies Detected — Regulatory Issues Identified",
          desc: "One or more statutory requirements contain substantive deficiencies or validity expirations that require committee remediation.",
          badge: "bg-[#FDF2F2] text-[#9E2A2B] border-[#E8C5C5]",
          icon: "!",
        };
      case "MANUAL_REVIEW_REQUIRED":
        return {
          title: "Manual Review Required — Ambiguous Evidence",
          desc: "Extracted evidence exhibits ambiguity, low confidence, or manual approval routing that must be finalized by a scrutiny officer.",
          badge: "bg-[#FFF9E6] text-[#8D6B00] border-[#FFE58F]",
          icon: "△",
        };
      case "INSUFFICIENT_INPUT":
        return {
          title: "Insufficient Input — Incomplete Document Ingestion",
          desc: "Mandatory statutory documents are missing or could not be processed during initial intake.",
          badge: "bg-[#F0F2F2] text-[#5C6F73] border-[#D7DEDA]",
          icon: "○",
        };
      default:
        return {
          title: String(report.overallStatus).replace(/_/g, " "),
          desc: "Scrutiny evaluation recorded.",
          badge: "bg-[#F0F2F2] text-[#5C6F73] border-[#D7DEDA]",
          icon: "•",
        };
    }
  };

  const statusInfo = getOverallStatusDisplay();

  return (
    <div className="space-y-6">
      {/* Primary Executive Outcome Banner */}
      <div
        className={`p-5 rounded-[2px] border ${statusInfo.badge} flex flex-col md:flex-row md:items-center justify-between gap-4`}
      >
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-[2px] bg-white flex items-center justify-center font-bold text-lg shrink-0 border border-current shadow-xs">
            {statusInfo.icon}
          </div>
          <div>
            <h3 className="text-[16px] font-bold m-0 leading-tight">
              {statusInfo.title}
            </h3>
            <p className="text-[12px] mt-1 mb-0 leading-relaxed opacity-90 max-w-2xl">
              {statusInfo.desc}
            </p>
          </div>
        </div>

        <div className="text-left md:text-right shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-current/20">
          <div className="text-[10px] font-mono uppercase tracking-wider opacity-75">
            EVALUATION TIMESTAMP
          </div>
          <div className="text-[13px] font-mono font-bold mt-0.5">
            {evalDate}
          </div>
        </div>
      </div>

      {/* Summary Scorecards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-[#D7DEDA] rounded-[2px] p-3.5 shadow-xs">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#5C6F73]">
            TOTAL EVALUATED
          </div>
          <div className="text-2xl font-bold font-mono text-[#172E33] mt-1">
            {report.totalRulesRun}
          </div>
          <div className="text-[11px] text-[#8A9B9D] mt-0.5">Statutory Rules</div>
        </div>

        <div className="bg-white border border-[#D7DEDA] rounded-[2px] p-3.5 shadow-xs">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#245E3F]">
            COMPLIANT RULES
          </div>
          <div className="text-2xl font-bold font-mono text-[#245E3F] mt-1">
            {report.passedCount}
          </div>
          <div className="text-[11px] text-[#8A9B9D] mt-0.5">Full Compliance</div>
        </div>

        <div className="bg-white border border-[#D7DEDA] rounded-[2px] p-3.5 shadow-xs">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#9E2A2B]">
            DEFICIENCIES
          </div>
          <div className="text-2xl font-bold font-mono text-[#9E2A2B] mt-1">
            {report.deficiencyCount}
          </div>
          <div className="text-[11px] text-[#8A9B9D] mt-0.5">Shortfalls Detected</div>
        </div>

        <div className="bg-white border border-[#D7DEDA] rounded-[2px] p-3.5 shadow-xs">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#8D6B00]">
            MANUAL REVIEW
          </div>
          <div className="text-2xl font-bold font-mono text-[#8D6B00] mt-1">
            {report.reviewCount}
          </div>
          <div className="text-[11px] text-[#8A9B9D] mt-0.5">Ambiguous Evidence</div>
        </div>

        <div className="bg-white border border-[#D7DEDA] rounded-[2px] p-3.5 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#5C6F73]">
            MISSING EVIDENCE
          </div>
          <div className="text-2xl font-bold font-mono text-[#5C6F73] mt-1">
            {report.missingCount}
          </div>
          <div className="text-[11px] text-[#8A9B9D] mt-0.5">Required Documents</div>
        </div>
      </div>

      {/* Application Particulars & Case Metadata */}
      <div className="bg-white border border-[#D7DEDA] rounded-[2px] shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-[#D7DEDA] bg-[#FAFAF8] flex items-center justify-between">
          <div className="text-[13px] font-bold text-[#172E33]">
            Application &amp; Case Identification
          </div>
          <div className="text-[11px] font-mono text-[#5C6F73]">
            Report ID: <span className="font-semibold text-[#172E33]">{report.id}</span>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-[13px]">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#8A9B9D]">
              INSTITUTION NAME
            </div>
            <div className="font-bold text-[#172E33] mt-0.5 leading-snug">
              {report.application?.institutionName}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#8A9B9D]">
              APPLICATION REFERENCE
            </div>
            <div className="font-mono font-semibold text-[#165A60] mt-0.5">
              {report.application?.applicationNumber}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#8A9B9D]">
              PROGRAM &amp; INTAKE
            </div>
            <div className="font-medium text-[#172E33] mt-0.5">
              {formatProgramCategory(report.application?.programCategory)}
            </div>
            <div className="text-[11px] font-mono text-[#5C6F73]">
              {report.application?.proposedIntake ? `${report.application.proposedIntake} Approved Seats` : "Intake unassigned"}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#8A9B9D]">
              ASSIGNED DESK OFFICER
            </div>
            <div className="font-medium text-[#172E33] mt-0.5">
              {report.application?.assignedOfficer?.name || "Unassigned"}
            </div>
            <div className="text-[11px] text-[#8A9B9D]">
              {report.application?.assignedOfficer?.designation || "Pending desk allocation"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
