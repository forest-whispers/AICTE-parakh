import type { Request, Response } from "express";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import { prisma } from "../lib/prisma.js";
import { vlmService } from "../services/vlm.service.js";
import { complianceService } from "../services/compliance.service.js";
import { auditService } from "../services/audit.service.js";
import { notificationService } from "../services/notification.service.js";

export const createApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const { institutionName, applicationNumber, programCategory, proposedIntake } = req.body;

    if (!institutionName || !applicationNumber) {
      res.status(400).json({
        success: false,
        error: "Both institutionName and applicationNumber are required.",
      });
      return;
    }

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        error: "At least one document must be uploaded.",
      });
      return;
    }

    // Parse documentTypes mapping: can be passed as JSON string or array
    let docTypes: string[] = [];
    if (req.body.documentTypes) {
      try {
        docTypes = typeof req.body.documentTypes === "string"
          ? JSON.parse(req.body.documentTypes)
          : req.body.documentTypes;
      } catch {
        docTypes = [];
      }
    }

    // Check if applicationNumber already exists
    const existing = await prisma.application.findUnique({
      where: { applicationNumber: String(applicationNumber).trim() },
    });

    if (existing) {
      res.status(409).json({
        success: false,
        error: `Application with number ${applicationNumber} already exists.`,
      });
      return;
    }

    // Calculate file hashes and prepare document records
    const documentsData = await Promise.all(
      files.map(async (file, index) => {
        const assignedType = docTypes[index] || "UNRECOGNIZED";
        let fileHash: string | null = null;
        try {
          const buffer = await fs.readFile(file.path);
          fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
        } catch (hashErr) {
          console.warn(`Could not compute hash for ${file.originalname}:`, hashErr);
        }

        return {
          fileName: file.filename,
          originalName: file.originalname,
          filePath: file.path,
          fileHash,
          mimeType: file.mimetype,
          fileSize: file.size,
          documentType: assignedType,
          extractionStatus: "PENDING",
        };
      })
    );

    const parsedIntake = proposedIntake ? parseInt(String(proposedIntake), 10) : null;

    // Assignment policy: default to creating officer if authenticated
    const assignedOfficerId = req.user && req.user.role === "OFFICER" ? req.user.id : null;
    const assignedById = req.user ? req.user.id : null;
    const assignedAt = assignedOfficerId ? new Date() : null;

    const application = await prisma.application.create({
      data: {
        institutionName: String(institutionName).trim(),
        applicationNumber: String(applicationNumber).trim(),
        programCategory: programCategory ? String(programCategory).trim() : null,
        proposedIntake: Number.isFinite(parsedIntake) ? parsedIntake : null,
        status: "PROCESSING_EXTRACTION",
        assignedOfficerId,
        assignedById,
        assignedAt,
        documents: {
          create: documentsData,
        },
      },
      include: {
        documents: true,
        assignedOfficer: {
          select: { id: true, name: true, email: true, designation: true },
        },
      },
    });

    // Audit log application creation
    await auditService.logEvent({
      applicationId: application.id,
      actorId: req.user?.id || null,
      actorName: req.user?.name || "PUBLIC_INTAKE",
      actorRole: req.user?.role || "UNAUTHENTICATED",
      action: "APPLICATION_CREATED",
      resourceType: "APPLICATION",
      resourceId: application.id,
      status: "SUCCESS",
      details: `Created application ${application.applicationNumber} for ${application.institutionName} with ${documentsData.length} document(s). Assigned: ${application.assignedOfficer?.name || "Unassigned Exception"}`,
      metadata: {
        applicationNumber: application.applicationNumber,
        assignedOfficerId,
        programCategory: application.programCategory,
      },
    });

    // If unassigned, notify ministry administration oversight
    if (!assignedOfficerId) {
      await notificationService.notifyUnassignedException(application);
    }

    // Immediate extraction trigger in single multimodal call
    const docItems = application.documents.map((d) => ({
      id: d.id,
      filePath: d.filePath,
      mimeType: d.mimeType,
      originalName: d.originalName,
    }));

    // Trigger extraction and await completion
    const extractionResult = await vlmService.processApplicationDocuments(application.id, docItems);

    if (!extractionResult.success) {
      await Promise.all([
        auditService.logEvent({
          applicationId: application.id,
          actorName: "SYSTEM",
          actorRole: "SYSTEM",
          action: "EXTRACTION_FAILED",
          resourceType: "APPLICATION",
          resourceId: application.id,
          status: "FAILURE",
          details: `Multimodal extraction failed: ${extractionResult.error}`,
        }),
        notificationService.notifyExtractionFailure(
          { ...application, assignedOfficerId },
          extractionResult.error || "Multimodal extraction failed"
        ),
      ]);
    } else {
      await auditService.logEvent({
        applicationId: application.id,
        actorName: "SYSTEM",
        actorRole: "SYSTEM",
        action: "EXTRACTION_COMPLETED",
        resourceType: "APPLICATION",
        resourceId: application.id,
        status: "SUCCESS",
        details: `Extracted data for ${docItems.length} document(s)`,
      });
    }

    // If extraction completed, trigger deterministic compliance scrutiny automatically
    let scrutinyResult: any = null;
    if (extractionResult.success) {
      try {
        scrutinyResult = await complianceService.evaluateApplication(application.id);

        if (scrutinyResult) {
          await Promise.all([
            auditService.logEvent({
              applicationId: application.id,
              actorName: "SYSTEM",
              actorRole: "SYSTEM",
              action: "SCRUTINY_EVALUATED",
              resourceType: "SCRUTINY_REPORT",
              resourceId: application.id,
              status: scrutinyResult.overallStatus === "DEFICIENCIES_DETECTED" ? "WARNING" : "SUCCESS",
              details: `Auto-scrutiny evaluated: ${scrutinyResult.overallStatus} (${scrutinyResult.passedCount} passed, ${scrutinyResult.deficiencyCount} deficiencies, ${scrutinyResult.reviewCount} reviews)`,
            }),
            notificationService.notifyScrutinyFindings(
              { ...application, assignedOfficerId },
              scrutinyResult
            ),
          ]);
        }
      } catch (scrutinyErr: any) {
        console.error("Auto-scrutiny evaluation error:", scrutinyErr);
      }
    }

    // Fetch updated application
    const updatedApplication = await prisma.application.findUnique({
      where: { id: application.id },
      include: {
        assignedOfficer: {
          select: { id: true, name: true, email: true, designation: true },
        },
        documents: {
          orderBy: { createdAt: "asc" },
        },
        scrutinyReports: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    res.status(201).json({
      success: true,
      extractionSuccess: extractionResult.success,
      extractionError: extractionResult.error,
      scrutinyReport: scrutinyResult,
      data: updatedApplication,
    });
  } catch (error: any) {
    console.error("Error creating application:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create application.",
    });
  }
};

export const runExtractionForApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      res.status(400).json({ success: false, error: "Application ID is required." });
      return;
    }

    const application = await prisma.application.findUnique({
      where: { id },
      include: { documents: true },
    });

    if (!application) {
      res.status(404).json({ success: false, error: "Application not found." });
      return;
    }

    // Authorization: Officer must be assigned
    if (req.user?.role === "OFFICER" && application.assignedOfficerId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: "Access denied: You are not assigned to this application.",
      });
      return;
    }

    const docItems = application.documents.map((d) => ({
      id: d.id,
      filePath: d.filePath,
      mimeType: d.mimeType,
      originalName: d.originalName,
    }));

    await prisma.application.update({
      where: { id },
      data: { status: "PROCESSING_EXTRACTION" },
    });

    const extractionResult = await vlmService.processApplicationDocuments(id, docItems);

    if (!extractionResult.success) {
      await Promise.all([
        auditService.logEvent({
          applicationId: id,
          actorId: req.user?.id,
          actorName: req.user?.name || "OFFICER",
          actorRole: req.user?.role || "OFFICER",
          action: "EXTRACTION_FAILED",
          resourceType: "APPLICATION",
          resourceId: id,
          status: "FAILURE",
          details: `Re-extraction failed: ${extractionResult.error}`,
        }),
        notificationService.notifyExtractionFailure(
          application,
          extractionResult.error || "Re-extraction failed"
        ),
      ]);
    } else {
      await auditService.logEvent({
        applicationId: id,
        actorId: req.user?.id,
        actorName: req.user?.name || "OFFICER",
        actorRole: req.user?.role || "OFFICER",
        action: "EXTRACTION_COMPLETED",
        resourceType: "APPLICATION",
        resourceId: id,
        status: "SUCCESS",
        details: `Re-extracted data for ${docItems.length} document(s)`,
      });
    }

    // Automatically run scrutiny after re-extraction
    let scrutinyResult = null;
    if (extractionResult.success) {
      try {
        scrutinyResult = await complianceService.evaluateApplication(id);

        if (scrutinyResult) {
          await Promise.all([
            auditService.logEvent({
              applicationId: id,
              actorId: req.user?.id,
              actorName: req.user?.name || "OFFICER",
              actorRole: req.user?.role || "OFFICER",
              action: "SCRUTINY_EVALUATED",
              resourceType: "SCRUTINY_REPORT",
              resourceId: id,
              status: scrutinyResult.overallStatus === "DEFICIENCIES_DETECTED" ? "WARNING" : "SUCCESS",
              details: `Scrutiny evaluated after re-extraction: ${scrutinyResult.overallStatus}`,
            }),
            notificationService.notifyScrutinyFindings(
              application,
              scrutinyResult
            ),
          ]);
        }
      } catch (scrutinyErr) {
        console.error("Scrutiny evaluation error:", scrutinyErr);
      }
    }

    const updated = await prisma.application.findUnique({
      where: { id },
      include: {
        assignedOfficer: {
          select: { id: true, name: true, email: true, designation: true },
        },
        documents: true,
        scrutinyReports: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    res.status(200).json({
      success: true,
      extractionSuccess: extractionResult.success,
      extractionError: extractionResult.error,
      scrutinyReport: scrutinyResult,
      data: updated,
    });
  } catch (error: any) {
    console.error("Error running extraction:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to run extraction.",
    });
  }
};

export const runScrutinyForApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
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

    // Authorization: Ministry Admin cannot execute regulatory decisions; Officer must be assigned
    if (req.user?.role === "MINISTRY_ADMIN") {
      res.status(403).json({
        success: false,
        error: "Access denied: Ministry Administrators have operational oversight only and cannot execute regulatory scrutiny.",
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

    const scrutinyResult = await complianceService.evaluateApplication(id);

    // Audit log scrutiny evaluation and notification routing concurrently
    await Promise.all([
      auditService.logEvent({
        applicationId: id,
        actorId: req.user?.id,
        actorName: req.user?.name || "OFFICER",
        actorRole: req.user?.role || "OFFICER",
        action: "SCRUTINY_EVALUATED",
        resourceType: "SCRUTINY_REPORT",
        resourceId: id,
        status: scrutinyResult.overallStatus === "DEFICIENCIES_DETECTED" ? "WARNING" : "SUCCESS",
        details: `Scrutiny evaluated: ${scrutinyResult.overallStatus} (${scrutinyResult.passedCount} passed, ${scrutinyResult.deficiencyCount} deficiencies, ${scrutinyResult.reviewCount} reviews)`,
        metadata: {
          overallStatus: scrutinyResult.overallStatus,
          deficiencyCount: scrutinyResult.deficiencyCount,
          reviewCount: scrutinyResult.reviewCount,
        },
      }),
      notificationService.notifyScrutinyFindings(
        application,
        scrutinyResult
      ),
    ]);

    const updated = await prisma.application.findUnique({
      where: { id },
      include: {
        assignedOfficer: {
          select: { id: true, name: true, email: true, designation: true },
        },
        documents: true,
        scrutinyReports: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    res.status(200).json({
      success: true,
      scrutinyReport: scrutinyResult,
      data: updated,
    });
  } catch (error: any) {
    console.error("Error evaluating scrutiny:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to evaluate scrutiny.",
    });
  }
};

export const getScrutinyReportForApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
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

    const report = await prisma.scrutinyReport.findFirst({
      where: { applicationId: id },
      orderBy: { createdAt: "desc" },
    });

    if (!report) {
      res.status(404).json({ success: false, error: "No scrutiny report found for this application." });
      return;
    }

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error("Error fetching scrutiny report:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch scrutiny report.",
    });
  }
};

/**
 * Update document validation status (Officer regulatory action).
 * Persists an officer override or manual verification decision on a document
 * without mutating or overwriting the original VLM extracted data.
 */
export const updateDocumentValidationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const rawDocId = req.params.documentId;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const documentId = Array.isArray(rawDocId) ? rawDocId[0] : rawDocId;

    if (!id || !documentId) {
      res.status(400).json({ success: false, error: "Application ID and Document ID are required." });
      return;
    }

    const { status, notes, fieldCorrections } = req.body;
    const validStatuses = ["PASS", "DEFICIENCY", "MANUAL_APPROVAL", "RESET"];

    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
      return;
    }

    const validFieldStates = ["PRESENT", "NOT_FOUND", "ILLEGIBLE", "AMBIGUOUS", "NOT_APPLICABLE"];
    if (fieldCorrections && typeof fieldCorrections === "object") {
      for (const [fKey, fVal] of Object.entries(fieldCorrections)) {
        if (!fVal || typeof fVal !== "object" || !("state" in fVal)) {
          res.status(400).json({
            success: false,
            error: `Invalid field correction for ${fKey}: missing state.`,
          });
          return;
        }
        if (!validFieldStates.includes((fVal as any).state)) {
          res.status(400).json({
            success: false,
            error: `Invalid field state for ${fKey}: ${(fVal as any).state}. Must be one of: ${validFieldStates.join(", ")}`,
          });
          return;
        }
      }
    }

    // Role check: Officer can only modify assigned application; Ministry Admin has read oversight only
    if (req.user?.role === "OFFICER") {
      const app = await prisma.application.findUnique({
        where: { id },
        select: { id: true, assignedOfficerId: true },
      });
      if (!app) {
        res.status(404).json({ success: false, error: "Application not found." });
        return;
      }
      if (app.assignedOfficerId !== req.user.id) {
        res.status(403).json({
          success: false,
          error: "Access denied: You are not assigned to this application.",
        });
        return;
      }
    } else if (req.user?.role === "MINISTRY_ADMIN") {
      res.status(403).json({
        success: false,
        error: "Access denied: Ministry Administrators have operational oversight only and cannot execute regulatory status changes.",
      });
      return;
    }

    const document = await prisma.document.findFirst({
      where: { id: documentId, applicationId: id },
    });

    if (!document) {
      res.status(404).json({
        success: false,
        error: "Document not found in this application.",
      });
      return;
    }

    const existingExtractedData = (document.extractedData as Record<string, any>) || {};
    const nowIso = new Date().toISOString();

    let officerValidation: Record<string, any> | null = null;
    if (status !== "RESET") {
      officerValidation = {
        status,
        notes: typeof notes === "string" ? notes.trim() : "",
        reviewedAt: nowIso,
        reviewedById: req.user?.id,
        reviewedByName: req.user?.name || "OFFICER",
      };
    }

    let officerReview: Record<string, any> | null = existingExtractedData.officerReview || null;
    if (status === "RESET" && (!fieldCorrections || Object.keys(fieldCorrections).length === 0)) {
      officerReview = null;
    } else if (fieldCorrections && typeof fieldCorrections === "object") {
      const existingFields = existingExtractedData.officerReview?.fields || {};
      const mergedFields = { ...existingFields };

      for (const [key, corr] of Object.entries(fieldCorrections)) {
        if (corr && typeof corr === "object") {
          const c = corr as any;
          mergedFields[key] = {
            state: c.state || "PRESENT",
            value: c.state === "PRESENT" ? c.value : null,
            rawText:
              c.rawText !== undefined
                ? c.rawText
                : c.value !== null && c.value !== undefined
                ? String(c.value)
                : null,
            pageNumber: typeof c.pageNumber === "number" ? c.pageNumber : null,
            notes: typeof c.notes === "string" ? c.notes.trim() : undefined,
            reviewedAt: nowIso,
            reviewedById: req.user?.id,
            reviewedByName: req.user?.name || "OFFICER",
          };
        }
      }

      officerReview = {
        reviewedAt: nowIso,
        reviewedById: req.user?.id,
        reviewedByName: req.user?.name || "OFFICER",
        notes: typeof notes === "string" ? notes.trim() : "",
        fields: mergedFields,
      };
    }

    const updatedExtractedData = {
      ...existingExtractedData,
      officerValidation,
      officerReview,
    };

    const updatedDoc = await prisma.document.update({
      where: { id: documentId },
      data: {
        extractedData: updatedExtractedData,
      },
    });

    // Re-evaluate scrutiny deterministically to keep findings synchronized with reviewed evidence
    let scrutinyResult = null;
    let scrutinyError: string | null = null;
    try {
      scrutinyResult = await complianceService.evaluateApplication(id);
    } catch (err: any) {
      console.error("Error re-evaluating scrutiny after document review:", err);
      scrutinyError = err?.message || "Failed to re-evaluate scrutiny.";
    }

    const hasCorrections = Boolean(fieldCorrections && Object.keys(fieldCorrections).length > 0);
    const action = hasCorrections ? "DOCUMENT_REVIEWED_AND_CORRECTED" : "DOCUMENT_STATUS_UPDATED";

    // Audit log the status update event
    await auditService.logEvent({
      applicationId: id,
      actorId: req.user?.id,
      actorName: req.user?.name || "OFFICER",
      actorRole: req.user?.role || "OFFICER",
      action,
      resourceType: "DOCUMENT",
      resourceId: documentId,
      status: scrutinyError ? "WARNING" : "SUCCESS",
      details: `Officer ${req.user?.name || "OFFICER"} reviewed ${document.originalName || document.fileName}: status ${status}${
        hasCorrections ? ` with ${Object.keys(fieldCorrections).length} field correction(s)` : ""
      }${notes ? ` (Notes: ${notes})` : ""}`,
      metadata: {
        documentId,
        documentType: document.documentType,
        fileName: document.fileName,
        status,
        correctedFieldsCount: hasCorrections ? Object.keys(fieldCorrections).length : 0,
        officerValidation,
        officerReview,
        scrutinyOverallStatus: scrutinyResult?.overallStatus,
        scrutinyError,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        document: updatedDoc,
        officerValidation,
        officerReview,
        scrutinyReport: scrutinyResult,
      },
      scrutinyReevaluationFailed: Boolean(scrutinyError),
      scrutinyError,
    });
  } catch (error: any) {
    console.error("Error updating document validation status:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to update document validation status.",
    });
  }
};

export const getApplicationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      res.status(400).json({ success: false, error: "Application ID is required." });
      return;
    }

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        assignedOfficer: {
          select: { id: true, name: true, email: true, designation: true },
        },
        documents: {
          orderBy: { createdAt: "asc" },
        },
        scrutinyReports: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!application) {
      res.status(404).json({ success: false, error: "Application not found." });
      return;
    }

    // Role check: Officer can only access assigned application
    if (req.user?.role === "OFFICER" && application.assignedOfficerId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: "Access denied: You are not assigned to this application.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: application,
    });
  } catch (error: any) {
    console.error("Error fetching application:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch application.",
    });
  }
};

/**
 * Unified Case Workspace endpoint (Slice 5).
 * Consolidates application details, documents, latest scrutiny report,
 * authority verifications, and audit chronology into a single concurrent response.
 */
export const getCaseWorkspaceData = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      res.status(400).json({ success: false, error: "Application ID is required." });
      return;
    }

    // Role check: Officer can only access assigned application; Ministry Admin has read oversight
    if (req.user?.role === "OFFICER") {
      const appCheck = await prisma.application.findUnique({
        where: { id },
        select: { id: true, assignedOfficerId: true },
      });
      if (!appCheck) {
        res.status(404).json({ success: false, error: "Application not found." });
        return;
      }
      if (appCheck.assignedOfficerId !== req.user.id) {
        res.status(403).json({
          success: false,
          error: "Access denied: You are not assigned to this application.",
        });
        return;
      }
    }

    // Execute independent queries concurrently via Promise.all
    const [application, verifications, auditTrail] = await Promise.all([
      prisma.application.findUnique({
        where: { id },
        include: {
          assignedOfficer: {
            select: { id: true, name: true, email: true, designation: true },
          },
          documents: {
            orderBy: { createdAt: "asc" },
          },
          scrutinyReports: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.authorityVerification.findMany({
        where: { applicationId: id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.findMany({
        where: { applicationId: id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    if (!application) {
      res.status(404).json({ success: false, error: "Application not found." });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        application,
        documents: application.documents || [],
        scrutinyReport: application.scrutinyReports?.[0] || null,
        authorityVerifications: verifications || [],
        auditTrail: auditTrail || [],
      },
    });
  } catch (error: any) {
    console.error("Error retrieving case workspace data:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve case workspace data.",
    });
  }
};

export const listApplications = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required." });
      return;
    }

    // Officer only sees their assigned applications
    // Ministry Admin sees all applications
    const whereClause = req.user.role === "OFFICER"
      ? { assignedOfficerId: req.user.id }
      : {};

    const applications = await prisma.application.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        assignedOfficer: {
          select: { id: true, name: true, email: true, designation: true },
        },
        documents: {
          select: {
            id: true,
            fileName: true,
            originalName: true,
            documentType: true,
            mimeType: true,
            fileSize: true,
            extractionStatus: true,
            extractedData: true,
          },
        },
        scrutinyReports: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            overallStatus: true,
            passedCount: true,
            deficiencyCount: true,
            reviewCount: true,
            missingCount: true,
            evaluationDate: true,
          },
        },
      },
      take: 50,
    });

    res.status(200).json({
      success: true,
      data: applications,
    });
  } catch (error: any) {
    console.error("Error listing applications:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to list applications.",
    });
  }
};
