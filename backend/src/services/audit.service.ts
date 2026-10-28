import { prisma } from "../lib/prisma.js";
import type { UserSanitized } from "./auth.service.js";

export interface LogAuditParams {
  applicationId?: string | null | undefined;
  actorId?: string | null | undefined;
  actorName: string;
  actorRole: string; // "OFFICER" | "MINISTRY_ADMIN" | "SYSTEM" | "UNAUTHENTICATED"
  action: string;
  resourceType: string;
  resourceId?: string | null | undefined;
  status?: "SUCCESS" | "FAILURE" | "WARNING" | undefined;
  details: string;
  metadata?: Record<string, any> | null | undefined;
}

const REDACTED_KEYS = new Set([
  "password",
  "passwordhash",
  "salt",
  "token",
  "secret",
  "authorization",
  "jwt",
]);

function sanitizeMetadata(data: any): any {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) {
    return data.map(sanitizeMetadata);
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (REDACTED_KEYS.has(key.toLowerCase())) {
      clean[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      clean[key] = sanitizeMetadata(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export class AuditService {
  /**
   * Append an immutable audit event to the audit trail.
   */
  async logEvent(params: LogAuditParams) {
    try {
      const cleanMeta = sanitizeMetadata(params.metadata);
      return await prisma.auditLog.create({
        data: {
          applicationId: params.applicationId || null,
          actorId: params.actorId || null,
          actorName: params.actorName,
          actorRole: params.actorRole,
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId || null,
          status: params.status || "SUCCESS",
          details: params.details,
          metadata: cleanMeta || undefined,
        },
      });
    } catch (err) {
      // Audit logging must be resilient and not crash main thread, but should warn
      console.error("Failed to write audit log event:", err);
      return null;
    }
  }

  /**
   * Query audit logs with strict role and ownership authorization.
   */
  async getAuditLogs(
    query: {
      applicationId?: string | undefined;
      action?: string | undefined;
      limit?: number | undefined;
    },
    requester: UserSanitized
  ) {
    const limit = Math.min(query.limit || 50, 100);

    // Authorization checks:
    if (requester.role === "MINISTRY_ADMIN") {
      // Ministry admin has oversight access
      return prisma.auditLog.findMany({
        where: {
          ...(query.applicationId ? { applicationId: query.applicationId } : {}),
          ...(query.action ? { action: query.action } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    }

    if (requester.role === "OFFICER") {
      // Officer can ONLY view audit logs for an application they are assigned to
      if (!query.applicationId) {
        throw new Error("Access denied: Officers must specify an assigned application to inspect audit logs.");
      }

      const app = await prisma.application.findUnique({
        where: { id: query.applicationId },
        select: { id: true, assignedOfficerId: true },
      });

      if (!app) {
        throw new Error("Application not found.");
      }

      if (app.assignedOfficerId !== requester.id) {
        throw new Error("Access denied: You are not assigned to this application.");
      }

      return prisma.auditLog.findMany({
        where: {
          applicationId: query.applicationId,
          ...(query.action ? { action: query.action } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    }

    throw new Error("Access denied: Unauthorized role.");
  }
}

export const auditService = new AuditService();
