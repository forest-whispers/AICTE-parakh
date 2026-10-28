import React from "react";
import { useAuth } from "../../auth/hooks/use-auth";
import { Alert } from "../../../shared/ui/alert";
import { Button } from "../../../shared/ui/button";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, CheckCircle2 } from "lucide-react";

export const OfficerLandingPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/sign-in", { replace: true });
  };

  return (
    <div className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
      {/* Page Title & Breadcrumb */}
      <div className="mb-8">
        <div className="text-[11px] font-mono tracking-wider uppercase text-[#5C6F73] mb-1">
          PARAKH / PROTECTED OFFICER AREA
        </div>
        <h1 className="text-2xl font-bold text-[#172E33] tracking-tight m-0">
          Officer Landing & Authentication Verification
        </h1>
        <p className="text-xs sm:text-[13px] text-[#5C6F73] mt-1 m-0">
          Slice 1 Foundation: Routing, session verification, and officer authentication established.
        </p>
      </div>

      <div className="space-y-6">
        {/* Exact "Account / active session" recipe from Figma 03 State Reference */}
        <div className="bg-white border border-[#D7DEDA] rounded-[3px] p-6 shadow-panel">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#5C6F73] mb-4">
            Account / Active Session Reference
          </div>

          <div className="mb-4">
            <Alert variant="info" title={`${user?.name} • ${user?.role}`}>
              {user?.role === "OFFICER"
                ? "Assigned applications only. Ministry administration is not available to this account."
                : "Operational oversight enabled across all institutional applications."}
            </Alert>
            <div className="mt-2 text-[10px] tracking-wider text-[#5C6F73] uppercase font-mono">
              CURRENT ROLE / {user?.role}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleLogout}
              className="text-xs px-3.5 py-1.5"
            >
              Log out
            </Button>
          </div>
        </div>

        {/* Identity & Session Verification Details */}
        <div className="bg-white border border-[#D7DEDA] rounded-[3px] p-6 shadow-panel">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4 text-[#165A60]" />
            <h3 className="text-sm font-semibold text-[#172E33] m-0">
              Session Profile (Live Backend Contract)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-[#F6F5F0] rounded-[3px] border border-[#D7DEDA]">
              <span className="text-[10px] uppercase font-mono text-[#5C6F73] block mb-1">
                Officer Name
              </span>
              <span className="font-semibold text-[#172E33]">{user?.name}</span>
            </div>

            <div className="p-3 bg-[#F6F5F0] rounded-[3px] border border-[#D7DEDA]">
              <span className="text-[10px] uppercase font-mono text-[#5C6F73] block mb-1">
                Official Email
              </span>
              <span className="font-mono text-[#172E33]">{user?.email}</span>
            </div>

            <div className="p-3 bg-[#F6F5F0] rounded-[3px] border border-[#D7DEDA]">
              <span className="text-[10px] uppercase font-mono text-[#5C6F73] block mb-1">
                Designation
              </span>
              <span className="text-[#172E33]">{user?.designation}</span>
            </div>

            <div className="p-3 bg-[#F6F5F0] rounded-[3px] border border-[#D7DEDA]">
              <span className="text-[10px] uppercase font-mono text-[#5C6F73] block mb-1">
                Department / Office
              </span>
              <span className="text-[#172E33]">{user?.department || "AICTE Headquarters"}</span>
            </div>

            <div className="p-3 bg-[#F6F5F0] rounded-[3px] border border-[#D7DEDA]">
              <span className="text-[10px] uppercase font-mono text-[#5C6F73] block mb-1">
                Role Boundary
              </span>
              <span className="font-mono font-semibold text-[#165A60]">{user?.role}</span>
            </div>

            <div className="p-3 bg-[#F6F5F0] rounded-[3px] border border-[#D7DEDA]">
              <span className="text-[10px] uppercase font-mono text-[#5C6F73] block mb-1">
                Status
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-[#376850]">
                <CheckCircle2 className="w-3 h-3" />
                Active Verified
              </span>
            </div>
          </div>
        </div>

        {/* Slice 1 Boundary Note */}
        <div className="border border-dashed border-[#D7DEDA] rounded-[3px] p-4 text-xs text-[#5C6F73] bg-[#FAF9F5]">
          <span className="font-semibold text-[#172E33]">Next Slice Notice:</span> The full
          Officer Workbench, Case Scrutiny, and Application Registers are deferred to Slice 2 per
          the specification. This page serves solely as the protected routing and authentication
          verification boundary.
        </div>
      </div>
    </div>
  );
};
