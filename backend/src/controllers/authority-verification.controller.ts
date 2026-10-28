import type { Request, Response } from "express";
import { authorityVerificationService } from "../services/authority-adapters/index.js";
import { auditService } from "../services/audit.service.js";
import { notificationService } from "../services/notification.service.js";
import { prisma } from "../lib/prisma.js";

export const runAuthorityVerification = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!id) {
      res.status(400).json({ success: false, error: "Application ID is required." });
      return;
    }

    const application = await prisma.application.findUnique({
      where: { id },
      select: {
        id: true,
        applicationNumber: true,
        institutionName: true,
        assignedOfficerId: true,
      },
    });

    if (!application) {
      res.status(404).json({ success: false, error: "Application not found." });
      return;
    }

    // Role check: Ministry Admin has operational oversight only (cannot execute verification); Officer must be assigned
    if (req.user?.role === "MINISTRY_ADMIN") {
      res.status(403).json({
        success: false,
        error: "Access denied: Ministry Administrators have operational oversight only and cannot execute authority verification.",
      });
      return;
    }

    if (req.user?.role === "OFFICER" && application.assignedOfficerId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: "Access denied: You are not assigned to this application.",
      });
      return;
    }

    const { officerBankConfirmation } = req.body || {};

    const summary = await authorityVerificationService.verifyApplication(id, {
      officerBankConfirmation,
    });

    // Audit log and notification routing concurrently
    await Promise.all([
      auditService.logEvent({
        applicationId: id,
        actorId: req.user?.id,
        actorName: req.user?.name || "OFFICER",
        actorRole: req.user?.role || "OFFICER",
        action: "AUTHORITY_VERIFICATION_EXECUTED",
        resourceType: "AUTHORITY_VERIFICATION",
        resourceId: summary.batchId,
        status: summary.mismatchCount > 0 ? "WARNING" : "SUCCESS",
        details: `Executed authority verification batch ${summary.batchId}: ${summary.verifiedSimulatedCount} verified, ${summary.mismatchCount} mismatches, ${summary.expiredCount} expired at source, ${summary.pendingCount} pending confirmation`,
        metadata: {
          batchId: summary.batchId,
          totalRun: summary.totalRun,
          mismatchCount: summary.mismatchCount,
          expiredCount: summary.expiredCount,
          pendingCount: summary.pendingCount,
        },
      }),
      notificationService.notifyAuthorityVerification(application, {
        batchId: summary.batchId,
        mismatchCount: summary.mismatchCount,
        expiredCount: summary.expiredCount,
        pendingCount: summary.pendingCount,
      }),
    ]);

    res.status(200).json({
      success: true,
      message: "Authority verification completed successfully.",
      data: summary,
    });
  } catch (error: any) {
    console.error("Error executing authority verification:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to execute authority verification.",
    });
  }
};

export const getAuthorityVerifications = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!id) {
      res.status(400).json({ success: false, error: "Application ID is required." });
      return;
    }

    const application = await prisma.application.findUnique({
      where: { id },
      select: { id: true, assignedOfficerId: true },
    });

    if (!application) {
      res.status(404).json({ success: false, error: "Application not found." });
      return;
    }

    if (req.user?.role === "OFFICER" && application.assignedOfficerId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: "Access denied: You are not assigned to this application.",
      });
      return;
    }

    const verifications = await authorityVerificationService.getLatestVerifications(id);

    res.status(200).json({
      success: true,
      data: verifications,
    });
  } catch (error: any) {
    console.error("Error fetching authority verifications:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch authority verifications.",
    });
  }
};

export const recordBankConfirmation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const {
      letterReference,
      letterDate,
      recordingOfficer,
      branchManagerName,
      confirmedAmountLakhs,
      isUnencumbered,
      remarks,
      documentId,
    } = req.body;

    if (!letterReference || !recordingOfficer || confirmedAmountLakhs === undefined) {
      res.status(400).json({
        success: false,
        error: "letterReference, recordingOfficer, and confirmedAmountLakhs are required.",
      });
      return;
    }

    const application = await prisma.application.findUnique({
      where: { id },
      select: {
        id: true,
        applicationNumber: true,
        institutionName: true,
        assignedOfficerId: true,
      },
    });

    if (!application) {
      res.status(404).json({ success: false, error: "Application not found." });
      return;
    }

    if (req.user?.role === "MINISTRY_ADMIN") {
      res.status(403).json({
        success: false,
        error: "Access denied: Ministry Administrators cannot record officer verification actions.",
      });
      return;
    }

    if (req.user?.role === "OFFICER" && application.assignedOfficerId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: "Access denied: You are not assigned to this application.",
      });
      return;
    }

    const record = await authorityVerificationService.recordOfficerBankConfirmation(
      id,
      {
        letterReference,
        letterDate: letterDate || new Date().toISOString().split("T")[0],
        recordingOfficer: req.user?.name || recordingOfficer,
        branchManagerName,
        confirmedAmountLakhs: Number(confirmedAmountLakhs),
        isUnencumbered: isUnencumbered ?? true,
        remarks,
      },
      documentId
    );

    // Audit log and officer notification concurrently
    const sideEffects: Promise<any>[] = [
      auditService.logEvent({
        applicationId: id,
        actorId: req.user?.id,
        actorName: req.user?.name || recordingOfficer,
        actorRole: req.user?.role || "OFFICER",
        action: "BANK_CONFIRMATION_RECORDED",
        resourceType: "AUTHORITY_VERIFICATION",
        resourceId: record.id,
        status: "SUCCESS",
        details: `Recorded official bank confirmation letter: Ref ${letterReference}, confirmed amount ₹${confirmedAmountLakhs} Lakhs, unencumbered: ${isUnencumbered ?? true}`,
        metadata: {
          letterReference,
          confirmedAmountLakhs,
          isUnencumbered: isUnencumbered ?? true,
          recordingOfficer: req.user?.name || recordingOfficer,
        },
      }),
    ];

    if (application.assignedOfficerId) {
      sideEffects.push(
        notificationService.sendNotification({
          recipientId: application.assignedOfficerId,
          applicationId: application.id,
          type: "BANK_CONFIRMATION_RECORDED",
          title: `Bank Confirmation Filed: ${application.applicationNumber}`,
          message: `Official branch manager confirmation letter (Ref: ${letterReference}) recorded on file for ${application.institutionName}.`,
          severity: "INFO",
          metadata: { letterReference, confirmedAmountLakhs },
        })
      );
    }

    await Promise.all(sideEffects);

    res.status(201).json({
      success: true,
      message: "Bank confirmation letter recorded successfully.",
      data: record,
    });
  } catch (error: any) {
    console.error("Error recording bank confirmation:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to record bank confirmation.",
    });
  }
};

export const getVerificationHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const application = await prisma.application.findUnique({
      where: { id },
      select: { id: true, assignedOfficerId: true },
    });

    if (!application) {
      res.status(404).json({ success: false, error: "Application not found." });
      return;
    }

    if (req.user?.role === "OFFICER" && application.assignedOfficerId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: "Access denied: You are not assigned to this application.",
      });
      return;
    }

    const history = await authorityVerificationService.getHistoricalBatches(id);

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error("Error fetching verification history:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch verification history.",
    });
  }
};
