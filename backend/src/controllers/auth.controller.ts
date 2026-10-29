import type { Request, Response } from "express";
import { authService } from "../services/auth.service.js";
import { auditService } from "../services/audit.service.js";
import { prisma } from "../lib/prisma.js";

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket?.remoteAddress;

    const result = await authService.authenticateUser(email, password, clientIp);

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: result,
    });
  } catch (error: any) {
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

export const getMe = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Not authenticated." });
    return;
  }

  res.status(200).json({
    success: true,
    data: req.user,
  });
};

export const logout = async (req: Request, res: Response): Promise<void> => {
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

export const provisionUser = async (req: Request, res: Response): Promise<void> => {
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
  } catch (error: any) {
    console.error("Error provisioning user:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Failed to provision user.",
    });
  }
};

export const listOfficers = async (_req: Request, res: Response): Promise<void> => {
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
  } catch (error: any) {
    console.error("Error listing officers:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to list officers.",
    });
  }
};

export const registerOfficer = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required." });
      return;
    }

    if (req.user.role !== "MINISTRY_ADMIN") {
      res.status(403).json({
        success: false,
        error: "Access denied. Only Ministry Administrators can register new officers.",
      });
      return;
    }

    const { email, password, name, designation, department } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ success: false, error: "Officer full name is required." });
      return;
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      res.status(400).json({ success: false, error: "Official email address is required." });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      res.status(400).json({ success: false, error: "Invalid email address format." });
      return;
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      res.status(400).json({
        success: false,
        error: "Initial password is required and must be at least 8 characters long.",
      });
      return;
    }

    if (!designation || typeof designation !== "string" || !designation.trim()) {
      res.status(400).json({ success: false, error: "Officer designation is required." });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      res.status(400).json({
        success: false,
        error: `An officer with email '${normalizedEmail}' is already registered.`,
      });
      return;
    }

    // Secure password hashing using scrypt
    const { hash, salt } = authService.hashPassword(password);

    // Force role strictly to OFFICER on the server
    const newOfficer = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: hash,
        salt,
        name: name.trim(),
        role: "OFFICER", // Server-enforced role
        designation: designation.trim(),
        department: department && typeof department === "string" && department.trim() ? department.trim() : null,
        isActive: true,
      },
    });

    // Record audit event
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        actorName: req.user.name,
        actorRole: req.user.role,
        action: "OFFICER_REGISTERED",
        resourceType: "USER",
        resourceId: newOfficer.id,
        status: "SUCCESS",
        details: `Registered scrutiny officer ${newOfficer.name} <${newOfficer.email}> (${newOfficer.designation})`,
        metadata: {
          registeredEmail: newOfficer.email,
          registeredRole: "OFFICER",
          registeredDesignation: newOfficer.designation,
          registeredDepartment: newOfficer.department,
          registeredBy: req.user.name,
        },
      },
    });

    const sanitized = authService.sanitizeUser(newOfficer);

    res.status(201).json({
      success: true,
      message: "Officer account registered successfully.",
      data: sanitized,
    });
  } catch (error: any) {
    console.error("Error registering officer:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to register officer.",
    });
  }
};
