import crypto from "node:crypto";
import fs from "node:fs/promises";
import { prisma } from "../lib/prisma.js";
import { vlmService } from "../services/vlm.service.js";
import { complianceService } from "../services/compliance.service.js";
export const createApplication = async (req, res) => {
    try {
        const { institutionName, applicationNumber, programCategory, proposedIntake } = req.body;
        if (!institutionName || !applicationNumber) {
            res.status(400).json({
                success: false,
                error: "Both institutionName and applicationNumber are required.",
            });
            return;
        }
        const files = req.files;
        if (!files || files.length === 0) {
            res.status(400).json({
                success: false,
                error: "At least one document must be uploaded.",
            });
            return;
        }
        // Parse documentTypes mapping: can be passed as JSON string or array
        let docTypes = [];
        if (req.body.documentTypes) {
            try {
                docTypes = typeof req.body.documentTypes === "string"
                    ? JSON.parse(req.body.documentTypes)
                    : req.body.documentTypes;
            }
            catch {
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
        const documentsData = await Promise.all(files.map(async (file, index) => {
            const assignedType = docTypes[index] || "UNRECOGNIZED";
            let fileHash = null;
            try {
                const buffer = await fs.readFile(file.path);
                fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
            }
            catch (hashErr) {
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
        }));
        const parsedIntake = proposedIntake ? parseInt(String(proposedIntake), 10) : null;
        const application = await prisma.application.create({
            data: {
                institutionName: String(institutionName).trim(),
                applicationNumber: String(applicationNumber).trim(),
                programCategory: programCategory ? String(programCategory).trim() : null,
                proposedIntake: Number.isFinite(parsedIntake) ? parsedIntake : null,
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
        // If extraction completed, trigger deterministic compliance scrutiny automatically
        let scrutinyResult = null;
        if (extractionResult.success) {
            try {
                scrutinyResult = await complianceService.evaluateApplication(application.id);
            }
            catch (scrutinyErr) {
                console.error("Auto-scrutiny evaluation error:", scrutinyErr);
            }
        }
        // Fetch the updated application with extracted data and scrutiny report
        const updatedApplication = await prisma.application.findUnique({
            where: { id: application.id },
            include: {
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
    }
    catch (error) {
        console.error("Error creating application:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to create application.",
        });
    }
};
export const runExtractionForApplication = async (req, res) => {
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
        // Automatically run scrutiny after re-extraction
        let scrutinyResult = null;
        if (extractionResult.success) {
            try {
                scrutinyResult = await complianceService.evaluateApplication(id);
            }
            catch (scrutinyErr) {
                console.error("Scrutiny evaluation error:", scrutinyErr);
            }
        }
        const updated = await prisma.application.findUnique({
            where: { id },
            include: {
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
    }
    catch (error) {
        console.error("Error running extraction:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to run extraction.",
        });
    }
};
export const runScrutinyForApplication = async (req, res) => {
    try {
        const rawId = req.params.id;
        const id = Array.isArray(rawId) ? rawId[0] : rawId;
        if (!id) {
            res.status(400).json({ success: false, error: "Application ID is required." });
            return;
        }
        const scrutinyResult = await complianceService.evaluateApplication(id);
        const updated = await prisma.application.findUnique({
            where: { id },
            include: {
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
    }
    catch (error) {
        console.error("Error evaluating scrutiny:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to evaluate scrutiny.",
        });
    }
};
export const getScrutinyReportForApplication = async (req, res) => {
    try {
        const rawId = req.params.id;
        const id = Array.isArray(rawId) ? rawId[0] : rawId;
        if (!id) {
            res.status(400).json({ success: false, error: "Application ID is required." });
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
    }
    catch (error) {
        console.error("Error fetching scrutiny report:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to fetch scrutiny report.",
        });
    }
};
export const getApplicationById = async (req, res) => {
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
        res.status(200).json({
            success: true,
            data: application,
        });
    }
    catch (error) {
        console.error("Error fetching application:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to fetch application.",
        });
    }
};
export const listApplications = async (_req, res) => {
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
            take: 20,
        });
        res.status(200).json({
            success: true,
            data: applications,
        });
    }
    catch (error) {
        console.error("Error listing applications:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to list applications.",
        });
    }
};
//# sourceMappingURL=application.controller.js.map