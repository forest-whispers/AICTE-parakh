export type ActionQueueUrgency = "CRITICAL" | "HIGH" | "MEDIUM" | "ADVISORY" | "INFO";

export type ActionQueueIssueType =
  | "EXTRACTION_FAILURE"
  | "REGULATORY_DEFICIENCY"
  | "AUTHORITY_MISMATCH"
  | "AUTHORITY_EXPIRED"
  | "MISSING_MANDATORY_DOCUMENTS"
  | "PENDING_BANK_CONFIRMATION"
  | "MANUAL_REVIEW_REQUIRED"
  | "EXTRACTION_UNCERTAIN"
  | "FORENSIC_ADVISORY"
  | "SCRUTINY_PENDING";

export interface PrioritizedQueueItem {
  id: string;
  applicationId: string;
  applicationNumber: string;
  institutionName: string;
  priorityRank: number;
  urgency: ActionQueueUrgency;
  issueType: ActionQueueIssueType;
  title: string;
  explanation: string;
  recommendedAction: string;
  relatedDocumentType: string | null;
  ruleIdOrSource: string | null;
  detectedAt?: string;
}

export interface ReviewWorkBucketItem {
  applicationId: string;
  applicationNumber: string;
  institutionName: string;
  itemKey: string;
  title: string;
  severity: string;
  details: string;
  evidenceExcerpt?: string | null;
}

export interface ReviewWorkBucket {
  category: string;
  label: string;
  count: number;
  items: ReviewWorkBucketItem[];
}

export interface AssignedApplicationPreview {
  id: string;
  applicationNumber: string;
  institutionName: string;
  programCategory?: string;
  status: string;
  updatedAt: string;
  scrutinySummary?: {
    overallStatus: string;
    passedCount: number;
    deficiencyCount: number;
    reviewCount: number;
    missingCount: number;
  } | null;
}

export interface AssignedActivityItem {
  id: string;
  timestamp: string;
  action: string;
  actor: {
    id: string | null;
    name: string;
    role: string;
    isSystem: boolean;
  };
  application?: {
    id: string;
    applicationNumber: string;
    institutionName: string;
  } | null;
  status: string;
  details: string;
}

export interface WorkbenchOverview {
  totalAssigned: number;
  activeAssigned: number;
  compliantCount: number;
  deficienciesCount: number;
  manualReviewCount: number;
  pendingConfirmationsCount: number;
  extractionFailedCount: number;
  unreadNotificationsCount: number;
}

export interface WorkbenchDashboardData {
  overview: WorkbenchOverview;
  actionQueue: PrioritizedQueueItem[];
  reviewBuckets: ReviewWorkBucket[];
  assignedApplications: AssignedApplicationPreview[];
  recentActivity: AssignedActivityItem[];
}

export interface OfficerNotification {
  id: string;
  recipientId: string;
  applicationId?: string | null;
  type: string;
  title: string;
  message: string;
  severity?: "INFO" | "WARNING" | "CRITICAL";
  isRead: boolean;
  createdAt: string;
  application?: {
    id: string;
    applicationNumber: string;
    institutionName: string;
  } | null;
}
