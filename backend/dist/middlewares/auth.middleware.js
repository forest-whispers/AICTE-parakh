import { authService } from "../services/auth.service.js";
import { prisma } from "../lib/prisma.js";
/**
 * Enforces authenticated session/token requirement.
 */
export const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                success: false,
                error: "Authentication required. Please provide a valid Bearer token.",
            });
            return;
        }
        const token = authHeader.substring(7).trim();
        const payload = authService.verifyToken(token);
        if (!payload) {
            res.status(401).json({
                success: false,
                error: "Session expired or invalid token. Please log in again.",
            });
            return;
        }
        // Verify user is still active in database
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
        });
        if (!user || !user.isActive) {
            res.status(401).json({
                success: false,
                error: "User account deactivated or not found.",
            });
            return;
        }
        req.user = authService.sanitizeUser(user);
        req.token = token;
        next();
    }
    catch (error) {
        console.error("Authentication middleware error:", error);
        res.status(500).json({
            success: false,
            error: "Authentication processing failed.",
        });
    }
};
/**
 * Optional authentication: attaches user if valid token present, otherwise proceeds unauthenticated.
 */
export const optionalAuthenticate = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.substring(7).trim();
            const payload = authService.verifyToken(token);
            if (payload) {
                const user = await prisma.user.findUnique({
                    where: { id: payload.userId },
                });
                if (user && user.isActive) {
                    req.user = authService.sanitizeUser(user);
                    req.token = token;
                }
            }
        }
    }
    catch {
        // Proceed unauthenticated
    }
    next();
};
/**
 * Role-based authorization middleware.
 */
export const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: "Authentication required.",
            });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: "Access denied. Insufficient permissions for this operation.",
            });
            return;
        }
        next();
    };
};
/**
 * Application-level ownership & authorization guard.
 *
 * Enforces that:
 * 1. MINISTRY_ADMIN has ministry-wide read oversight, but cannot alter regulatory outcomes.
 * 2. OFFICER can only access applications explicitly assigned to them.
 */
export const requireApplicationAccess = (operation = "read") => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: "Authentication required.",
                });
                return;
            }
            const rawId = req.params.id;
            const id = Array.isArray(rawId) ? rawId[0] : rawId;
            if (!id) {
                res.status(400).json({ success: false, error: "Application ID is required." });
                return;
            }
            const application = await prisma.application.findUnique({
                where: { id },
                select: {
                    id: true,
                    applicationNumber: true,
                    institutionName: true,
                    assignedOfficerId: true,
                    status: true,
                },
            });
            if (!application) {
                res.status(404).json({ success: false, error: "Application not found." });
                return;
            }
            // Ministry Admin
            if (req.user.role === "MINISTRY_ADMIN") {
                if (operation === "write") {
                    // Ministry Admin cannot perform regulatory processing (scrutiny re-evaluation or verification tampering)
                    res.status(403).json({
                        success: false,
                        error: "Access denied: Ministry Administrators have operational oversight only and cannot execute regulatory scrutiny operations.",
                    });
                    return;
                }
                // Read is permitted for Ministry Admin
                req.application = application;
                next();
                return;
            }
            // Officer: MUST be the assigned officer
            if (req.user.role === "OFFICER") {
                if (application.assignedOfficerId !== req.user.id) {
                    res.status(403).json({
                        success: false,
                        error: "Access denied: You are not assigned to this application.",
                    });
                    return;
                }
                req.application = application;
                next();
                return;
            }
            res.status(403).json({ success: false, error: "Access denied: Unauthorized role." });
        }
        catch (error) {
            console.error("Application access middleware error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to verify application authorization.",
            });
        }
    };
};
//# sourceMappingURL=auth.middleware.js.map