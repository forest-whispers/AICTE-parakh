import type { UserSanitized } from "./auth.service.js";
export interface LogAuditParams {
    applicationId?: string | null | undefined;
    actorId?: string | null | undefined;
    actorName: string;
    actorRole: string;
    action: string;
    resourceType: string;
    resourceId?: string | null | undefined;
    status?: "SUCCESS" | "FAILURE" | "WARNING" | undefined;
    details: string;
    metadata?: Record<string, any> | null | undefined;
}
export declare class AuditService {
    /**
     * Append an immutable audit event to the audit trail.
     */
    logEvent(params: LogAuditParams): Promise<{
        id: string;
        applicationId: string | null;
        actorId: string | null;
        actorName: string;
        actorRole: string;
        action: string;
        resourceType: string;
        resourceId: string | null;
        status: string;
        details: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
    } | null>;
    /**
     * Query audit logs with strict role and ownership authorization.
     */
    getAuditLogs(query: {
        applicationId?: string | undefined;
        action?: string | undefined;
        limit?: number | undefined;
    }, requester: UserSanitized): Promise<{
        id: string;
        applicationId: string | null;
        actorId: string | null;
        actorName: string;
        actorRole: string;
        action: string;
        resourceType: string;
        resourceId: string | null;
        status: string;
        details: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
    }[]>;
}
export declare const auditService: AuditService;
//# sourceMappingURL=audit.service.d.ts.map