import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SignInForm } from "../components/sign-in-form";
import { useAuth } from "../hooks/use-auth";

export const SignInPage: React.FC = () => {
  const { user, isAuthenticated, isInitialLoading } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to appropriate role area
  useEffect(() => {
    if (!isInitialLoading && isAuthenticated) {
      if (user?.role === "MINISTRY_ADMIN") {
        navigate("/ministry/portfolio", { replace: true });
      } else {
        navigate("/officer/workbench", { replace: true });
      }
    }
  }, [isAuthenticated, isInitialLoading, user, navigate]);

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F6F5F0]">
      {/* Left Column: Institutional Brand & Context (Per Figma Reference 02) */}
      <div className="w-full lg:w-[48%] bg-[#122B30] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#165A60]/30 min-h-[420px] lg:min-h-screen">
        {/* Top Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white m-0">
            PARAKH
          </h1>
          <p className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.2em] text-[#7E9FA1] mt-4 mb-2">
            AICTE / AUTHORIZED OPERATIONS
          </p>
          <div className="w-10 h-0.5 bg-[#4D777B]" />

          {/* Hero Statement */}
          <div className="mt-12 sm:mt-16">
            <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-semibold text-white tracking-tight leading-[1.25] m-0">
              Application processing.
              <br />
              Evidence-led validation.
            </h2>
            <p className="mt-4 text-xs sm:text-[13px] text-[#98B2B4] leading-relaxed max-w-md">
              A focused workspace for authorized officers and ministry administrators to review
              institutional applications, inspect evidence and coordinate scrutiny.
            </p>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 lg:mt-0 pt-8 border-t border-[#1F3D43]">
          <ul className="space-y-2.5 text-xs text-[#B5C8C9] font-mono list-none p-0 m-0">
            <li>01 Structured document processing</li>
            <li>02 Human-led regulatory scrutiny</li>
            <li>03 Traceable verification and oversight</li>
          </ul>
          <p className="text-[11px] text-[#7E9FA1] mt-6 leading-relaxed max-w-sm">
            Decision support only. Automated observations assist authorized human scrutiny; they do
            not approve or reject institutions.
          </p>
        </div>
      </div>

      {/* Right Column: Authentication Form Panel */}
      <div className="w-full lg:w-[52%] flex flex-col justify-between p-6 sm:p-12 lg:p-16 bg-[#F6F5F0]">
        <div className="max-w-[460px] w-full mx-auto my-auto py-6">
          {/* Form Header */}
          <div className="mb-8">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.18em] text-[#5C6F73] block mb-2 font-medium">
              SECURE PERSONNEL ACCESS
            </span>
            <h2 className="text-2xl sm:text-[26px] font-bold text-[#172E33] tracking-tight m-0">
              Sign in to PARAKH
            </h2>
            <p className="text-[13px] text-[#5C6F73] mt-1.5 m-0">
              AICTE Application Processing and Validation Platform
            </p>
          </div>

          {/* Interactive Form Component */}
          <SignInForm />

          {/* Administrative Notice Divider */}
          <div className="border-t border-[#D7DEDA] my-8" />

          {/* Institutional Provisioning Notice */}
          <div className="text-[12px] text-[#5C6F73] leading-relaxed">
            Access is provisioned by your administrator. There is no public registration. Contact your
            designated IT support team if you cannot access your account.
          </div>
        </div>

        {/* Footer Metadata */}
        <div className="max-w-[460px] w-full mx-auto pt-6 text-[10px] font-mono tracking-widest text-[#8A9B9D] uppercase">
          PARAKH / PERSONNEL WORKSPACE / 2026
        </div>
      </div>
    </div>
  );
};
