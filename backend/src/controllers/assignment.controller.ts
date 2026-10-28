import type { Request, Response } from "express";
import { assignmentService } from "../services/assignment.service.js";

export const assignApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required." });
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

    const updated = await assignmentService.assignApplication(
      id,
      officerId,
      req.user,
      reason
    );

    res.status(200).json({
      success: true,
      message: "Application assignment updated successfully.",
      data: updated,
    });
  } catch (error: any) {
    const isForbidden = error.message?.includes("Access denied");
    res.status(isForbidden ? 403 : 400).json({
      success: false,
      error: error.message || "Failed to assign application.",
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
        error: "Access denied. Only Ministry Administrators can view unassigned application exceptions.",
      });
      return;
    }

    const applications = await assignmentService.getUnassignedApplications();

    res.status(200).json({
      success: true,
      data: applications,
    });
  } catch (error: any) {
    console.error("Error fetching unassigned applications:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch unassigned applications.",
    });
  }
};
