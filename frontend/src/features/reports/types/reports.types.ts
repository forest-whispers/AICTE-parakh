export type RuleOutcome =
  | "PASS"
  | "FAIL_DEFICIENCY"
  | "EXPIRED"
  | "MISMATCH_DETECTED"
  | "EVIDENCE_MISSING"
  | "EXTRACTION_UNCERTAIN"
  | "MANUAL_REVIEW_REQUIRED"
  | "INSUFFICIENT_INPUT"
  | "NOT_APPLICABLE";

export interface FindingEvidence {
  documentId?: string;
  documentType?: string;
  fieldName?: string;
  rawText?: string | null;
  extractedValue?: unknown;
  pageNumber?: number | null;
  excerpt?: string | null;
  isOfficerReviewed?: boolean;
  reviewedAt?: string;
  reviewedByName?: string;
}

export interface RuleFinding {
  ruleId: string;
  ruleName: string;
  aphClause?: string;
  outcome: RuleOutcome;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "ADVISORY";
  summary: string;
  details?: string;
  evidence?: FindingEvidence[];
  remediationNote?: string;
}

export interface ScrutinyReportListItem {
  id: string;
  applicationId: string;
  evaluationDate: string;
  overallStatus: "COMPLIANT" | "DEFICIENCIES_DETECTED" | "MANUAL_REVIEW_REQUIRED" | "INSUFFICIENT_INPUT";
  totalRulesRun: number;
  passedCount: number;
  deficiencyCount: number;
  reviewCount: number;
  missingCount: number;
  createdAt: string;
  application: {
    id: string;
    applicationNumber: string;
    institutionName: string;
    programCategory?: string | null;
    proposedIntake?: number | null;
    status: string;
    assignedOfficerId?: string | null;
    assignedOfficer?: {
      id: string;
      name: string;
      email: string;
      designation: string;
    } | null;
  };
}

export interface ScrutinyReportDetail extends ScrutinyReportListItem {
  findings: RuleFinding[];
  application: ScrutinyReportListItem["application"] & {
    documents?: Array<{
      id: string;
      fileName: string;
      originalName: string;
      documentType: string;
      mimeType: string;
      fileSize: number;
    }>;
  };
}

export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
