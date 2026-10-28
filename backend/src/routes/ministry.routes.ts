import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/auth.middleware.js";
import {
  getMinistryOverview,
  getMinistryApplications,
  getMinistryWorkload,
  getMinistryIssues,
  getMinistryActivity,
} from "../controllers/ministry.controller.js";

const router = Router();

// All Ministry Overview routes require MINISTRY_ADMIN role
router.use(authenticate, requireRole("MINISTRY_ADMIN"));

router.get("/overview", getMinistryOverview);
router.get("/applications", getMinistryApplications);
router.get("/workload", getMinistryWorkload);
router.get("/issues", getMinistryIssues);
router.get("/activity", getMinistryActivity);

export default router;
