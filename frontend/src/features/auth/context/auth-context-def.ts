import { createContext } from "react";
import type { User, SignInCredentials, AuthLoginResponseData } from "../types/auth.types";

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isInitialLoading: boolean;
  sessionExpired: boolean;
  clearSessionExpired: () => void;
  login: (credentials: SignInCredentials) => Promise<AuthLoginResponseData>;
  logout: () => Promise<void>;
  checkSession: () => Promise<User | null>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
