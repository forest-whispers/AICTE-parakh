import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/auth.middleware.js";
import {
  getMinistryDashboard,
  getMinistryOverview,
  getMinistryApplications,
  getMinistryWorkload,
  getMinistryIssues,
  getMinistryActivity,
} from "../controllers/ministry.controller.js";
import { getUnassignedApplications } from "../controllers/assignment.controller.js";
import { listOfficers, registerOfficer } from "../controllers/auth.controller.js";

const router = Router();

// All Ministry Overview routes require MINISTRY_ADMIN role
router.use(authenticate, requireRole("MINISTRY_ADMIN"));

// Consolidated Ministry Dashboard endpoint
router.get("/dashboard", getMinistryDashboard);

// Standalone endpoints preserved for detailed views, deep drill-downs, and pagination
router.get("/overview", getMinistryOverview);
router.get("/applications", getMinistryApplications);
router.get("/allocation-queue", getUnassignedApplications);
router.get("/officers", listOfficers);
router.post("/officers", registerOfficer);
router.get("/workload", getMinistryWorkload);
router.get("/issues", getMinistryIssues);
router.get("/activity", getMinistryActivity);

export default router;
