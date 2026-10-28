export interface PrioritizedQueueItem {
    id: string;
    applicationId: string;
    applicationNumber: string;
    institutionName: string;
    priorityRank: number;
    urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "ADVISORY" | "INFO";
    issueType: "EXTRACTION_FAILURE" | "REGULATORY_DEFICIENCY" | "AUTHORITY_MISMATCH" | "AUTHORITY_EXPIRED" | "MISSING_MANDATORY_DOCUMENTS" | "PENDING_BANK_CONFIRMATION" | "MANUAL_REVIEW_REQUIRED" | "EXTRACTION_UNCERTAIN" | "FORENSIC_ADVISORY" | "SCRUTINY_PENDING";
    title: string;
    explanation: string;
    recommendedAction: string;
    relatedDocumentType: string | null;
    ruleIdOrSource: string | null;
    detectedAt?: Date | string;
}
export interface WorkbenchOverviewData {
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
    overview: WorkbenchOverviewData;
    actionQueue: PrioritizedQueueItem[];
    reviewBuckets: ReviewWorkBucket[];
    assignedApplications: any[];
    recentActivity: any[];
}
export interface ReviewWorkBucket {
    category: string;
    label: string;
    count: number;
    items: Array<{
        applicationId: string;
        applicationNumber: string;
        institutionName: string;
        itemKey: string;
        title: string;
        severity: string;
        details: string;
        evidenceExcerpt?: string | null;
    }>;
}
export declare class WorkbenchService {
    /**
     * Computes officer workbench executive overview counters from applications and unread notifications.
     */
    computeOverview(apps: any[], unreadNotificationsCount: number): WorkbenchOverviewData;
    /**
     * Officer personal workbench executive overview.
     */
    getWorkbenchOverview(officerId: string): Promise<WorkbenchOverviewData>;
    /**
     * Searchable, filterable, paginated register of applications assigned strictly to the authenticated officer.
     */
    getAssignedApplications(officerId: string, params: {
        search?: string | undefined;
        status?: string | undefined;
        programCategory?: string | undefined;
        hasDeficiencies?: boolean | undefined;
        hasPendingVerifications?: boolean | undefined;
        hasManualReview?: boolean | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: string | undefined;
        sortOrder?: "asc" | "desc" | undefined;
    }): Promise<{
        data: any[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    /**
     * Actionable prioritized queue of operational tasks for the officer's applications.
     */
    /**
     * Computes the prioritized operational queue for a given list of applications.
     */
    computeActionQueue(apps: any[]): PrioritizedQueueItem[];
    /**
     * Actionable prioritized queue of operational tasks for the officer's applications.
     */
    getPrioritizedActionQueue(officerId: string): Promise<PrioritizedQueueItem[]>;
    /**
     * Computes scrutiny & authority review work broken down into distinct, unflattened categories.
     */
    computeReviewBuckets(apps: any[]): ReviewWorkBucket[];
    /**
     * Scrutiny & Authority review work broken down into distinct, unflattened categories.
     */
    getReviewAndVerificationWork(officerId: string): Promise<ReviewWorkBucket[]>;
    /**
     * Audit activity affecting applications assigned strictly to the authenticated officer.
     */
    getAssignedActivity(officerId: string, params: {
        page?: number | undefined;
        limit?: number | undefined;
    }): Promise<{
        activity: any[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    /**
     * Unified officer workbench dashboard: resolves overview metrics, prioritized queue,
     * review buckets, assigned applications preview, and recent activity in a single
     * optimized operation with concurrent database queries.
     */
    getWorkbenchDashboard(officerId: string): Promise<WorkbenchDashboardData>;
}
export declare const workbenchService: WorkbenchService;
//# sourceMappingURL=workbench.service.d.ts.map