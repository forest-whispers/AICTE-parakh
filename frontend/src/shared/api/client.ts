import { tokenManager } from "./token-manager";
import type { ApiError } from "../types/api.types";

const metaEnv = typeof import.meta !== "undefined" ? (import.meta as ImportMeta).env : undefined;
const API_BASE_URL = metaEnv?.VITE_API_URL || "/api";

type UnauthorizedHandler = () => void;
const unauthorizedHandlers: Set<UnauthorizedHandler> = new Set();

export function onUnauthorized(handler: UnauthorizedHandler): () => void {
  unauthorizedHandlers.add(handler);
  return () => {
    unauthorizedHandlers.delete(handler);
  };
}

function notifyUnauthorized(): void {
  for (const handler of unauthorizedHandlers) {
    handler();
  }
}

interface ErrorPayload {
  error?: string;
  message?: string;
}

export function buildUrl(endpoint: string): string {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }

  const base = API_BASE_URL.replace(/\/+$/, "");
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  // If base already ends with /api and endpoint starts with /api/, avoid duplicate /api/api
  if (base.endsWith("/api") && path.startsWith("/api/")) {
    return `${base}${path.slice(4)}`;
  }

  return `${base}${path}`;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = buildUrl(endpoint);

  const headers = new Headers(options.headers);

  // Set default Content-Type if sending a body and not FormData
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Attach auth token if available
  const token = tokenManager.getToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error: unknown) {
    const err = error as Error | undefined;
    const isNetworkError = error instanceof TypeError || err?.name === "TypeError";
    const apiError: ApiError = {
      message: isNetworkError
        ? "Sign-in service is unavailable. Check your connection or retry later."
        : err?.message || "A network error occurred while communicating with the server.",
      status: 0,
    };
    throw apiError;
  }

  // Handle unauthorized (401)
  if (response.status === 401) {
    // If not calling login itself, clear token and notify handlers
    const isAuthLoginEndpoint = endpoint.includes("/auth/login");
    if (!isAuthLoginEndpoint) {
      tokenManager.clearToken();
      notifyUnauthorized();
    }
  }

  let responseData: unknown = null;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  }

  if (!response.ok) {
    const payload = responseData as ErrorPayload | null;
    const errorMessage =
      payload?.error ||
      payload?.message ||
      `Request failed with status ${response.status}`;

    const apiError: ApiError = {
      message: errorMessage,
      status: response.status,
      data: responseData,
    };

    throw apiError;
  }

  return responseData as T;
}
