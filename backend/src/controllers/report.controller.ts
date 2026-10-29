import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { reportListingService } from "../services/report-listing.service.js";
import { reportPdfService } from "../services/report-pdf.service.js";

/**
 * List persisted scrutiny reports with database-level filtering, pagination, and role scoping.
 */
export const listReports = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required." });
      return;
    }

    const result = await reportListingService.listReports(req.user, req.query);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("Error listing scrutiny reports:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to list scrutiny reports.",
    });
  }
};

/**
 * Retrieve a single exact persisted scrutiny report by ID with its findings and application details.
 */
export const getReportById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required." });
      return;
    }

    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      res.status(400).json({ success: false, error: "Report ID is required." });
      return;
    }

    const report = await prisma.scrutinyReport.findUnique({
      where: { id },
      include: {
        application: {
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
              },
            },
          },
        },
      },
    });

    if (!report) {
      res.status(404).json({ success: false, error: "Scrutiny report not found." });
      return;
    }

    // Role-based Access Enforcement:
    // Officer may only view reports for applications explicitly assigned to them
    if (req.user.role === "OFFICER" && report.application.assignedOfficerId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: "Access denied: You are not assigned to the application for this report.",
      });
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
 * Download a formatted multi-page PDF representation of the exact selected scrutiny report.
 */
export const downloadReportPdf = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required." });
      return;
    }

    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      res.status(400).json({ success: false, error: "Report ID is required." });
      return;
    }

    const report = await prisma.scrutinyReport.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            assignedOfficer: {
              select: { id: true, name: true, email: true, designation: true },
            },
          },
        },
      },
    });

    if (!report) {
      res.status(404).json({ success: false, error: "Scrutiny report not found." });
      return;
    }

    // Role-based Access Enforcement
    if (req.user.role === "OFFICER" && report.application.assignedOfficerId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: "Access denied: You are not assigned to the application for this report.",
      });
      return;
    }

    const safeAppNumber = report.application.applicationNumber.replace(/[^a-zA-Z0-9-_]/g, "_");
    const filename = `PARAKH-Scrutiny-Report-${safeAppNumber}-${report.id.slice(0, 8)}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    reportPdfService.generateReportPdf(report as any, res);
  } catch (error: any) {
    console.error("Error generating report PDF:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || "Failed to generate report PDF.",
      });
    }
  }
};

