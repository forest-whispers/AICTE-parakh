import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET || "parakh-secure-jwt-secret-key-2026-aicte-prototype";
const TOKEN_EXPIRY_SECONDS = 8 * 60 * 60; // 8 hours
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: "OFFICER" | "MINISTRY_ADMIN";
  name: string;
  designation: string;
  department: string | null;
  exp: number;
}

export interface UserSanitized {
  id: string;
  email: string;
  name: string;
  role: "OFFICER" | "MINISTRY_ADMIN";
  designation: string;
  department: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class AuthService {
  /**
   * Cryptographically secure password hashing using Node native scrypt.
   */
  hashPassword(password: string): { hash: string; salt: string } {
    const salt = crypto.randomBytes(16).toString("hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return {
      hash: derivedKey.toString("hex"),
      salt,
    };
  }

  /**
   * Constant-time password verification to prevent timing attacks.
   */
  verifyPassword(password: string, hash: string, salt: string): boolean {
    try {
      const derivedKey = crypto.scryptSync(password, salt, 64);
      const hashBuffer = Buffer.from(hash, "hex");
      if (derivedKey.length !== hashBuffer.length) {
        return false;
      }
      return crypto.timingSafeEqual(derivedKey, hashBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Generates a standard RFC 7519 HMAC-SHA256 JWT token using native node:crypto.
   */
  generateToken(user: {
    id: string;
    email: string;
    role: string;
    name: string;
    designation: string;
    department?: string | null;
  }): string {
    const header = {
      alg: "HS256",
      typ: "JWT",
    };

    const exp = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS;
    const payload: AuthTokenPayload = {
      userId: user.id,
      email: user.email.toLowerCase(),
      role: user.role as "OFFICER" | "MINISTRY_ADMIN",
      name: user.name,
      designation: user.designation,
      department: user.department || null,
      exp,
    };

    const b64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
    const b64Payload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const unsignedToken = `${b64Header}.${b64Payload}`;

    const signature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(unsignedToken)
      .digest("base64url");

    return `${unsignedToken}.${signature}`;
  }

  /**
   * Verifies an HMAC-SHA256 JWT token.
   */
  verifyToken(token: string): AuthTokenPayload | null {
    try {
      if (!token || typeof token !== "string") return null;

      const parts = token.split(".");
      if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;

      const b64Header = parts[0];
      const b64Payload = parts[1];
      const signature = parts[2];
      const unsignedToken = `${b64Header}.${b64Payload}`;

      const expectedSignature = crypto
        .createHmac("sha256", JWT_SECRET)
        .update(unsignedToken)
        .digest("base64url");

      const sigBuf = Buffer.from(signature);
      const expectedBuf = Buffer.from(expectedSignature);

      if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(b64Payload, "base64url").toString("utf8")) as AuthTokenPayload;

      // Check token expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Authenticates credentials with brute-force lockout protection.
   */
  async authenticateUser(
    email: string,
    password: string,
    clientIp?: string
  ): Promise<{ user: UserSanitized; token: string }> {
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
      throw new Error("Email and password are required.");
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Avoid user enumeration
      throw new Error("Invalid email or password.");
    }

    // Check account active state
    if (!user.isActive) {
      throw new Error("Account is deactivated. Contact Ministry Administrator.");
    }

    // Check lockout
    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60000);
      throw new Error(
        `Account is temporarily locked due to multiple failed login attempts. Try again in ${remainingMinutes} minute(s).`
      );
    }

    // Verify password
    const isPasswordValid = this.verifyPassword(password, user.passwordHash, user.salt);

    if (!isPasswordValid) {
      const updatedFailed = user.failedLoginAttempts + 1;
      let lockedUntil: Date | null = null;

      if (updatedFailed >= MAX_FAILED_ATTEMPTS) {
        lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: updatedFailed,
          lockedUntil,
        },
      });

      // Record audit failure
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          actorName: user.name,
          actorRole: user.role,
          action: "AUTH_LOGIN_FAILED",
          resourceType: "USER",
          resourceId: user.id,
          status: "FAILURE",
          details: `Failed login attempt (${updatedFailed}/${MAX_FAILED_ATTEMPTS})`,
          metadata: { ip: clientIp || "unknown" },
        },
      });

      throw new Error("Invalid email or password.");
    }

    // Successful login: reset failed attempts and lockout
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    }

    const token = this.generateToken(user);
    const sanitized = this.sanitizeUser(user);

    // Record audit success
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: "AUTH_LOGIN_SUCCESS",
        resourceType: "USER",
        resourceId: user.id,
        status: "SUCCESS",
        details: `Successful authenticated login for ${user.email} (${user.role})`,
        metadata: { ip: clientIp || "unknown" },
      },
    });

    return { user: sanitized, token };
  }

  /**
   * Provision user: restricted to authorized admin workflow.
   */
  async provisionUser(params: {
    email: string;
    password: string;
    name: string;
    role: "OFFICER" | "MINISTRY_ADMIN";
    designation: string;
    department?: string | null;
    actor?: { id: string; name: string; role: string };
  }): Promise<UserSanitized> {
    const normalizedEmail = params.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new Error(`User with email '${params.email}' already exists.`);
    }

    const { hash, salt } = this.hashPassword(params.password);

    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: hash,
        salt,
        name: params.name.trim(),
        role: params.role,
        designation: params.designation.trim(),
        department: params.department ? params.department.trim() : null,
        isActive: true,
      },
    });

    // Record audit
    await prisma.auditLog.create({
      data: {
        actorId: params.actor?.id || null,
        actorName: params.actor?.name || "SYSTEM",
        actorRole: params.actor?.role || "SYSTEM",
        action: "USER_PROVISIONED",
        resourceType: "USER",
        resourceId: newUser.id,
        status: "SUCCESS",
        details: `Provisioned user account for ${newUser.name} <${newUser.email}> with role ${newUser.role}`,
        metadata: {
          provisionedEmail: newUser.email,
          provisionedRole: newUser.role,
        },
      },
    });

    return this.sanitizeUser(newUser);
  }

  /**
   * Sanitizes user object to guarantee no password hash or salt exposure.
   */
  sanitizeUser(user: any): UserSanitized {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "OFFICER" | "MINISTRY_ADMIN",
      designation: user.designation,
      department: user.department || null,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const authService = new AuthService();
