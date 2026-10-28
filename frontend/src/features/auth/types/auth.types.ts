export type UserRole = "OFFICER" | "MINISTRY_ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  designation: string;
  department: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface AuthLoginResponseData {
  user: User;
  token: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialLoading: boolean;
  error: Error | null;
  login: (credentials: SignInCredentials) => Promise<AuthLoginResponseData>;
  logout: () => Promise<void>;
  checkSession: () => Promise<User | null>;
}
