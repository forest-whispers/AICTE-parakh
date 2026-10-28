/**
 * Session Token Manager
 * 
 * Manages the Bearer authentication token for API communication.
 * Keeps an in-memory reference for fast synchronous retrieval,
 * and maintains session-level persistence so authenticated sessions
 * survive page reloads within the same browser tab.
 */

const TOKEN_KEY = "parakh_auth_session_token";

let inMemoryToken: string | null = null;

export const tokenManager = {
  getToken(): string | null {
    if (inMemoryToken) {
      return inMemoryToken;
    }
    try {
      const stored = sessionStorage.getItem(TOKEN_KEY);
      if (stored) {
        inMemoryToken = stored;
        return stored;
      }
    } catch {
      // In non-browser or restricted environments
    }
    return null;
  },

  setToken(token: string): void {
    inMemoryToken = token;
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Ignore storage errors
    }
  },

  clearToken(): void {
    inMemoryToken = null;
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore storage errors
    }
  },

  hasToken(): boolean {
    return Boolean(this.getToken());
  },
};
