import { Router } from "express";
import {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../controllers/notification.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", getMyNotifications);
router.patch("/:id/read", markNotificationAsRead);
router.post("/read-all", markAllNotificationsAsRead);

export default router;
