import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/use-auth";

export const RootRedirect: React.FC = () => {
  const { user, isAuthenticated, isInitialLoading } = useAuth();

  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F5F0]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#165A60] border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  if (user?.role === "MINISTRY_ADMIN") {
    return <Navigate to="/ministry/portfolio" replace />;
  }

  return <Navigate to="/officer/workbench" replace />;
};