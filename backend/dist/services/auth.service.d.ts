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
export declare class AuthService {
    /**
     * Cryptographically secure password hashing using Node native scrypt.
     */
    hashPassword(password: string): {
        hash: string;
        salt: string;
    };
    /**
     * Constant-time password verification to prevent timing attacks.
     */
    verifyPassword(password: string, hash: string, salt: string): boolean;
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
    }): string;
    /**
     * Verifies an HMAC-SHA256 JWT token.
     */
    verifyToken(token: string): AuthTokenPayload | null;
    /**
     * Authenticates credentials with brute-force lockout protection.
     */
    authenticateUser(email: string, password: string, clientIp?: string): Promise<{
        user: UserSanitized;
        token: string;
    }>;
    /**
     * Provision user: restricted to authorized admin workflow.
     */
    provisionUser(params: {
        email: string;
        password: string;
        name: string;
        role: "OFFICER" | "MINISTRY_ADMIN";
        designation: string;
        department?: string | null;
        actor?: {
            id: string;
            name: string;
            role: string;
        };
    }): Promise<UserSanitized>;
    /**
     * Sanitizes user object to guarantee no password hash or salt exposure.
     */
    sanitizeUser(user: any): UserSanitized;
}
export declare const authService: AuthService;
//# sourceMappingURL=auth.service.d.ts.map