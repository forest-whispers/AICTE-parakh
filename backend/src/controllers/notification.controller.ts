import type { Request, Response } from "express";
import { notificationService } from "../services/notification.service.js";

export const getMyNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required." });
      return;
    }

    const unreadOnly = req.query.unread === "true";
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;

    const notifications = await notificationService.getUserNotifications(req.user.id, {
      unreadOnly,
      limit,
    });

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch notifications.",
    });
  }
};

export const markNotificationAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required." });
      return;
    }

    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) {
      res.status(400).json({ success: false, error: "Notification ID is required." });
      return;
    }

    const updated = await notificationService.markAsRead(id, req.user.id);

    res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      data: updated,
    });
  } catch (error: any) {
    const isForbidden = error.message?.includes("Access denied");
    res.status(isForbidden ? 403 : 400).json({
      success: false,
      error: error.message || "Failed to mark notification as read.",
    });
  }
};

export const markAllNotificationsAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required." });
      return;
    }

    const result = await notificationService.markAllAsRead(req.user.id);

    res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
      count: result.count,
    });
  } catch (error: any) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to mark notifications as read.",
    });
  }
};
