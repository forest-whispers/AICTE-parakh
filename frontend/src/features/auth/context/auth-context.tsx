import React, { useEffect, useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../services/auth-api";
import { tokenManager } from "../../../shared/api/token-manager";
import { onUnauthorized } from "../../../shared/api/client";
import { AuthContext } from "./auth-context-def";
import type { User, SignInCredentials } from "../types/auth.types";
import type { ApiError } from "../../../shared/types/api.types";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);
  const queryClient = useQueryClient();

  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  const checkSession = useCallback(async (): Promise<User | null> => {
    if (!tokenManager.hasToken()) {
      setUser(null);
      return null;
    }

    try {
      const currentUser = await authApi.getMe();
      setUser(currentUser);
      return currentUser;
    } catch (err: unknown) {
      const apiErr = err as ApiError | undefined;
      if (apiErr?.status === 401) {
        tokenManager.clearToken();
        setUser(null);
        setSessionExpired(true);
      }
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      if (tokenManager.hasToken()) {
        try {
          const profile = await authApi.getMe();
          if (isMounted) {
            setUser(profile);
          }
        } catch (err: unknown) {
          const apiErr = err as ApiError | undefined;
          if (apiErr?.status === 401 && isMounted) {
            tokenManager.clearToken();
            setUser(null);
            setSessionExpired(true);
          }
        }
      }
      if (isMounted) {
        setIsInitialLoading(false);
      }
    }

    initSession();

    // Subscribe to unauthorized 401 events triggered across any API calls
    const unsubscribe = onUnauthorized(() => {
      if (isMounted) {
        setUser(null);
        setSessionExpired(true);
        queryClient.clear();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [queryClient]);

  const loginMutation = useMutation({
    mutationFn: (credentials: SignInCredentials) => authApi.login(credentials),
    onSuccess: (data) => {
      setUser(data.user);
      setSessionExpired(false);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      setUser(null);
      tokenManager.clearToken();
      // Purge query cache to ensure no stale protected data remains
      queryClient.clear();
    },
  });

  const login = async (credentials: SignInCredentials) => {
    return loginMutation.mutateAsync(credentials);
  };

  const logout = async () => {
    return logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isInitialLoading,
        sessionExpired,
        clearSessionExpired,
        login,
        logout,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
