import { prisma } from "../lib/prisma.js";
import { auditService } from "./audit.service.js";

export interface CreateNotificationParams {
  recipientId: string;
  applicationId?: string | null;
  type:
    | "APPLICATION_ASSIGNED"
    | "APPLICATION_REASSIGNED"
    | "EXTRACTION_FAILED"
    | "DEFICIENCY_DETECTED"
    | "ANOMALY_DETECTED"
    | "AUTHORITY_MISMATCH"
    | "AUTHORITY_EXPIRED"
    | "BANK_CONFIRMATION_PENDING"
    | "BANK_CONFIRMATION_RECORDED"
    | "UNASSIGNED_APPLICATION";
  title: string;
  message: string;
  severity?: "INFO" | "WARNING" | "CRITICAL";
  dedupKey?: string;
  metadata?: Record<string, any> | null;
}

export class NotificationService {
  /**
   * Dispatches a notification to an explicit recipient with deduplication support.
   */
  async sendNotification(params: CreateNotificationParams) {
    try {
      // 1. Deduplication check: if dedupKey provided, check if already notified
      if (params.dedupKey) {
        const existing = await prisma.notification.findFirst({
          where: {
            recipientId: params.recipientId,
            dedupKey: params.dedupKey,
          },
        });

        if (existing) {
          // Already notified for this exact event and state; suppress duplicate
          return existing;
        }
      }

      // 2. Create notification
      const notification = await prisma.notification.create({
        data: {
          recipientId: params.recipientId,
          applicationId: params.applicationId || null,
          type: params.type,
          title: params.title,
          message: params.message,
          severity: params.severity || "INFO",
          dedupKey: params.dedupKey || null,
          metadata: (params.metadata as any) || undefined,
        },
      });

      // 3. Log audit event
      await auditService.logEvent({
        applicationId: params.applicationId,
        actorName: "SYSTEM",
        actorRole: "SYSTEM",
        action: "NOTIFICATION_DISPATCHED",
        resourceType: "NOTIFICATION",
        resourceId: notification.id,
        status: "SUCCESS",
        details: `Dispatched ${params.type} (${params.severity || "INFO"}) notification to user ${params.recipientId}`,
        metadata: {
          recipientId: params.recipientId,
          type: params.type,
          title: params.title,
        },
      });

      return notification;
    } catch (err) {
      console.error("Failed to send notification:", err);
      return null;
    }
  }

  /**
   * Notify assigned officer when an application is assigned.
   */
  async notifyAssignment(
    application: { id: string; applicationNumber: string; institutionName: string },
    newOfficer: { id: string; name: string },
    previousOfficer?: { id: string; name: string } | null,
    actorName: string = "Ministry Administrator"
  ) {
    // Notify newly assigned officer
    await this.sendNotification({
      recipientId: newOfficer.id,
      applicationId: application.id,
      type: "APPLICATION_ASSIGNED",
      title: `Application Assigned: ${application.applicationNumber}`,
      message: `You have been assigned as the responsible scrutiny officer for ${application.institutionName} (${application.applicationNumber}) by ${actorName}.`,
      severity: "INFO",
      dedupKey: `notif_assign_${newOfficer.id}_${application.id}`,
      metadata: {
        applicationId: application.id,
        applicationNumber: application.applicationNumber,
      },
    });

    // If reassigned from a previous officer, notify previous officer
    if (previousOfficer && previousOfficer.id !== newOfficer.id) {
      await this.sendNotification({
        recipientId: previousOfficer.id,
        applicationId: application.id,
        type: "APPLICATION_REASSIGNED",
        title: `Application Reassigned: ${application.applicationNumber}`,
        message: `Application ${application.applicationNumber} (${application.institutionName}) has been reassigned to ${newOfficer.name}.`,
        severity: "INFO",
        dedupKey: `notif_reassign_${previousOfficer.id}_${application.id}_to_${newOfficer.id}`,
        metadata: {
          applicationId: application.id,
          applicationNumber: application.applicationNumber,
          reassignedTo: newOfficer.name,
        },
      });
    }
  }

  /**
   * Notify assigned officer when extraction fails.
   */
  async notifyExtractionFailure(
    application: { id: string; applicationNumber: string; institutionName: string; assignedOfficerId: string | null },
    errorMessage: string
  ) {
    if (application.assignedOfficerId) {
      await this.sendNotification({
        recipientId: application.assignedOfficerId,
        applicationId: application.id,
        type: "EXTRACTION_FAILED",
        title: `VLM Extraction Failed: ${application.applicationNumber}`,
        message: `Multimodal extraction failed for application ${application.applicationNumber}: ${errorMessage}`,
        severity: "CRITICAL",
        dedupKey: `notif_extract_fail_${application.assignedOfficerId}_${application.id}_${errorMessage.slice(0, 30)}`,
        metadata: { error: errorMessage },
      });
    } else {
      await this.notifyUnassignedException(application, `Extraction failed on unassigned application: ${errorMessage}`);
    }
  }

  /**
   * Notify assigned officer of newly identified scrutiny deficiencies with deduplication.
   */
  async notifyScrutinyFindings(
    application: { id: string; applicationNumber: string; institutionName: string; assignedOfficerId: string | null },
    scrutinyReport: {
      overallStatus: string;
      deficiencyCount: number;
      reviewCount: number;
      findings: Array<{ ruleId: string; outcome: string; summary: string }>;
    }
  ) {
    if (!application.assignedOfficerId) {
      return;
    }

    if (scrutinyReport.deficiencyCount > 0) {
      const failingRules = scrutinyReport.findings
        .filter((f) => f.outcome === "FAIL_DEFICIENCY")
        .map((f) => f.ruleId)
        .sort();

      const dedupKey = `notif_deficiencies_${application.assignedOfficerId}_${application.id}_${failingRules.join(",")}`;

      await this.sendNotification({
        recipientId: application.assignedOfficerId,
        applicationId: application.id,
        type: "DEFICIENCY_DETECTED",
        title: `Scrutiny Deficiencies Flagged: ${application.applicationNumber}`,
        message: `Evaluation completed with ${scrutinyReport.deficiencyCount} statutory deficiency(ies) detected for ${application.institutionName}. Overall status: ${scrutinyReport.overallStatus}.`,
        severity: "CRITICAL",
        dedupKey,
        metadata: {
          overallStatus: scrutinyReport.overallStatus,
          deficiencyCount: scrutinyReport.deficiencyCount,
          failingRules,
        },
      });
    }
  }

  /**
   * Notify assigned officer of high-severity document anomalies (PDF forensics).
   */
  async notifyDocumentAnomaly(
    application: { id: string; applicationNumber: string; institutionName: string; assignedOfficerId: string | null },
    anomalyFindings: Array<{ ruleId: string; summary: string; severity: string }>
  ) {
    if (!application.assignedOfficerId || anomalyFindings.length === 0) return;

    const dedupKey = `notif_anomaly_${application.assignedOfficerId}_${application.id}_${anomalyFindings.map((a) => a.ruleId).sort().join(",")}`;

    await this.sendNotification({
      recipientId: application.assignedOfficerId,
      applicationId: application.id,
      type: "ANOMALY_DETECTED",
      title: `Document Anomaly Detected: ${application.applicationNumber}`,
      message: `Forensic metadata inspection detected ${anomalyFindings.length} anomaly indicator(s) requiring officer review for ${application.institutionName}.`,
      severity: "WARNING",
      dedupKey,
      metadata: { anomalyCount: anomalyFindings.length },
    });
  }

  /**
   * Notify assigned officer of authority verification outcomes.
   */
  async notifyAuthorityVerification(
    application: { id: string; applicationNumber: string; institutionName: string; assignedOfficerId: string | null },
    summary: {
      batchId: string;
      mismatchCount: number;
      expiredCount: number;
      pendingCount: number;
    }
  ) {
    if (!application.assignedOfficerId) return;

    if (summary.mismatchCount > 0 || summary.expiredCount > 0) {
      const dedupKey = `notif_auth_mismatch_${application.assignedOfficerId}_${application.id}_${summary.batchId}`;

      await this.sendNotification({
        recipientId: application.assignedOfficerId,
        applicationId: application.id,
        type: summary.expiredCount > 0 ? "AUTHORITY_EXPIRED" : "AUTHORITY_MISMATCH",
        title: `Authority Verification Flag: ${application.applicationNumber}`,
        message: `Statutory verification detected ${summary.mismatchCount} mismatch(es) and ${summary.expiredCount} expired record(s) at source for ${application.institutionName}.`,
        severity: "CRITICAL",
        dedupKey,
        metadata: summary,
      });
    } else if (summary.pendingCount > 0) {
      const dedupKey = `notif_auth_pending_${application.assignedOfficerId}_${application.id}_${summary.batchId}`;

      await this.sendNotification({
        recipientId: application.assignedOfficerId,
        applicationId: application.id,
        type: "BANK_CONFIRMATION_PENDING",
        title: `Bank Confirmation Pending: ${application.applicationNumber}`,
        message: `Mandatory bank confirmation inquiry is pending receipt from branch manager for ${application.institutionName}.`,
        severity: "WARNING",
        dedupKey,
        metadata: summary,
      });
    }
  }

  /**
   * Exception routing for unassigned applications (routed to Ministry Administrators).
   */
  async notifyUnassignedException(
    application: { id: string; applicationNumber: string; institutionName: string },
    reason: string = "Application submitted without assigned scrutiny officer."
  ) {
    const admins = await prisma.user.findMany({
      where: { role: "MINISTRY_ADMIN", isActive: true },
      select: { id: true },
    });

    for (const admin of admins) {
      await this.sendNotification({
        recipientId: admin.id,
        applicationId: application.id,
        type: "UNASSIGNED_APPLICATION",
        title: `Unassigned Application Exception: ${application.applicationNumber}`,
        message: `Application ${application.applicationNumber} (${application.institutionName}) requires assignment: ${reason}`,
        severity: "WARNING",
        dedupKey: `notif_unassigned_${admin.id}_${application.id}`,
        metadata: { applicationId: application.id, reason },
      });
    }
  }

  /**
   * Fetch notifications belonging to a specific officer/admin.
   */
  async getUserNotifications(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number }
  ) {
    const limit = Math.min(options?.limit || 50, 100);
    return prisma.notification.findMany({
      where: {
        recipientId: userId,
        ...(options?.unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        application: {
          select: {
            id: true,
            applicationNumber: true,
            institutionName: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Mark a notification as read with strict recipient authorization check.
   */
  async markAsRead(notificationId: string, userId: string) {
    const notif = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notif) {
      throw new Error("Notification not found.");
    }

    if (notif.recipientId !== userId) {
      throw new Error("Access denied: You cannot mark another officer's notification as read.");
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: {
        recipientId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }
}

export const notificationService = new NotificationService();
