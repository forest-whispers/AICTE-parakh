import React from "react";
import { cn } from "../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors select-none rounded-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-60";

    const variantStyles = {
      primary:
        "bg-[#165A60] text-white hover:bg-[#12494E] active:bg-[#0E393D] focus-visible:ring-[#165A60] border border-transparent shadow-subtle",
      secondary:
        "bg-white text-[#172E33] hover:bg-[#F6F5F0] border border-[#D7DEDA] active:bg-[#EAEFEA] focus-visible:ring-[#165A60]",
      danger:
        "bg-[#A14637] text-white hover:bg-[#8A372A] active:bg-[#722B20] focus-visible:ring-[#A14637] border border-transparent",
      ghost:
        "bg-transparent text-[#172E33] hover:bg-[#EBF2F1] hover:text-[#165A60] focus-visible:ring-[#165A60]",
    };

    const sizeStyles = {
      sm: "text-xs px-2.5 py-1.5 gap-1.5 h-7",
      md: "text-[13px] px-4 py-2 gap-2 h-9",
      lg: "text-sm px-5 py-2.5 gap-2.5 h-10",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-0.5 h-3.5 w-3.5 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
