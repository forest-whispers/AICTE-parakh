import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  listReports,
  getReportById,
  downloadReportPdf,
} from "../controllers/report.controller.js";

const router = Router();

// All report routes require valid authentication
router.use(authenticate);

// List persisted reports with role-based scoping and pagination
router.get("/", listReports);

// Retrieve exact persisted report by ID
router.get("/:id", getReportById);

// Stream multi-page PDF export for exact persisted report
router.get("/:id/pdf", downloadReportPdf);

export default router;

