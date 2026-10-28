import { authService } from "../services/auth.service.js";
import { auditService } from "../services/audit.service.js";
import { prisma } from "../lib/prisma.js";
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const clientIp = req.headers["x-forwarded-for"] || req.socket?.remoteAddress;
        const result = await authService.authenticateUser(email, password, clientIp);
        res.status(200).json({
            success: true,
            message: "Login successful.",
            data: result,
        });
    }
    catch (error) {
        const message = error.message || "Login failed.";
        const isLocked = message.includes("temporarily locked");
        const isDeactivated = message.includes("deactivated");
        const statusCode = isLocked ? 429 : isDeactivated ? 403 : 401;
        res.status(statusCode).json({
            success: false,
            error: message,
        });
    }
};
export const getMe = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, error: "Not authenticated." });
        return;
    }
    res.status(200).json({
        success: true,
        data: req.user,
    });
};
export const logout = async (req, res) => {
    if (req.user) {
        await auditService.logEvent({
            actorId: req.user.id,
            actorName: req.user.name,
            actorRole: req.user.role,
            action: "AUTH_LOGOUT",
            resourceType: "USER",
            resourceId: req.user.id,
            status: "SUCCESS",
            details: `User ${req.user.email} logged out successfully.`,
        });
    }
    res.status(200).json({
        success: true,
        message: "Logged out successfully.",
    });
};
export const provisionUser = async (req, res) => {
    try {
        const { email, password, name, role, designation, department } = req.body;
        if (!email || !password || !name || !role || !designation) {
            res.status(400).json({
                success: false,
                error: "email, password, name, role ('OFFICER' | 'MINISTRY_ADMIN'), and designation are required.",
            });
            return;
        }
        if (role !== "OFFICER" && role !== "MINISTRY_ADMIN") {
            res.status(400).json({
                success: false,
                error: "Role must be either 'OFFICER' or 'MINISTRY_ADMIN'.",
            });
            return;
        }
        const newUser = await authService.provisionUser({
            email,
            password,
            name,
            role,
            designation,
            department,
            ...(req.user
                ? {
                    actor: {
                        id: req.user.id,
                        name: req.user.name,
                        role: req.user.role,
                    },
                }
                : {}),
        });
        res.status(201).json({
            success: true,
            message: "User provisioned successfully.",
            data: newUser,
        });
    }
    catch (error) {
        console.error("Error provisioning user:", error);
        res.status(400).json({
            success: false,
            error: error.message || "Failed to provision user.",
        });
    }
};
export const listOfficers = async (_req, res) => {
    try {
        const officers = await prisma.user.findMany({
            where: { role: "OFFICER", isActive: true },
            select: {
                id: true,
                name: true,
                email: true,
                designation: true,
                department: true,
            },
            orderBy: { name: "asc" },
        });
        res.status(200).json({
            success: true,
            data: officers,
        });
    }
    catch (error) {
        console.error("Error listing officers:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to list officers.",
        });
    }
};
//# sourceMappingURL=auth.controller.js.map