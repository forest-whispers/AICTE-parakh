import { Router } from "express";
import { uploadMiddleware } from "../middlewares/upload.js";
import {
  authenticate,
  optionalAuthenticate,
  requireRole,
  requireApplicationAccess,
} from "../middlewares/auth.middleware.js";
import {
  createApplication,
  getApplicationById,
  listApplications,
  runExtractionForApplication,
  runScrutinyForApplication,
  getScrutinyReportForApplication,
} from "../controllers/application.controller.js";
import {
  runAuthorityVerification,
  getAuthorityVerifications,
  recordBankConfirmation,
  getVerificationHistory,
} from "../controllers/authority-verification.controller.js";
import {
  assignApplication,
  getUnassignedApplications,
} from "../controllers/assignment.controller.js";

const router = Router();

// Intake: public or authenticated (if officer, defaults assignment to them)
router.post("/", optionalAuthenticate, uploadMiddleware.array("documents"), createApplication);

// Application Directory: Officers see their assigned apps; Ministry Admins see all
router.get("/", authenticate, listApplications);

// Unassigned Applications Exception Queue: Ministry Admin oversight
router.get("/unassigned", authenticate, requireRole("MINISTRY_ADMIN"), getUnassignedApplications);

// Single Application Details
router.get("/:id", authenticate, requireApplicationAccess("read"), getApplicationById);

// Assignment and Reassignment
router.post("/:id/assign", authenticate, assignApplication);

// Processing & Scrutiny (Officer regulatory execution only)
router.post("/:id/extract", authenticate, requireApplicationAccess("write"), runExtractionForApplication);
router.post("/:id/scrutiny", authenticate, requireApplicationAccess("write"), runScrutinyForApplication);
router.get("/:id/scrutiny", authenticate, requireApplicationAccess("read"), getScrutinyReportForApplication);

// Authority Verification Workflow
router.post("/:id/verify", authenticate, requireApplicationAccess("write"), runAuthorityVerification);
router.get("/:id/verifications", authenticate, requireApplicationAccess("read"), getAuthorityVerifications);
router.post("/:id/verify/bank-confirmation", authenticate, requireApplicationAccess("write"), recordBankConfirmation);
router.get("/:id/verifications/history", authenticate, requireApplicationAccess("read"), getVerificationHistory);

export default router;
