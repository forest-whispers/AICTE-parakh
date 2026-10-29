import { prisma } from "../lib/prisma.js";
import { auditService } from "./audit.service.js";
import { notificationService } from "./notification.service.js";
import type { UserSanitized } from "./auth.service.js";

export class AssignmentService {
  /**
   * Assign or reassign an application to an officer according to strict authorization policy.
   */
  async assignApplication(
    applicationId: string,
    targetOfficerId: string,
    actor: UserSanitized,
    reason?: string,
    options?: { enforceUnassigned?: boolean }
  ) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        assignedOfficer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!application) {
      throw new Error(`Application ${applicationId} not found.`);
    }

    // Protection against stale/concurrent allocation:
    // If enforceUnassigned is enabled, reject any application that is already assigned
    if (options?.enforceUnassigned && application.assignedOfficerId) {
      throw new Error(
        `Conflict: Application ${application.applicationNumber} has already been assigned to an officer. Reallocation is not permitted.`
      );
    }

    // 1. Authorization check
    if (actor.role === "OFFICER") {
      // Ordinary officers cannot arbitrarily assign applications they do not own
      if (application.assignedOfficerId !== actor.id) {
        throw new Error(
          "Access denied: Officers can only transfer applications currently assigned to them."
        );
      }
    } else if (actor.role !== "MINISTRY_ADMIN") {
      throw new Error("Access denied: Unauthorized role for assignment operations.");
    }

    // 2. Validate target officer
    const targetOfficer = await prisma.user.findUnique({
      where: { id: targetOfficerId },
    });

    if (!targetOfficer) {
      throw new Error(`Target officer ${targetOfficerId} not found.`);
    }

    if (!targetOfficer.isActive) {
      throw new Error(`Target officer ${targetOfficer.name} is deactivated.`);
    }

    if (targetOfficer.role !== "OFFICER") {
      throw new Error(
        `Invalid assignment: ${targetOfficer.name} has role '${targetOfficer.role}'. Applications must be assigned to an 'OFFICER'.`
      );
    }

    // Check if already assigned to this officer
    if (application.assignedOfficerId === targetOfficerId) {
      return application;
    }

    const previousOfficer = application.assignedOfficer;
    const isReassignment = !!previousOfficer;

    // 3. Update application assignment with concurrency check
    if (options?.enforceUnassigned) {
      const updateResult = await prisma.application.updateMany({
        where: {
          id: applicationId,
          assignedOfficerId: null,
        },
        data: {
          assignedOfficerId: targetOfficer.id,
          assignedById: actor.id,
          assignedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new Error(
          `Conflict: Application ${application.applicationNumber} has already been assigned to an officer by a concurrent request.`
        );
      }
    } else {
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          assignedOfficerId: targetOfficer.id,
          assignedById: actor.id,
          assignedAt: new Date(),
        },
      });
    }

    const updatedApplication = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        assignedOfficer: {
          select: {
            id: true,
            name: true,
            email: true,
            designation: true,
            role: true,
          },
        },
      },
    });

    if (!updatedApplication) {
      throw new Error(`Failed to retrieve updated application ${applicationId}.`);
    }

    // 4. Audit trail & 5. Dispatch notifications concurrently
    const action = isReassignment ? "APPLICATION_REASSIGNED" : "APPLICATION_ASSIGNED";
    await Promise.all([
      auditService.logEvent({
        applicationId: application.id,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action,
        resourceType: "APPLICATION",
        resourceId: application.id,
        status: "SUCCESS",
        details: isReassignment
          ? `Application ${application.applicationNumber} reassigned from ${previousOfficer?.name} to ${targetOfficer.name}`
          : `Application ${application.applicationNumber} assigned to ${targetOfficer.name}`,
        metadata: {
          previousOfficerId: previousOfficer?.id || null,
          previousOfficerName: previousOfficer?.name || null,
          newOfficerId: targetOfficer.id,
          newOfficerName: targetOfficer.name,
          assignedBy: actor.name,
          reason: reason || "Routine scrutiny workload assignment",
        },
      }),
      notificationService.notifyAssignment(
        application,
        targetOfficer,
        previousOfficer,
        actor.name
      ),
    ]);

    return updatedApplication;
  }

  /**
   * List unassigned applications for ministry administration oversight.
   */
  async getUnassignedApplications() {
    return prisma.application.findMany({
      where: {
        assignedOfficerId: null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        documents: {
          select: { id: true, documentType: true, originalName: true },
        },
      },
    });
  }
}

export const assignmentService = new AssignmentService();
