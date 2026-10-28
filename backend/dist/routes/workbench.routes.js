import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/auth.middleware.js";
import { getWorkbenchDashboard, getWorkbenchOverview, getWorkbenchApplications, getWorkbenchActionQueue, getWorkbenchVerifications, getWorkbenchActivity, } from "../controllers/workbench.controller.js";
const router = Router();
// All Workbench routes require OFFICER role
router.use(authenticate, requireRole("OFFICER"));
router.get("/dashboard", getWorkbenchDashboard);
router.get("/overview", getWorkbenchOverview);
router.get("/applications", getWorkbenchApplications);
router.get("/action-queue", getWorkbenchActionQueue);
router.get("/verifications", getWorkbenchVerifications);
router.get("/activity", getWorkbenchActivity);
export default router;
//# sourceMappingURL=workbench.routes.js.map