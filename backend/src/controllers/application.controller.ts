import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { vlmService } from "../services/vlm.service.js";

export const createApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const { institutionName, applicationNumber } = req.body;

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

    // Parse documentTypes mapping: can be passed as JSON string or individual values
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

    // Prepare document records
    const documentsData = files.map((file, index) => {
      const assignedType = docTypes[index] || "UNRECOGNIZED";
      return {
        fileName: file.filename,
        originalName: file.originalname,
        filePath: file.path,
        mimeType: file.mimetype,
        fileSize: file.size,
        documentType: assignedType,
        extractionStatus: "PENDING",
      };
    });

    const application = await prisma.application.create({
      data: {
        institutionName: String(institutionName).trim(),
        applicationNumber: String(applicationNumber).trim(),
        status: "PROCESSING_EXTRACTION",
        documents: {
          create: documentsData,
        },
      },
      include: {
        documents: true,
      },
    });

    // Immediate extraction trigger in single multimodal call
    const docItems = application.documents.map((d) => ({
      id: d.id,
      filePath: d.filePath,
      mimeType: d.mimeType,
      originalName: d.originalName,
    }));

    // Trigger extraction and await completion
    const extractionResult = await vlmService.processApplicationDocuments(application.id, docItems);

    // Fetch the updated application with extracted data
    const updatedApplication = await prisma.application.findUnique({
      where: { id: application.id },
      include: {
        documents: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    res.status(201).json({
      success: true,
      extractionSuccess: extractionResult.success,
      extractionError: extractionResult.error,
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

    const updated = await prisma.application.findUnique({
      where: { id },
      include: { documents: true },
    });

    res.status(200).json({
      success: true,
      extractionSuccess: extractionResult.success,
      extractionError: extractionResult.error,
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
        documents: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!application) {
      res.status(404).json({ success: false, error: "Application not found." });
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

export const listApplications = async (_req: Request, res: Response): Promise<void> => {
  try {
    const applications = await prisma.application.findMany({
      orderBy: { createdAt: "desc" },
      include: {
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
      },
      take: 20,
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
