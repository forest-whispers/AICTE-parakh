import type { Request, Response } from "express";
import { ministryService } from "../services/ministry.service.js";
import { applicationListingService } from "../services/application-listing.service.js";

export const getMinistryDashboard = async (_req: Request, res: Response): Promise<void> => {
  try {
    const dashboard = await ministryService.getMinistryDashboard();
    res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error: any) {
    console.error("Error retrieving ministry dashboard:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve ministry dashboard.",
    });
  }
};

export const getMinistryOverview = async (_req: Request, res: Response): Promise<void> => {
  try {
    const overview = await ministryService.getPortfolioOverview();
    res.status(200).json({
      success: true,
      data: overview,
    });
  } catch (error: any) {
    console.error("Error retrieving ministry overview:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve portfolio overview.",
    });
  }
};

export const getMinistryApplications = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required." });
      return;
    }

    const result = await applicationListingService.listApplications(req.user, req.query);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("Error retrieving ministry applications:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve applications register.",
    });
  }
};

export const getMinistryWorkload = async (_req: Request, res: Response): Promise<void> => {
  try {
    const workload = await ministryService.getOfficerWorkload();
    res.status(200).json({
      success: true,
      data: workload,
    });
  } catch (error: any) {
    console.error("Error retrieving officer workload:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve officer workload.",
    });
  }
};

export const getMinistryIssues = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, severity, search, page, limit } = req.query;

    const result = await ministryService.getCrossApplicationIssues({
      category: category ? String(category) : undefined,
      severity: severity ? String(severity) : undefined,
      search: search ? String(search) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.status(200).json({
      success: true,
      data: result.issues,
      categoryCounts: result.categoryCounts,
      severityCounts: result.severityCounts,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("Error retrieving cross-application issues:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve cross-application issues.",
    });
  }
};

export const getMinistryActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { action, actorRole, actorId, status, search, page, limit } = req.query;

    const result = await ministryService.getOperationalActivity({
      action: action ? String(action) : undefined,
      actorRole: actorRole ? String(actorRole) : undefined,
      actorId: actorId ? String(actorId) : undefined,
      status: status ? String(status) : undefined,
      search: search ? String(search) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.status(200).json({
      success: true,
      data: result.activity,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("Error retrieving ministry activity:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve operational activity.",
    });
  }
};
