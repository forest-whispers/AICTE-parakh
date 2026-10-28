import { apiClient } from "../../../shared/api/client";
import { tokenManager } from "../../../shared/api/token-manager";
import type { ApiResponse } from "../../../shared/types/api.types";
import type { User, SignInCredentials, AuthLoginResponseData } from "../types/auth.types";

export const authApi = {
  /**
   * Authenticate officer or administrator credentials.
   */
  async login(credentials: SignInCredentials): Promise<AuthLoginResponseData> {
    const response = await apiClient<ApiResponse<AuthLoginResponseData>>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    if (!response.data || !response.data.token) {
      throw new Error(response.error || "Authentication response did not include a valid token.");
    }

    // Persist token for session continuity
    tokenManager.setToken(response.data.token);

    return response.data;
  },

  /**
   * Fetch currently authenticated officer/admin profile.
   */
  async getMe(): Promise<User> {
    const response = await apiClient<ApiResponse<User>>("/api/auth/me", {
      method: "GET",
    });

    if (!response.data) {
      throw new Error("Failed to retrieve authenticated user profile.");
    }

    return response.data;
  },

  /**
   * Logout user, audit event on backend, and clear token.
   */
  async logout(): Promise<void> {
    try {
      await apiClient<ApiResponse<void>>("/api/auth/logout", {
        method: "POST",
      });
    } catch {
      // Even if network failure occurs, ensure client clears session token
    } finally {
      tokenManager.clearToken();
    }
  },
};
