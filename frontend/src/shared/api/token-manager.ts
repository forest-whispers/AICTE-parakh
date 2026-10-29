/**
 * Session Token Manager
 * 
 * Manages the Bearer authentication token for API communication.
 * Keeps an in-memory reference for fast synchronous retrieval,
 * and maintains dual session & local persistence so authenticated sessions
 * survive page reloads and cross-tab/new-window navigations within the browser.
 */

const TOKEN_KEY = "parakh_auth_session_token";

let inMemoryToken: string | null = null;

export const tokenManager = {
  getToken(): string | null {
    if (inMemoryToken) {
      return inMemoryToken;
    }
    try {
      const storedSession = sessionStorage.getItem(TOKEN_KEY);
      if (storedSession) {
        inMemoryToken = storedSession;
        return storedSession;
      }
    } catch {
      // In non-browser or restricted environments
    }
    try {
      const storedLocal = localStorage.getItem(TOKEN_KEY);
      if (storedLocal) {
        inMemoryToken = storedLocal;
        return storedLocal;
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
    try {
      localStorage.setItem(TOKEN_KEY, token);
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
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore storage errors
    }
  },

  hasToken(): boolean {
    return Boolean(this.getToken());
  },
};
