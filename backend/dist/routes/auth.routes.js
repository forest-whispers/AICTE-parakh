import { Router } from "express";
import { login, getMe, logout, provisionUser, listOfficers, } from "../controllers/auth.controller.js";
import { authenticate, optionalAuthenticate, requireRole, } from "../middlewares/auth.middleware.js";
const router = Router();
router.post("/login", login);
router.get("/me", authenticate, getMe);
router.post("/logout", optionalAuthenticate, logout);
router.post("/provision", authenticate, requireRole("MINISTRY_ADMIN"), provisionUser);
router.get("/officers", authenticate, listOfficers);
export default router;
//# sourceMappingURL=auth.routes.js.map