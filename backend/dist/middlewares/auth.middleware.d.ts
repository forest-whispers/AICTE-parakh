import type { Request, Response, NextFunction } from "express";
import { type UserSanitized } from "../services/auth.service.js";
declare global {
    namespace Express {
        interface Request {
            user?: UserSanitized;
            token?: string;
        }
    }
}
/**
 * Enforces authenticated session/token requirement.
 */
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Optional authentication: attaches user if valid token present, otherwise proceeds unauthenticated.
 */
export declare const optionalAuthenticate: (req: Request, _res: Response, next: NextFunction) => Promise<void>;
/**
 * Role-based authorization middleware.
 */
export declare const requireRole: (...allowedRoles: Array<"OFFICER" | "MINISTRY_ADMIN">) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Application-level ownership & authorization guard.
 *
 * Enforces that:
 * 1. MINISTRY_ADMIN has ministry-wide read oversight, but cannot alter regulatory outcomes.
 * 2. OFFICER can only access applications explicitly assigned to them.
 */
export declare const requireApplicationAccess: (operation?: "read" | "write") => (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.middleware.d.ts.map