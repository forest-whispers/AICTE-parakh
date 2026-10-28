import React, { useId } from "react";
import { cn } from "../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      rightElement,
      id,
      required,
      type = "text",
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const hasError = Boolean(error);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[13px] font-medium text-[#172E33] mb-1.5"
          >
            {label}
            {required && <span className="text-[#A14637] ml-0.5">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          <input
            ref={ref}
            id={inputId}
            type={type}
            required={required}
            aria-invalid={hasError ? "true" : "false"}
            aria-describedby={
              hasError ? errorId : helperText ? helperId : undefined
            }
            className={cn(
              "w-full bg-white text-[13px] text-[#172E33] placeholder:text-[#8A9B9D]",
              "rounded-[3px] border px-3 py-2.5 transition-colors",
              "focus:outline-none focus:ring-1",
              hasError
                ? "border-[#A14637] focus:border-[#A14637] focus:ring-[#A14637]"
                : "border-[#D7DEDA] focus:border-[#165A60] focus:ring-[#165A60]",
              rightElement ? "pr-20" : "",
              className
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-2 flex items-center">
              {rightElement}
            </div>
          )}
        </div>

        {hasError && (
          <p id={errorId} className="text-[12px] text-[#A14637] mt-1.5 font-normal">
            {error}
          </p>
        )}

        {!hasError && helperText && (
          <p id={helperId} className="text-[12px] text-[#5C6F73] mt-1.5">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
