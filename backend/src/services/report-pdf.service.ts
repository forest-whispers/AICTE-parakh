import PDFDocument from "pdfkit";
import { Writable } from "node:stream";

export interface ReportPdfData {
  id: string;
  applicationId: string;
  evaluationDate: Date | string;
  overallStatus: string;
  totalRulesRun: number;
  passedCount: number;
  deficiencyCount: number;
  reviewCount: number;
  missingCount: number;
  findings: any[];
  application: {
    id: string;
    applicationNumber: string;
    institutionName: string;
    programCategory?: string | null;
    proposedIntake?: number | null;
    status: string;
    assignedOfficer?: {
      id: string;
      name: string;
      email: string;
      designation: string;
    } | null;
  };
}

export class ReportPdfService {
  /**
   * Generates a multi-page, professionally styled PDF representation of a ScrutinyReport
   * and pipes it directly into the provided writable destination stream.
   */
  generateReportPdf(report: ReportPdfData, destination: Writable): void {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 45, right: 45 },
      bufferPages: true,
      info: {
        Title: `PARAKH Scrutiny Report - ${report.application.applicationNumber}`,
        Author: "PARAKH Statutory Scrutiny Engine",
        Subject: `Statutory compliance evaluation for ${report.application.institutionName}`,
      },
    });

    doc.pipe(destination);

    const primaryColor = "#122B30";
    const tealColor = "#165A60";
    const mutedColor = "#5C6F73";
    const lightBg = "#F6F5F0";
    const borderColor = "#D7DEDA";

    // --- Header Section ---
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .fillColor(primaryColor)
      .text("PARAKH", 45, 50, { characterSpacing: 1 });

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(mutedColor)
      .text("MINISTRY OF EDUCATION & AICTE · STATUTORY COMPLIANCE DIVISION", 45, 72, {
        characterSpacing: 0.5,
      });

    doc
      .fontSize(13)
      .font("Helvetica-Bold")
      .fillColor(tealColor)
      .text("SCRUTINY EVALUATION REPORT", 45, 92);

    // Metadata & Institution Details Box
    const boxY = 114;
    doc
      .rect(45, boxY, 505, 78)
      .fillAndStroke(lightBg, borderColor);

    const evalDateStr = report.evaluationDate
      ? new Date(report.evaluationDate).toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

    const progCategoryLabel = report.application.programCategory
      ? report.application.programCategory.replace(/_/g, " ")
      : "Not Specified";

    const officerName = report.application.assignedOfficer?.name
      ? `${report.application.assignedOfficer.name} (${report.application.assignedOfficer.designation || "Desk Officer"})`
      : "Unassigned";

    doc.fillColor("#172E33");
    // Column 1
    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .text("INSTITUTION:", 55, boxY + 10)
      .font("Helvetica")
      .text(report.application.institutionName, 130, boxY + 10, { width: 220 })
      .font("Helvetica-Bold")
      .text("APPLICATION NO:", 55, boxY + 26)
      .font("Helvetica")
      .text(report.application.applicationNumber, 130, boxY + 26)
      .font("Helvetica-Bold")
      .text("PROGRAM CATEGORY:", 55, boxY + 42)
      .font("Helvetica")
      .text(progCategoryLabel, 130, boxY + 42)
      .font("Helvetica-Bold")
      .text("PROPOSED INTAKE:", 55, boxY + 58)
      .font("Helvetica")
      .text(
        report.application.proposedIntake ? `${report.application.proposedIntake} Approved Seats` : "—",
        130,
        boxY + 58
      );

    // Column 2
    doc
      .font("Helvetica-Bold")
      .text("REPORT REF ID:", 360, boxY + 10)
      .font("Helvetica")
      .text(report.id, 430, boxY + 10, { width: 110 })
      .font("Helvetica-Bold")
      .text("EVALUATED AT:", 360, boxY + 26)
      .font("Helvetica")
      .text(evalDateStr, 430, boxY + 26)
      .font("Helvetica-Bold")
      .text("DESK OFFICER:", 360, boxY + 42)
      .font("Helvetica")
      .text(officerName, 430, boxY + 42, { width: 110 })
      .font("Helvetica-Bold")
      .text("LIFECYCLE STATE:", 360, boxY + 58)
      .font("Helvetica")
      .text(report.application.status.replace(/_/g, " "), 430, boxY + 58);

    // --- Executive Summary Box ---
    const execY = boxY + 88;
    let statusBg = "#EAF3EE";
    let statusBorder = "#C8E6C9";
    let statusTextColor = "#245E3F";
    let statusLabel = "COMPLIANT — All statutory rules verified successfully";

    if (report.overallStatus === "DEFICIENCIES_DETECTED") {
      statusBg = "#FDF2F2";
      statusBorder = "#E8C5C5";
      statusTextColor = "#9E2A2B";
      statusLabel = "DEFICIENCIES DETECTED — Regulatory shortfalls require remediation";
    } else if (report.overallStatus === "MANUAL_REVIEW_REQUIRED") {
      statusBg = "#FFF9E6";
      statusBorder = "#FFE58F";
      statusTextColor = "#8D6B00";
      statusLabel = "MANUAL REVIEW REQUIRED — Ambiguous or uncertain evidence noted";
    } else if (report.overallStatus === "INSUFFICIENT_INPUT") {
      statusBg = "#F0F2F2";
      statusBorder = "#D7DEDA";
      statusTextColor = "#5C6F73";
      statusLabel = "INSUFFICIENT INPUT — Mandatory documents missing from intake";
    }

    doc
      .rect(45, execY, 505, 30)
      .fillAndStroke(statusBg, statusBorder);

    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(statusTextColor)
      .text(statusLabel, 55, execY + 10);

    // Summary Scorecards Row
    const scoreY = execY + 38;
    const cardWidth = 95;
    const cardGap = 7.5;

    const scoreMetrics = [
      { label: "TOTAL RULES", value: String(report.totalRulesRun || (report.findings?.length || 0)), color: "#172E33" },
      { label: "PASSED", value: String(report.passedCount), color: "#245E3F" },
      { label: "DEFICIENCIES", value: String(report.deficiencyCount), color: "#9E2A2B" },
      { label: "MANUAL REVIEW", value: String(report.reviewCount), color: "#8D6B00" },
      { label: "MISSING DOCS", value: String(report.missingCount), color: "#5C6F73" },
    ];

    scoreMetrics.forEach((metric, idx) => {
      const cardX = 45 + idx * (cardWidth + cardGap);
      doc
        .rect(cardX, scoreY, cardWidth, 36)
        .fillAndStroke("#FFFFFF", borderColor);

      doc
        .fontSize(7)
        .font("Helvetica-Bold")
        .fillColor(mutedColor)
        .text(metric.label, cardX + 5, scoreY + 6, { width: cardWidth - 10, align: "center" });

      doc
        .fontSize(13)
        .font("Helvetica-Bold")
        .fillColor(metric.color)
        .text(metric.value, cardX + 5, scoreY + 17, { width: cardWidth - 10, align: "center" });
    });

    // --- Detailed Findings Section ---
    let currentY = scoreY + 48;
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor(primaryColor)
      .text("STATUTORY RULE FINDINGS & EVIDENCE PROVENANCE", 45, currentY);

    currentY += 18;

    const findings = Array.isArray(report.findings) ? report.findings : [];

    if (findings.length === 0) {
      doc
        .fontSize(9)
        .font("Helvetica-Oblique")
        .fillColor(mutedColor)
        .text("No individual rule findings recorded in this report.", 45, currentY);
    } else {
      findings.forEach((finding: any, index: number) => {
        // Estimate height for page break: roughly 75-110 points per finding card
        if (currentY > 700) {
          doc.addPage();
          currentY = 55;
        }

        const findingStartY = currentY;
        const findingOutcome = String(finding.outcome || "UNKNOWN").replace(/_/g, " ");
        const severity = finding.severity || "MEDIUM";

        // Determine outcome pill colors
        let pillColor = "#245E3F";
        let pillBg = "#EAF3EE";
        if (finding.outcome === "FAIL_DEFICIENCY" || finding.outcome === "DEFICIENCY" || finding.outcome === "MISMATCH_DETECTED" || finding.outcome === "EXPIRED") {
          pillColor = "#9E2A2B";
          pillBg = "#FDF2F2";
        } else if (finding.outcome === "MANUAL_REVIEW_REQUIRED" || finding.outcome === "EXTRACTION_UNCERTAIN") {
          pillColor = "#8D6B00";
          pillBg = "#FFF9E6";
        } else if (finding.outcome === "EVIDENCE_MISSING" || finding.outcome === "INSUFFICIENT_INPUT") {
          pillColor = "#5C6F73";
          pillBg = "#F0F2F2";
        }

        // Card header background
        doc
          .rect(45, findingStartY, 505, 20)
          .fillAndStroke(lightBg, borderColor);

        // Header text: index + rule name + clause
        doc
          .fontSize(8)
          .font("Helvetica-Bold")
          .fillColor("#172E33")
          .text(
            `${index + 1}. [${finding.ruleId || "RULE"}] ${finding.ruleName || "Regulatory Standard"}`,
            52,
            findingStartY + 6,
            { width: 340 }
          );

        // Outcome badge & Severity
        doc
          .fontSize(7.5)
          .font("Helvetica-Bold")
          .fillColor(pillColor)
          .text(`${findingOutcome} · ${severity}`, 400, findingStartY + 6, {
            width: 140,
            align: "right",
          });

        let contentY = findingStartY + 25;

        // Clause line
        if (finding.aphClause) {
          doc
            .fontSize(7.5)
            .font("Helvetica-Oblique")
            .fillColor(mutedColor)
            .text(`Regulatory Reference: ${finding.aphClause}`, 52, contentY);
          contentY += 12;
        }

        // Summary / Details
        if (finding.summary) {
          doc
            .fontSize(8)
            .font("Helvetica-Bold")
            .fillColor("#172E33")
            .text("Finding Observation: ", 52, contentY, { continued: true })
            .font("Helvetica")
            .fillColor("#334155")
            .text(finding.summary, { width: 485 });
          contentY = doc.y + 4;
        }

        if (finding.details && finding.details !== finding.summary) {
          doc
            .fontSize(7.5)
            .font("Helvetica")
            .fillColor("#5C6F73")
            .text(`Details: ${finding.details}`, 52, contentY, { width: 485 });
          contentY = doc.y + 4;
        }

        if (finding.remediationNote) {
          doc
            .fontSize(7.5)
            .font("Helvetica-Bold")
            .fillColor("#9E2A2B")
            .text("Remediation: ", 52, contentY, { continued: true })
            .font("Helvetica")
            .text(finding.remediationNote, { width: 485 });
          contentY = doc.y + 4;
        }

        // Evidence list
        if (Array.isArray(finding.evidence) && finding.evidence.length > 0) {
          doc
            .fontSize(7.5)
            .font("Helvetica-Bold")
            .fillColor(tealColor)
            .text("Supporting Evidence & Provenance:", 52, contentY);
          contentY += 10;

          finding.evidence.forEach((ev: any) => {
            let evText = `• [${ev.documentType || "DOCUMENT"}] ${ev.fieldName || "Field"}: `;
            if (ev.extractedValue !== undefined && ev.extractedValue !== null) {
              evText += typeof ev.extractedValue === "object" ? JSON.stringify(ev.extractedValue) : String(ev.extractedValue);
            } else if (ev.rawText) {
              evText += ev.rawText;
            } else {
              evText += "Value present in document";
            }

            if (ev.pageNumber) {
              evText += ` (Page ${ev.pageNumber})`;
            }

            if (ev.isOfficerReviewed) {
              evText += ` [✓ Officer Verified by ${ev.reviewedByName || "Officer"}]`;
            }

            doc
              .fontSize(7)
              .font("Helvetica")
              .fillColor("#475569")
              .text(evText, 60, contentY, { width: 475 });
            contentY = doc.y + 2;
          });
        }

        // Draw card border around content
        const cardHeight = Math.max(contentY - findingStartY + 6, 32);
        doc
          .rect(45, findingStartY, 505, cardHeight)
          .stroke(borderColor);

        currentY = findingStartY + cardHeight + 8;
      });
    }

    // --- Footer & Running Headers on All Pages ---
    const pageRange = doc.bufferedPageRange();
    for (let i = 0; i < pageRange.count; i++) {
      doc.switchToPage(i);

      // Top running sub-rule (only on page 2 onwards)
      if (i > 0) {
        doc
          .fontSize(7.5)
          .font("Helvetica")
          .fillColor(mutedColor)
          .text(
            `PARAKH Scrutiny Report · Ref: ${report.application.applicationNumber} (${report.id})`,
            45,
            30
          );
        doc
          .strokeColor(borderColor)
          .lineWidth(0.5)
          .moveTo(45, 42)
          .lineTo(550, 42)
          .stroke();
      }

      // Bottom footer rule and page number
      doc
        .strokeColor(borderColor)
        .lineWidth(0.5)
        .moveTo(45, 792)
        .lineTo(550, 792)
        .stroke();

      doc
        .fontSize(7)
        .font("Helvetica")
        .fillColor(mutedColor)
        .text(
          "STATUTORY AUDIT SNAPSHOT · CONFIDENTIAL · AICTE APPROVAL PROCESS 2026–27",
          45,
          800
        );

      doc
        .fontSize(7)
        .font("Helvetica-Bold")
        .fillColor(mutedColor)
        .text(`Page ${i + 1} of ${pageRange.count}`, 45, 800, {
          width: 505,
          align: "right",
        });
    }

    doc.end();
  }
}

export const reportPdfService = new ReportPdfService();

