import type {
  StagedDocument,
  BackendScrutinyReport,
  OfficerValidationDecision,
} from "../types/intake.types";

export interface DocumentValidationBadge {
  text: string;
  bgClass: string;
  outcome: "PASS" | "DEFICIENCY" | "MANUAL_APPROVAL" | "EVIDENCE_MISSING" | "FAILED";
  detailNote?: string;
  isOfficerOverride?: boolean;
  officerDecision?: {
    status: "PASS" | "DEFICIENCY" | "MANUAL_APPROVAL";
    notes?: string;
    reviewedAt: string;
    reviewedByName?: string;
  };
}

export function computeRawValidationOutcome(
  doc: StagedDocument,
  latestScrutinyReport?: BackendScrutinyReport | null,
  isExtractionFailed?: boolean
): DocumentValidationBadge {
  // 1. Extraction Failure
  if (doc.processingState === "FAILED" || doc.extractionData?.status === "FAILED" || isExtractionFailed) {
    return {
      text: "! EXTRACTION FAILED",
      bgClass: "bg-[#FDF2F2] text-[#9E2A2B] border-[#E8C5C5]",
      outcome: "FAILED",
      detailNote: "VLM extraction did not complete for this document",
    };
  }

  // 2. Check Scrutiny Findings for this document
  if (latestScrutinyReport?.findings && Array.isArray(latestScrutinyReport.findings)) {
    const relatedFindings = latestScrutinyReport.findings.filter((f) => {
      if (!f.evidence || !Array.isArray(f.evidence)) return false;
      return f.evidence.some(
        (ev) => ev.documentType === doc.categoryCode || ev.documentType === doc.shortLabel
      );
    });

    if (relatedFindings.length > 0) {
      const hasDeficiency = relatedFindings.some(
        (f) =>
          f.outcome === "FAIL_DEFICIENCY" ||
          f.outcome === "EXPIRED" ||
          f.outcome === "MISMATCH_DETECTED"
      );
      if (hasDeficiency) {
        const defFinding = relatedFindings.find(
          (f) =>
            f.outcome === "FAIL_DEFICIENCY" ||
            f.outcome === "EXPIRED" ||
            f.outcome === "MISMATCH_DETECTED"
        );
        return {
          text: "! DEFICIENCY DETECTED",
          bgClass: "bg-[#FDF2F2] text-[#9E2A2B] border-[#E8C5C5]",
          outcome: "DEFICIENCY",
          detailNote: defFinding?.findingNote || defFinding?.ruleName,
        };
      }

      const hasReview = relatedFindings.some(
        (f) =>
          f.outcome === "MANUAL_REVIEW_REQUIRED" ||
          f.outcome === "EXTRACTION_UNCERTAIN" ||
          f.outcome === "INSUFFICIENT_INPUT"
      );
      if (hasReview) {
        const revFinding = relatedFindings.find(
          (f) =>
            f.outcome === "MANUAL_REVIEW_REQUIRED" ||
            f.outcome === "EXTRACTION_UNCERTAIN" ||
            f.outcome === "INSUFFICIENT_INPUT"
        );
        return {
          text: "△ NEEDS MANUAL APPROVAL",
          bgClass: "bg-[#FFF9E6] text-[#8D6B00] border-[#FFE58F]",
          outcome: "MANUAL_APPROVAL",
          detailNote: revFinding?.findingNote || revFinding?.ruleName,
        };
      }

      const hasMissing = relatedFindings.some((f) => f.outcome === "EVIDENCE_MISSING");
      if (hasMissing) {
        return {
          text: "! EVIDENCE MISSING",
          bgClass: "bg-[#FDF2F2] text-[#9E2A2B] border-[#E8C5C5]",
          outcome: "EVIDENCE_MISSING",
          detailNote: "Mandatory statutory evidence missing",
        };
      }

      return {
        text: "✓ PASS",
        bgClass: "bg-[#EAF3EE] text-[#245E3F] border-[#C8E6C9]",
        outcome: "PASS",
        detailNote: "All statutory rules verified and compliant",
      };
    }
  }

  // 3. Fallback to Overall Scrutiny Outcome if no document-specific rule was hit
  if (latestScrutinyReport?.overallStatus) {
    if (latestScrutinyReport.overallStatus === "COMPLIANT") {
      return {
        text: "✓ PASS",
        bgClass: "bg-[#EAF3EE] text-[#245E3F] border-[#C8E6C9]",
        outcome: "PASS",
        detailNote: "Application evaluated compliant",
      };
    }
    if (latestScrutinyReport.overallStatus === "MANUAL_REVIEW_REQUIRED") {
      const hasUncertainField = Object.values(doc.extractionData?.fields || {}).some(
        (f) => f.state === "uncertain"
      );
      if (hasUncertainField || doc.processingState === "UNCERTAIN") {
        return {
          text: "△ NEEDS MANUAL APPROVAL",
          bgClass: "bg-[#FFF9E6] text-[#8D6B00] border-[#FFE58F]",
          outcome: "MANUAL_APPROVAL",
          detailNote: "Ambiguous or uncertain evidence requires officer inspection",
        };
      }
      return {
        text: "✓ PASS",
        bgClass: "bg-[#EAF3EE] text-[#245E3F] border-[#C8E6C9]",
        outcome: "PASS",
      };
    }
    if (latestScrutinyReport.overallStatus === "DEFICIENCIES_DETECTED") {
      return {
        text: "✓ PASS",
        bgClass: "bg-[#EAF3EE] text-[#245E3F] border-[#C8E6C9]",
        outcome: "PASS",
      };
    }
  }

  // 4. Extraction outcome if scrutiny is pending
  if (doc.processingState === "UNCERTAIN" || doc.extractionData?.status === "UNCERTAIN") {
    return {
      text: "△ NEEDS MANUAL APPROVAL",
      bgClass: "bg-[#FFF9E6] text-[#8D6B00] border-[#FFE58F]",
      outcome: "MANUAL_APPROVAL",
      detailNote: "Review required due to extraction uncertainty",
    };
  }

  return {
    text: "✓ PASS",
    bgClass: "bg-[#EAF3EE] text-[#245E3F] border-[#C8E6C9]",
    outcome: "PASS",
    detailNote: "Document staged and uploaded",
  };
}

export function computeDocumentValidationOutcome(
  doc: StagedDocument,
  latestScrutinyReport?: BackendScrutinyReport | null,
  isExtractionFailed?: boolean
): DocumentValidationBadge {
  // Check for Officer Validation decision first
  const rawEnvelope = doc.extractionData?.rawOutput as Record<string, unknown> | undefined;
  const officerVal =
    doc.extractionData?.officerValidation ||
    ((rawEnvelope?.officerValidation as OfficerValidationDecision | undefined) ?? null);

  if (officerVal && officerVal.status) {
    if (officerVal.status === "PASS") {
      return {
        text: "✓ PASS (OFFICER)",
        bgClass: "bg-[#EAF3EE] text-[#245E3F] border-[#C8E6C9]",
        outcome: "PASS",
        detailNote: officerVal.notes || `Verified by ${officerVal.reviewedByName || "Officer"}`,
        isOfficerOverride: true,
        officerDecision: officerVal,
      };
    }
    if (officerVal.status === "DEFICIENCY") {
      return {
        text: "! DEFICIENCY (OFFICER)",
        bgClass: "bg-[#FDF2F2] text-[#9E2A2B] border-[#E8C5C5]",
        outcome: "DEFICIENCY",
        detailNote: officerVal.notes || `Deficiency flagged by ${officerVal.reviewedByName || "Officer"}`,
        isOfficerOverride: true,
        officerDecision: officerVal,
      };
    }
    if (officerVal.status === "MANUAL_APPROVAL") {
      return {
        text: "△ MANUAL REVIEW (OFFICER)",
        bgClass: "bg-[#FFF9E6] text-[#8D6B00] border-[#FFE58F]",
        outcome: "MANUAL_APPROVAL",
        detailNote: officerVal.notes || `Manual inspection recorded by ${officerVal.reviewedByName || "Officer"}`,
        isOfficerOverride: true,
        officerDecision: officerVal,
      };
    }
  }

  return computeRawValidationOutcome(doc, latestScrutinyReport, isExtractionFailed);
}
