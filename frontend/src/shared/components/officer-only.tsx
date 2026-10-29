import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/use-auth";

export const OfficerOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  if (user?.role === "MINISTRY_ADMIN") {
    return <Navigate to="/ministry/portfolio" replace />;
  }

  return <>{children}</>;
};