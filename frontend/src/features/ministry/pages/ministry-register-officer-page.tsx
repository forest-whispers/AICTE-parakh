import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiClient } from "../../../shared/api/client";
import { Button } from "../../../shared/ui/button";
import { Eye, EyeOff, ShieldCheck, UserCheck, KeyRound, Building2 } from "lucide-react";

interface RegisteredOfficerData {
  id: string;
  name: string;
  email: string;
  role: string;
  designation: string;
  department: string | null;
  isActive: boolean;
  createdAt: string;
}

export const MinistryRegisterOfficerPage: React.FC = () => {
  const navigate = useNavigate();

  // Form field states
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [designation, setDesignation] = useState<string>("Scrutiny Officer (Tech/Eng)");
  const [department, setDepartment] = useState<string>("Engineering & Technology");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Form status states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredOfficer, setRegisteredOfficer] = useState<RegisteredOfficerData | null>(null);

  // Inline field validation states
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const nameError = touched.name && !name.trim() ? "Officer full name is required." : null;
  const emailError =
    touched.email && (!email.trim() || !validateEmail(email))
      ? "A valid official email address is required."
      : null;
  const passwordError =
    touched.password && (!password || password.length < 8)
      ? "Initial password must be at least 8 characters long."
      : null;
  const designationError =
    touched.designation && !designation.trim() ? "Officer designation is required." : null;

  const isFormValid =
    name.trim().length > 0 &&
    validateEmail(email) &&
    password.length >= 8 &&
    designation.trim().length > 0;

  const handleGeneratePassword = () => {
    const chars = "abcdefghijkmnpqrstuvwxyz23456789";
    const special = "@#$!";
    let gen = "A1";
    for (let i = 0; i < 8; i++) {
      gen += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    gen += special.charAt(Math.floor(Math.random() * special.length));
    setPassword(gen);
    setShowPassword(true);
    setTouched((prev) => ({ ...prev, password: true }));
  };

  const handleResetForm = () => {
    setName("");
    setEmail("");
    setDesignation("Scrutiny Officer (Tech/Eng)");
    setDepartment("Engineering & Technology");
    setPassword("");
    setTouched({});
    setErrorMessage(null);
    setRegisteredOfficer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({
      name: true,
      email: true,
      password: true,
      designation: true,
    });

    if (!isFormValid) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await apiClient<{
        success: boolean;
        message?: string;
        data: RegisteredOfficerData;
      }>("/ministry/officers", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          designation: designation.trim(),
          department: department.trim() || undefined,
        }),
      });

      if (response && response.success && response.data) {
        setRegisteredOfficer(response.data);
      } else {
        setErrorMessage("Failed to register officer. Please review form inputs.");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to register officer. Please retry.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-6 select-none">
      {/* Page Header */}
      <div className="mb-6">
        <div className="text-[10px] font-mono tracking-wider uppercase text-[#5C6F73] mb-1 flex items-center gap-2">
          <span>MINISTRY</span>
          <span>/</span>
          <span>DESK OPERATIONS</span>
          <span>/</span>
          <span className="text-[#165A60] font-semibold">REGISTER OFFICER</span>
        </div>
        <h1 className="text-[28px] font-bold text-[#172E33] tracking-tight m-0">
          Register new officer
        </h1>
        <p className="text-[13px] text-[#5C6F73] mt-1 m-0">
          Provision authorized scrutiny personnel to evaluate institutional applications, perform evidence review, and execute compliance checks.
        </p>
      </div>

      {/* Success View */}
      {registeredOfficer ? (
        <div className="bg-white border border-[#C8E6C9] rounded-[3px] shadow-sm p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[#EAF3EE] text-[#245E3F] flex items-center justify-center shrink-0 border border-[#C8E6C9]">
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#245E3F] font-bold block">
                ACCOUNT CREATED SUCCESSFULLY
              </span>
              <h2 className="text-xl font-bold text-[#172E33] mt-1 m-0">
                {registeredOfficer.name}
              </h2>
              <p className="text-[13px] text-[#5C6F73] mt-1 leading-relaxed">
                The officer account is active and provisioned with statutory scrutiny authority.
              </p>

              {/* Account Particulars Card */}
              <div className="mt-5 p-4 bg-[#FAFAF8] border border-[#D7DEDA] rounded-[2px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#8A9B9D] block">
                    OFFICIAL EMAIL
                  </span>
                  <span className="font-mono text-[#172E33] mt-0.5 block truncate">
                    {registeredOfficer.email}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#8A9B9D] block">
                    SYSTEM ROLE
                  </span>
                  <span className="font-mono text-[#165A60] font-semibold mt-0.5 block">
                    {registeredOfficer.role}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#8A9B9D] block">
                    DESIGNATION
                  </span>
                  <span className="font-medium text-[#172E33] mt-0.5 block truncate">
                    {registeredOfficer.designation}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#8A9B9D] block">
                    DEPARTMENT / BUREAU
                  </span>
                  <span className="text-[#5C6F73] mt-0.5 block truncate">
                    {registeredOfficer.department || "General Administration"}
                  </span>
                </div>
              </div>

              {/* Sign-In Guidance Notice */}
              <div className="mt-4 p-3 bg-[#EAEFEF] border border-[#165A60]/30 rounded-[2px] text-xs text-[#165A60] leading-relaxed flex items-start gap-2.5">
                <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Immediate Sign-In Instructions:</strong>
                  The officer can now sign in immediately at the PARAKH login page (
                  <Link to="/sign-in" className="underline font-medium hover:text-[#122B30]">
                    /sign-in
                  </Link>
                  ) using their official email address (<code>{registeredOfficer.email}</code>) and the initial password configured during registration.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={handleResetForm}
                  className="bg-[#165A60] hover:bg-[#122B30] text-white text-xs font-medium px-4 py-2 rounded-[3px] shadow-xs"
                >
                  Register another officer
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate("/ministry/allocation")}
                  className="text-xs font-medium px-4 py-2 bg-white border-[#D7DEDA] text-[#172E33] hover:bg-[#FAFAF8]"
                >
                  Go to Allocation queue →
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate("/ministry/portfolio")}
                  className="text-xs text-[#5C6F73] hover:text-[#172E33]"
                >
                  Portfolio overview
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Form View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Registration Form (8 cols) */}
          <div className="lg:col-span-8 bg-white border border-[#D7DEDA] rounded-[2px] shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-[#FAFAF8] border-b border-[#D7DEDA]">
              <h2 className="text-[15px] font-bold text-[#172E33] m-0">
                Officer credentials &amp; statutory assignment
              </h2>
              <p className="text-[12px] text-[#5C6F73] mt-0.5 m-0">
                All fields marked with an asterisk (<span className="text-[#9E2A2B]">*</span>) are mandatory. Accounts are automatically provisioned with active status.
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="mx-6 mt-4 p-3 bg-[#FDF2F2] border border-[#E8C5C5] rounded-[2px] text-[#9E2A2B] text-xs">
                <span className="font-bold">Registration error:</span> {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#172E33] font-semibold mb-1">
                  Full Name <span className="text-[#9E2A2B]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                  disabled={isSubmitting}
                  placeholder="e.g. Dr. Sneha Patil"
                  className={`w-full text-xs px-3 py-2 border rounded-[2px] text-[#172E33] bg-[#FAFAF8] focus:bg-white focus:outline-none transition-colors ${
                    nameError ? "border-[#9E2A2B]" : "border-[#D7DEDA] focus:border-[#165A60]"
                  }`}
                />
                {nameError && (
                  <span className="text-[11px] text-[#9E2A2B] mt-0.5 block">{nameError}</span>
                )}
              </div>

              {/* Official Email */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#172E33] font-semibold mb-1">
                  Official Email Address <span className="text-[#9E2A2B]">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                  disabled={isSubmitting}
                  placeholder="e.g. sneha.patil@aicte.gov.in"
                  className={`w-full text-xs px-3 py-2 border rounded-[2px] text-[#172E33] bg-[#FAFAF8] focus:bg-white focus:outline-none transition-colors ${
                    emailError ? "border-[#9E2A2B]" : "border-[#D7DEDA] focus:border-[#165A60]"
                  }`}
                />
                <span className="text-[10px] text-[#8A9B9D] mt-0.5 block">
                  Must be unique. This email serves as the officer&apos;s username for signing in.
                </span>
                {emailError && (
                  <span className="text-[11px] text-[#9E2A2B] mt-0.5 block">{emailError}</span>
                )}
              </div>

              {/* Designation & Department Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Designation */}
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#172E33] font-semibold mb-1">
                    Designation / Title <span className="text-[#9E2A2B]">*</span>
                  </label>
                  <select
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, designation: true }))}
                    disabled={isSubmitting}
                    className="w-full text-xs px-2.5 py-2 border border-[#D7DEDA] rounded-[2px] text-[#172E33] bg-[#FAFAF8] focus:bg-white focus:outline-none focus:border-[#165A60] cursor-pointer"
                  >
                    <option value="Scrutiny Officer (Tech/Eng)">Scrutiny Officer (Tech/Eng)</option>
                    <option value="Senior Scrutiny Officer">Senior Scrutiny Officer</option>
                    <option value="Technical Scrutiny Officer">Technical Scrutiny Officer</option>
                    <option value="Statutory Evaluation Officer">Statutory Evaluation Officer</option>
                    <option value="Regional Verification Officer">Regional Verification Officer</option>
                  </select>
                  {designationError && (
                    <span className="text-[11px] text-[#9E2A2B] mt-0.5 block">{designationError}</span>
                  )}
                </div>

                {/* Department / Bureau */}
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#172E33] font-semibold mb-1">
                    Department / Bureau
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full text-xs px-2.5 py-2 border border-[#D7DEDA] rounded-[2px] text-[#172E33] bg-[#FAFAF8] focus:bg-white focus:outline-none focus:border-[#165A60] cursor-pointer"
                  >
                    <option value="Engineering & Technology">Engineering &amp; Technology</option>
                    <option value="Management Studies">Management (MBA/PGDM)</option>
                    <option value="Pharmacy & Healthcare">Pharmacy &amp; Healthcare</option>
                    <option value="Architecture & Planning">Architecture &amp; Planning</option>
                    <option value="Bureau of Approval">Bureau of Approval</option>
                    <option value="General Administration">General Administration</option>
                  </select>
                </div>
              </div>

              {/* Initial Password Configuration */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#172E33] font-semibold">
                    Initial Account Password <span className="text-[#9E2A2B]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    disabled={isSubmitting}
                    className="text-[11px] text-[#165A60] hover:underline font-medium cursor-pointer"
                  >
                    ⚡ Generate secure password
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                    disabled={isSubmitting}
                    placeholder="Enter initial password (min. 8 characters)..."
                    className={`w-full text-xs px-3 py-2 pr-10 border rounded-[2px] text-[#172E33] bg-[#FAFAF8] focus:bg-white focus:outline-none transition-colors font-mono ${
                      passwordError ? "border-[#9E2A2B]" : "border-[#D7DEDA] focus:border-[#165A60]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-2.5 text-[#8A9B9D] hover:text-[#172E33]"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-[#8A9B9D] mt-0.5 block">
                  Password will be hashed securely with scrypt. Securely communicate this initial credential to the officer.
                </span>
                {passwordError && (
                  <span className="text-[11px] text-[#9E2A2B] mt-0.5 block">{passwordError}</span>
                )}
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-[#D7DEDA] flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleResetForm}
                  disabled={isSubmitting}
                  className="text-xs px-3.5 py-2 border-[#D7DEDA] text-[#172E33] bg-white hover:bg-[#FAFAF8]"
                >
                  Clear form
                </Button>

                <Button
                  type="submit"
                  disabled={!isFormValid || isSubmitting}
                  className={`text-xs font-medium px-5 py-2 rounded-[3px] shadow-xs inline-flex items-center gap-1.5 transition-colors ${
                    isFormValid && !isSubmitting
                      ? "bg-[#165A60] hover:bg-[#122B30] text-white cursor-pointer"
                      : "bg-[#D7DEDA] text-[#8A9B9D] cursor-not-allowed"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <span className="inline-block animate-spin mr-1">◌</span>
                      Registering officer...
                    </>
                  ) : (
                    "Register officer →"
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column: Statutory & Governance Guidelines (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Card 1: Enforced Officer Role */}
            <div className="bg-white border border-[#D7DEDA] rounded-[2px] p-4 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-[#165A60]">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#172E33]">
                  Enforced Officer Role
                </span>
              </div>
              <p className="text-xs text-[#5C6F73] leading-relaxed m-0">
                All personnel accounts created via this administrative panel are strictly bound to the <strong>OFFICER</strong> role on the server. Officer accounts have authority to inspect assigned applications, verify evidence, and record scrutiny findings.
              </p>
            </div>

            {/* Card 2: Initial Credential Delivery */}
            <div className="bg-white border border-[#D7DEDA] rounded-[2px] p-4 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-[#165A60]">
                <Building2 className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#172E33]">
                  Immediate Activation
                </span>
              </div>
              <p className="text-xs text-[#5C6F73] leading-relaxed m-0">
                Registered officers are activated immediately. Once registered, the officer can log in at the PARAKH portal with their email and password, and will appear in the Ministry Allocation Queue for case assignment.
              </p>
            </div>

            {/* Card 3: Quick Navigation */}
            <div className="bg-[#FAFAF8] border border-[#D7DEDA] rounded-[2px] p-4 space-y-2 text-xs">
              <span className="text-[10px] font-mono uppercase text-[#8A9B9D] font-bold block">
                ADMINISTRATIVE WORKFLOWS
              </span>
              <ul className="space-y-1.5 list-none p-0 m-0">
                <li>
                  <Link
                    to="/ministry/allocation"
                    className="text-[#165A60] hover:underline font-medium"
                  >
                    → Allocation queue
                  </Link>
                </li>
                <li>
                  <Link
                    to="/ministry/portfolio"
                    className="text-[#165A60] hover:underline font-medium"
                  >
                    → Portfolio overview
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Footer Legal Note */}
      <div className="text-center text-[11px] text-[#8A9B9D] mt-12 pb-6 border-t border-[#D7DEDA]/40 pt-4">
        Statutory Processing Portal · AICTE Approval Process Handbook (APH) 2026–27 · Ministry Administrative Oversight.
      </div>
    </div>
  );
};
