export interface PipelineStageItem {
  stageKey: string;
  stageName: string;
  applicationCount: number;
  description: string;
}

export interface PipelineBottleneckItem {
  applicationId: string;
  applicationNumber: string;
  institutionName: string;
  assignedOfficerName: string | null;
  assignedOfficerId: string | null;
  stage: string;
  bottleneckType: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  explanation: string;
  daysInStage: number;
  recommendedAction: string;
}

export interface PortfolioOverviewMetrics {
  totalApplications: number;
  awaitingAttention: number;
  extractionFailures: number;
  incompleteSubmissions: number;
  scrutinyDeficiencies: number;
  manualReviewRequired: number;
  pendingAuthorityConfirmations: number;
  unresolvedAuthorityMismatches: number;
  unresolvedForensicAnomalies: number;
  unassignedExceptions: number;
  agingApplications: number;
}

export interface PortfolioOverviewData {
  totalApplications: number;
  stages: {
    intake: number;
    extractionProcessing: number;
    extractionFailed: number;
    scrutinyPending: number;
    scrutinyEvaluated: number;
    authorityVerificationExecuted: number;
  };
  metrics: PortfolioOverviewMetrics;
  metricDefinitions?: Record<
    string,
    { key: string; name: string; description: string; isMutuallyExclusive: boolean }
  >;
  pipeline: PipelineStageItem[];
  bottlenecks: PipelineBottleneckItem[];
}

export interface OfficerWorkloadItem {
  officer: {
    id: string;
    name: string;
    email: string;
    designation: string;
    department: string | null;
  };
  totalAssigned: number;
  activeCount: number;
  compliantCount: number;
  deficienciesCount: number;
  manualReviewCount: number;
  pendingConfirmationsCount: number;
  agingCount: number;
}

export interface OfficerWorkloadData {
  officers: OfficerWorkloadItem[];
  unassignedQueue: {
    count: number;
    applications: Array<{
      id: string;
      applicationNumber: string;
      institutionName: string;
      programCategory: string;
      status: string;
      createdAt: string;
    }>;
  };
  distributionSummary: {
    totalOfficers: number;
    totalAssignedApplications: number;
    avgApplicationsPerOfficer: number;
    maxApplicationsPerOfficer: number;
  };
}

export interface CrossApplicationIssueItem {
  id: string;
  applicationId: string;
  applicationNumber: string;
  institutionName: string;
  assignedOfficerName: string | null;
  issueCategory:
    | "COMPLIANCE_DEFICIENCY"
    | "MISSING_EVIDENCE"
    | "EXTRACTION_UNCERTAIN"
    | "MANUAL_REVIEW"
    | "FORENSIC_ADVISORY"
    | "AUTHORITY_MISMATCH"
    | "AUTHORITY_EXPIRED"
    | "CONFIRMATION_PENDING";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "ADVISORY";
  ruleIdOrSource: string;
  clause: string | null;
  title: string;
  details: string;
  evidenceExcerpt: string | null;
  timestamp: string;
}

export interface CrossApplicationIssuesData {
  issues: CrossApplicationIssueItem[];
  categoryCounts: Record<string, number>;
  severityCounts: Record<string, number>;
  total: number;
}

export interface MinistryActivityItem {
  id: string;
  timestamp: string;
  action: string;
  actor: {
    id?: string;
    name?: string;
    role?: string;
    isSystem: boolean;
  };
  application: {
    id: string;
    applicationNumber: string;
    institutionName: string;
  } | null;
  resourceType: string;
  resourceId?: string;
  status: string;
  details: string;
  metadata?: unknown;
}

export interface MinistryDashboardData {
  overview: PortfolioOverviewData;
  workload: OfficerWorkloadData;
  issues: CrossApplicationIssuesData;
  recentActivity: MinistryActivityItem[];
}

