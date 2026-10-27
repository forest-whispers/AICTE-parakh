import { Router } from "express";
import { uploadMiddleware } from "../middlewares/upload.js";
import { createApplication, getApplicationById, listApplications, runExtractionForApplication, runScrutinyForApplication, getScrutinyReportForApplication, } from "../controllers/application.controller.js";
const router = Router();
router.post("/", uploadMiddleware.array("documents"), createApplication);
router.get("/", listApplications);
router.get("/:id", getApplicationById);
router.post("/:id/extract", runExtractionForApplication);
router.post("/:id/scrutiny", runScrutinyForApplication);
router.get("/:id/scrutiny", getScrutinyReportForApplication);
export default router;
//# sourceMappingURL=application.routes.js.map