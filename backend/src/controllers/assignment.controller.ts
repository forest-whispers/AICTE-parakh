import type { Request, Response } from "express";
import { assignmentService } from "../services/assignment.service.js";
import { applicationListingService } from "../services/application-listing.service.js";

export const assignApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required." });
      return;
    }

    // Allocation is strictly authorized for Ministry Administrators
    if (req.user.role !== "MINISTRY_ADMIN") {
      res.status(403).json({
        success: false,
        error: "Access denied. Only Ministry Administrators can allocate statutory applications.",
      });
      return;
    }

    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const { officerId, reason } = req.body;

    if (!id || !officerId) {
      res.status(400).json({
        success: false,
        error: "Application ID and officerId are required.",
      });
      return;
    }

    // Allocate officer with strict unassigned-only enforcement (no reallocation)
    const updated = await assignmentService.assignApplication(
      id,
      officerId,
      req.user,
      reason,
      { enforceUnassigned: true }
    );

    res.status(200).json({
      success: true,
      message: "Application allocated successfully.",
      data: updated,
    });
  } catch (error: any) {
    const isForbidden = error.message?.includes("Access denied");
    const isConflict = error.message?.includes("already been assigned");
    res.status(isForbidden ? 403 : isConflict ? 409 : 400).json({
      success: false,
      error: error.message || "Failed to allocate application.",
    });
  }
};

export const getUnassignedApplications = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required." });
      return;
    }

    if (req.user.role !== "MINISTRY_ADMIN") {
      res.status(403).json({
        success: false,
        error: "Access denied. Only Ministry Administrators can view the unassigned allocation queue.",
      });
      return;
    }

    // Force officerId: "unassigned" to strictly enforce unassigned-only scope at the query level
    const result = await applicationListingService.listApplications(req.user, {
      ...req.query,
      officerId: "unassigned",
    });

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("Error fetching unassigned applications:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch unassigned applications.",
    });
  }
};
