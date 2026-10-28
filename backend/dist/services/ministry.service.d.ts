export interface PortfolioSummaryMetricDef {
    key: string;
    name: string;
    description: string;
    isMutuallyExclusive: boolean;
}
export interface ProcessingPipelineStage {
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
export interface CrossApplicationIssueItem {
    id: string;
    applicationId: string;
    applicationNumber: string;
    institutionName: string;
    assignedOfficerName: string | null;
    issueCategory: "COMPLIANCE_DEFICIENCY" | "MISSING_EVIDENCE" | "EXTRACTION_UNCERTAIN" | "MANUAL_REVIEW" | "FORENSIC_ADVISORY" | "AUTHORITY_MISMATCH" | "AUTHORITY_EXPIRED" | "CONFIRMATION_PENDING";
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "ADVISORY";
    ruleIdOrSource: string;
    clause: string | null;
    title: string;
    details: string;
    evidenceExcerpt: string | null;
    timestamp: string;
}
export declare class MinistryService {
    /**
     * Explains each metric's precise calculation criteria to prevent ambiguous interpretations.
     */
    getMetricDefinitions(): Record<string, PortfolioSummaryMetricDef>;
    /**
     * Consolidated portfolio overview for Ministry Administration.
     */
    getPortfolioOverview(): Promise<any>;
    /**
     * Computes portfolio overview metrics, stage distributions, and pipeline bottlenecks from applications.
     */
    computeOverview(apps: any[]): any;
    /**
     * Query applications portfolio with support for 1-to-1 metric drill-down filtering, search, and pagination.
     */
    getPortfolioApplications(params: {
        metric?: string | undefined;
        search?: string | undefined;
        status?: string | undefined;
        officerId?: string | undefined;
        programCategory?: string | undefined;
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
     * Officer workload distribution and unassigned allocations.
     */
    getOfficerWorkload(): Promise<{
        officers: OfficerWorkloadItem[];
        unassignedQueue: {
            count: number;
            applications: any[];
        };
        distributionSummary: {
            totalOfficers: number;
            totalAssignedApplications: number;
            avgApplicationsPerOfficer: number;
            maxApplicationsPerOfficer: number;
        };
    }>;
    /**
     * Computes officer workloads and distribution statistics from officer user records and unassigned applications.
     */
    computeOfficerWorkload(officers: any[], unassignedApps: any[]): {
        officers: OfficerWorkloadItem[];
        unassignedQueue: {
            count: number;
            applications: any[];
        };
        distributionSummary: {
            totalOfficers: number;
            totalAssignedApplications: number;
            avgApplicationsPerOfficer: number;
            maxApplicationsPerOfficer: number;
        };
    };
    /**
     * Aggregated cross-application issue oversight register.
     */
    getCrossApplicationIssues(params: {
        category?: string | undefined;
        severity?: string | undefined;
        search?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
    }): Promise<{
        issues: CrossApplicationIssueItem[];
        categoryCounts: Record<string, number>;
        severityCounts: Record<string, number>;
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    /**
     * Computes cross-application issues, counts, and filtered pagination from a pre-fetched applications list.
     */
    computeIssuesFromApps(apps: any[], params?: {
        category?: string | undefined;
        severity?: string | undefined;
        search?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
    }): {
        issues: CrossApplicationIssueItem[];
        categoryCounts: Record<string, number>;
        severityCounts: Record<string, number>;
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    };
    /**
     * Consolidated Ministry Administration Dashboard.
     * Executes independent database queries concurrently via Promise.all
     * and derives overview, workload, issues preview, and recent activity in one trip.
     */
    getMinistryDashboard(): Promise<{
        overview: any;
        workload: any;
        issues: {
            issues: CrossApplicationIssueItem[];
            categoryCounts: Record<string, number>;
            severityCounts: Record<string, number>;
            total: number;
        };
        recentActivity: any[];
    }>;
    /**
     * Ministry-wide operational audit activity log.
     */
    getOperationalActivity(params: {
        action?: string | undefined;
        actorRole?: string | undefined;
        actorId?: string | undefined;
        status?: string | undefined;
        search?: string | undefined;
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
}
export declare const ministryService: MinistryService;
//# sourceMappingURL=ministry.service.d.ts.map