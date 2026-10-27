import { Router } from "express";
import { uploadMiddleware } from "../middlewares/upload.js";
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

const router = Router();

router.post("/", uploadMiddleware.array("documents"), createApplication);
router.get("/", listApplications);
router.get("/:id", getApplicationById);
router.post("/:id/extract", runExtractionForApplication);
router.post("/:id/scrutiny", runScrutinyForApplication);
router.get("/:id/scrutiny", getScrutinyReportForApplication);

// Slice 4B: Authority Verification Workflow
router.post("/:id/verify", runAuthorityVerification);
router.get("/:id/verifications", getAuthorityVerifications);
router.post("/:id/verify/bank-confirmation", recordBankConfirmation);
router.get("/:id/verifications/history", getVerificationHistory);

export default router;
