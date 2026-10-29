import React from "react";
import { Outlet } from "react-router-dom";

export const AuthLayout: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto bg-[#F6F5F0]">
      <Outlet />
    </div>
  );
};
