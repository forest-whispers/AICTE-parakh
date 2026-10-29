import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, ShieldCheck, UserCheck, Zap, Loader2 } from "lucide-react";
import { signInSchema, type SignInFormValues } from "../schemas/sign-in.schema";
import { useAuth } from "../hooks/use-auth";
import { Alert } from "../../../shared/ui/alert";
import { Input } from "../../../shared/ui/input";
import { Button } from "../../../shared/ui/button";
import type { ApiError } from "../../../shared/types/api.types";

interface SeededAccount {
  id: string;
  name: string;
  roleLabel: string;
  role: "MINISTRY_ADMIN" | "OFFICER";
  email: string;
  password: string;
  badge: string;
  scope: string;
  icon: typeof ShieldCheck;
}

const SEEDED_ACCOUNTS: SeededAccount[] = [
  {
    id: "admin",
    name: "Dr. Sanjay Sharma",
    roleLabel: "Ministry Administrator",
    role: "MINISTRY_ADMIN",
    email: "admin@aicte.gov.in",
    password: "Admin@AICTE2026!",
    badge: "Ministry Admin",
    scope: "National Portfolio Oversight",
    icon: ShieldCheck,
  },
  {
    id: "officer1",
    name: "Er. Rajiv Malhotra",
    roleLabel: "Senior Scrutiny Officer",
    role: "OFFICER",
    email: "officer1@aicte.gov.in",
    password: "Officer@AICTE2026!",
    badge: "Officer 1",
    scope: "Northern & Central Region",
    icon: UserCheck,
  },
  {
    id: "officer2",
    name: "Dr. Sunita Deshmukh",
    roleLabel: "Regional Scrutiny Officer",
    role: "OFFICER",
    email: "officer2@aicte.gov.in",
    password: "Officer@AICTE2026!",
    badge: "Officer 2",
    scope: "Western Regional Office",
    icon: UserCheck,
  },
];

type AuthStateView =
  | "IDLE"
  | "SUBMITTING"
  | "SUCCESS"
  | "INVALID_CREDENTIALS"
  | "LOCKED"
  | "SESSION_EXPIRED"
  | "SERVICE_ERROR";

interface LocationState {
  from?: {
    pathname?: string;
  };
}

export const SignInForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, sessionExpired, clearSessionExpired } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [authState, setAuthState] = useState<AuthStateView>(
    sessionExpired ? "SESSION_EXPIRED" : "IDLE"
  );
  const [serverErrorMessage, setServerErrorMessage] = useState<string>("");
  const [activeFastEmail, setActiveFastEmail] = useState<string | null>(null);

  const locState = location.state as LocationState | null;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onSubmit",
  });

  const isBusy = isSubmitting || authState === "SUBMITTING" || authState === "SUCCESS";

  const handleFastLogin = async (email: string, password: string) => {
    if (isBusy) return;
    setActiveFastEmail(email);
    setValue("email", email, { shouldValidate: true });
    setValue("password", password, { shouldValidate: true });
    await onSubmit({ email, password });
  };

  const onSubmit = async (values: SignInFormValues) => {
    try {
      setAuthState("SUBMITTING");
      setServerErrorMessage("");
      if (sessionExpired) {
        clearSessionExpired();
      }

      const authResult = await login(values);

      setAuthState("SUCCESS");

      const target =
        locState?.from?.pathname && locState.from.pathname !== "/sign-in"
          ? locState.from.pathname
          : authResult.user.role === "MINISTRY_ADMIN"
          ? "/ministry/portfolio"
          : "/officer/workbench";

      // Smooth transition into protected area matching Figma state reference
      setTimeout(() => {
        navigate(target, { replace: true });
      }, 750);
    } catch (err: unknown) {
      setActiveFastEmail(null);
      const apiErr = err as ApiError | undefined;
      const status = apiErr?.status;
      const message = apiErr?.message || "";

      if (status === 429 || message.toLowerCase().includes("locked")) {
        setAuthState("LOCKED");
        setServerErrorMessage(message);
      } else if (status === 401 || status === 403) {
        setAuthState("INVALID_CREDENTIALS");
        setServerErrorMessage(message);
      } else {
        // Network outage, 500 server error, or connection refused
        setAuthState("SERVICE_ERROR");
        setServerErrorMessage(message);
      }
    }
  };

  const hasFieldErrors = Boolean(errors.email || errors.password);

  return (
    <div className="w-full">
      {/* Dynamic Feedback Banner according to Figma State Reference */}
      <div className="mb-6">
        {hasFieldErrors && (
          <Alert variant="error" title={errors.email?.message || "Field validation required."}>
            Enter your email and password to continue.
          </Alert>
        )}

        {!hasFieldErrors && authState === "IDLE" && (
          <Alert variant="info" title="Authorized personnel only">
            Use your provisioned institutional account. Access is restricted to your assigned role and case scope.
          </Alert>
        )}

        {!hasFieldErrors && authState === "SUBMITTING" && (
          <div>
            <Alert variant="info" title="Verifying credentials...">
              Your request is being processed. Please wait.
            </Alert>
            <div className="mt-2 text-[10px] tracking-wider text-[#5C6F73] uppercase font-mono">
              PARAKH / AUTHORIZED PERSONNEL ONLY
            </div>
          </div>
        )}

        {!hasFieldErrors && authState === "SUCCESS" && (
          <div>
            <Alert variant="success" title="Identity verified.">
              Opening your role-specific workspace. Officer access is limited to assigned applications.
            </Alert>
            <div className="mt-2 text-[10px] tracking-wider text-[#5C6F73] uppercase font-mono">
              PARAKH / AUTHORIZED PERSONNEL ONLY
            </div>
          </div>
        )}

        {!hasFieldErrors && authState === "INVALID_CREDENTIALS" && (
          <div>
            <Alert variant="error" title="Email or password not recognized.">
              {serverErrorMessage.includes("deactivated")
                ? serverErrorMessage
                : "Check your credentials and try again. No account information is disclosed."}
            </Alert>
            <div className="mt-2 text-[10px] tracking-wider text-[#5C6F73] uppercase font-mono">
              PARAKH / AUTHORIZED PERSONNEL ONLY
            </div>
          </div>
        )}

        {!hasFieldErrors && authState === "LOCKED" && (
          <div>
            <Alert variant="warning" title="Too many unsuccessful attempts.">
              {serverErrorMessage || "Sign-in is temporarily unavailable. Follow your organization's account recovery process."}
            </Alert>
            <div className="mt-2 text-[10px] tracking-wider text-[#5C6F73] uppercase font-mono">
              PARAKH / AUTHORIZED PERSONNEL ONLY
            </div>
          </div>
        )}

        {!hasFieldErrors && authState === "SESSION_EXPIRED" && (
          <div>
            <Alert variant="warning" title="Your session has expired.">
              Reauthenticate to return to the protected workspace. No case content is shown on this screen.
            </Alert>
            <div className="mt-2 text-[10px] tracking-wider text-[#5C6F73] uppercase font-mono">
              PARAKH / AUTHORIZED PERSONNEL ONLY
            </div>
          </div>
        )}

        {!hasFieldErrors && authState === "SERVICE_ERROR" && (
          <div>
            <Alert variant="error" title="Sign-in service is unavailable.">
              Your credentials have not been validated. Retry when the service is available.
            </Alert>
            <div className="mt-2 text-[10px] tracking-wider text-[#5C6F73] uppercase font-mono">
              PARAKH / AUTHORIZED PERSONNEL ONLY
            </div>
          </div>
        )}
      </div>

      {/* Sign-in Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <Input
            label="Email address"
            type="email"
            placeholder="name@aicte.gov.in"
            autoComplete="username"
            disabled={isSubmitting || authState === "SUCCESS" || authState === "LOCKED"}
            error={errors.email?.message}
            {...register("email")}
          />
        </div>

        <div>
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            disabled={isSubmitting || authState === "SUCCESS" || authState === "LOCKED"}
            error={errors.password?.message}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="flex items-center gap-1.5 text-xs text-[#5C6F73] hover:text-[#172E33] focus:outline-none focus:text-[#165A60] px-1.5 py-1 transition-colors select-none"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Show</span>
                  </>
                )}
              </button>
            }
            {...register("password")}
          />
        </div>

        <div className="pt-2">
          {authState === "SUCCESS" ? (
            <Button
              type="button"
              disabled
              className="bg-[#376850] text-white opacity-90 cursor-wait text-[13px] px-4 py-2"
            >
              Opening workbench...
            </Button>
          ) : authState === "LOCKED" ? (
            <Button
              type="button"
              disabled
              className="bg-[#D7DEDA] text-[#5C6F73] cursor-not-allowed text-[13px] px-4 py-2"
            >
              Temporarily unavailable
            </Button>
          ) : authState === "SERVICE_ERROR" ? (
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="text-[13px] px-4 py-2"
            >
              Retry sign in
            </Button>
          ) : authState === "SESSION_EXPIRED" ? (
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="text-[13px] px-4 py-2"
            >
              Sign in again
            </Button>
          ) : (
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="text-[13px] px-4 py-2"
            >
              {isSubmitting ? (
                "Signing in..."
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1 inline-block" />
                </>
              )}
            </Button>
          )}
        </div>
      </form>

      {/* Fast Personnel Sign-In for Seeded Accounts */}
      <div className="mt-6 pt-5 border-t border-[#D7DEDA]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-[#165A60]" />
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#5C6F73] font-semibold">
              Fast Demo Sign-In
            </span>
          </div>
          <span className="text-[9px] text-[#7E9FA1] font-mono">1-CLICK</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {SEEDED_ACCOUNTS.map((acc) => {
            const Icon = acc.icon;
            const isLoggingThis = isBusy && activeFastEmail === acc.email;
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => handleFastLogin(acc.email, acc.password)}
                disabled={isBusy}
                title={`Fast Login as ${acc.name} (${acc.email})`}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded border text-xs font-medium transition-all ${
                  isLoggingThis
                    ? "bg-[#EBF4F5] border-[#165A60] text-[#165A60] shadow-sm"
                    : "bg-white hover:bg-[#F2F7F7] border-[#D7DEDA] hover:border-[#165A60] text-[#172E33]"
                } ${isBusy && !isLoggingThis ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {isLoggingThis ? (
                  <Loader2 className="w-3 h-3 animate-spin text-[#165A60] shrink-0" />
                ) : (
                  <Icon className="w-3 h-3 text-[#165A60] shrink-0" />
                )}
                <span className="truncate">{acc.badge}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
