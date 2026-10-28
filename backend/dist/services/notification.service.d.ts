export interface CreateNotificationParams {
    recipientId: string;
    applicationId?: string | null;
    type: "APPLICATION_ASSIGNED" | "APPLICATION_REASSIGNED" | "EXTRACTION_FAILED" | "DEFICIENCY_DETECTED" | "ANOMALY_DETECTED" | "AUTHORITY_MISMATCH" | "AUTHORITY_EXPIRED" | "BANK_CONFIRMATION_PENDING" | "BANK_CONFIRMATION_RECORDED" | "UNASSIGNED_APPLICATION";
    title: string;
    message: string;
    severity?: "INFO" | "WARNING" | "CRITICAL";
    dedupKey?: string;
    metadata?: Record<string, any> | null;
}
export declare class NotificationService {
    /**
     * Dispatches a notification to an explicit recipient with deduplication support.
     */
    sendNotification(params: CreateNotificationParams): Promise<{
        id: string;
        recipientId: string;
        applicationId: string | null;
        type: string;
        title: string;
        message: string;
        severity: string;
        isRead: boolean;
        readAt: Date | null;
        dedupKey: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
    } | null>;
    /**
     * Notify assigned officer when an application is assigned.
     */
    notifyAssignment(application: {
        id: string;
        applicationNumber: string;
        institutionName: string;
    }, newOfficer: {
        id: string;
        name: string;
    }, previousOfficer?: {
        id: string;
        name: string;
    } | null, actorName?: string): Promise<void>;
    /**
     * Notify assigned officer when extraction fails.
     */
    notifyExtractionFailure(application: {
        id: string;
        applicationNumber: string;
        institutionName: string;
        assignedOfficerId: string | null;
    }, errorMessage: string): Promise<void>;
    /**
     * Notify assigned officer of newly identified scrutiny deficiencies with deduplication.
     */
    notifyScrutinyFindings(application: {
        id: string;
        applicationNumber: string;
        institutionName: string;
        assignedOfficerId: string | null;
    }, scrutinyReport: {
        overallStatus: string;
        deficiencyCount: number;
        reviewCount: number;
        findings: Array<{
            ruleId: string;
            outcome: string;
            summary: string;
        }>;
    }): Promise<void>;
    /**
     * Notify assigned officer of high-severity document anomalies (PDF forensics).
     */
    notifyDocumentAnomaly(application: {
        id: string;
        applicationNumber: string;
        institutionName: string;
        assignedOfficerId: string | null;
    }, anomalyFindings: Array<{
        ruleId: string;
        summary: string;
        severity: string;
    }>): Promise<void>;
    /**
     * Notify assigned officer of authority verification outcomes.
     */
    notifyAuthorityVerification(application: {
        id: string;
        applicationNumber: string;
        institutionName: string;
        assignedOfficerId: string | null;
    }, summary: {
        batchId: string;
        mismatchCount: number;
        expiredCount: number;
        pendingCount: number;
    }): Promise<void>;
    /**
     * Exception routing for unassigned applications (routed to Ministry Administrators).
     */
    notifyUnassignedException(application: {
        id: string;
        applicationNumber: string;
        institutionName: string;
    }, reason?: string): Promise<void>;
    /**
     * Fetch notifications belonging to a specific officer/admin.
     */
    getUserNotifications(userId: string, options?: {
        unreadOnly?: boolean;
        limit?: number;
    }): Promise<({
        application: {
            applicationNumber: string;
            id: string;
            institutionName: string;
            status: string;
        } | null;
    } & {
        id: string;
        recipientId: string;
        applicationId: string | null;
        type: string;
        title: string;
        message: string;
        severity: string;
        isRead: boolean;
        readAt: Date | null;
        dedupKey: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
    })[]>;
    /**
     * Mark a notification as read with strict recipient authorization check.
     */
    markAsRead(notificationId: string, userId: string): Promise<{
        id: string;
        recipientId: string;
        applicationId: string | null;
        type: string;
        title: string;
        message: string;
        severity: string;
        isRead: boolean;
        readAt: Date | null;
        dedupKey: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
    }>;
    /**
     * Mark all notifications as read for a user.
     */
    markAllAsRead(userId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
}
export declare const notificationService: NotificationService;
//# sourceMappingURL=notification.service.d.ts.map