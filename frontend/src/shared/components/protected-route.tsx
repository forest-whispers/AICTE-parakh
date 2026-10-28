import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/use-auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<"OFFICER" | "MINISTRY_ADMIN">;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, isAuthenticated, isInitialLoading } = useAuth();
  const location = useLocation();

  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F5F0]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#165A60] border-t-transparent" />
          <span className="text-xs font-mono text-[#5C6F73] uppercase tracking-wider">
            Verifying session...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Redirect to sign in, preserving target location
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  // Check role restrictions if specified
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F5F0] p-6">
        <div className="max-w-md w-full bg-white border border-[#D7DEDA] rounded-[3px] p-6 shadow-panel">
          <h2 className="text-lg font-bold text-[#172E33] mb-2">Access Restricted</h2>
          <p className="text-xs text-[#5C6F73] mb-4">
            Your provisioned role ({user.role}) does not have permission to access this area.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
