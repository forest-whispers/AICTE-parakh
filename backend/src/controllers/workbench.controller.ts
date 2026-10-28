import type { Request, Response } from "express";
import { workbenchService } from "../services/workbench.service.js";

export const getWorkbenchDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required." });
      return;
    }

    const dashboard = await workbenchService.getWorkbenchDashboard(req.user.id);
    res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error: any) {
    console.error("Error retrieving workbench dashboard:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve workbench dashboard.",
    });
  }
};

export const getWorkbenchOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required." });
      return;
    }

    const overview = await workbenchService.getWorkbenchOverview(req.user.id);
    res.status(200).json({
      success: true,
      data: overview,
    });
  } catch (error: any) {
    console.error("Error retrieving workbench overview:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve workbench overview.",
    });
  }
};

export const getWorkbenchApplications = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required." });
      return;
    }

    const {
      search,
      status,
      programCategory,
      hasDeficiencies,
      hasPendingVerifications,
      hasManualReview,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await workbenchService.getAssignedApplications(req.user.id, {
      search: search ? String(search) : undefined,
      status: status ? String(status) : undefined,
      programCategory: programCategory ? String(programCategory) : undefined,
      hasDeficiencies: hasDeficiencies !== undefined ? hasDeficiencies === "true" : undefined,
      hasPendingVerifications: hasPendingVerifications !== undefined ? hasPendingVerifications === "true" : undefined,
      hasManualReview: hasManualReview !== undefined ? hasManualReview === "true" : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy: sortBy ? String(sortBy) : undefined,
      sortOrder: sortOrder === "asc" ? "asc" : "desc",
    });

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("Error retrieving workbench applications:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve assigned applications.",
    });
  }
};

export const getWorkbenchActionQueue = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required." });
      return;
    }

    const queue = await workbenchService.getPrioritizedActionQueue(req.user.id);
    res.status(200).json({
      success: true,
      data: queue,
    });
  } catch (error: any) {
    console.error("Error retrieving workbench action queue:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve prioritized action queue.",
    });
  }
};

export const getWorkbenchVerifications = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required." });
      return;
    }

    const buckets = await workbenchService.getReviewAndVerificationWork(req.user.id);
    res.status(200).json({
      success: true,
      data: buckets,
    });
  } catch (error: any) {
    console.error("Error retrieving workbench verifications:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve verification work items.",
    });
  }
};

export const getWorkbenchActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required." });
      return;
    }

    const { page, limit } = req.query;
    const result = await workbenchService.getAssignedActivity(req.user.id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.status(200).json({
      success: true,
      data: result.activity,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("Error retrieving workbench activity:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve assigned activity.",
    });
  }
};
