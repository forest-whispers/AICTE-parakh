import { Router } from "express";
import { uploadMiddleware } from "../middlewares/upload.js";
import {
  createApplication,
  getApplicationById,
  listApplications,
  runExtractionForApplication,
} from "../controllers/application.controller.js";

const router = Router();

router.post("/", uploadMiddleware.array("documents"), createApplication);
router.get("/", listApplications);
router.get("/:id", getApplicationById);
router.post("/:id/extract", runExtractionForApplication);

export default router;
