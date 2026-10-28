import React from "react";
import { cn } from "../lib/utils";

export type AlertVariant = "info" | "error" | "warning" | "success";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  children?: React.ReactNode;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "info", title, children, ...props }, ref) => {
    const variantStyles: Record<AlertVariant, { container: string; title: string; body: string }> = {
      info: {
        container: "bg-[#EBF2F1] border-l-4 border-[#165A60]",
        title: "text-[#172E33]",
        body: "text-[#3D5459]",
      },
      error: {
        container: "bg-[#FBEBE8] border-l-4 border-[#A14637]",
        title: "text-[#172E33]",
        body: "text-[#5A332C]",
      },
      warning: {
        container: "bg-[#F8F3E8] border-l-4 border-[#94631F]",
        title: "text-[#172E33]",
        body: "text-[#5C4524]",
      },
      success: {
        container: "bg-[#EEF4F1] border-l-4 border-[#376850]",
        title: "text-[#172E33]",
        body: "text-[#284A3B]",
      },
    };

    const current = variantStyles[variant];

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "rounded-[3px] p-3 text-[13px] leading-relaxed transition-all",
          current.container,
          className
        )}
        {...props}
      >
        {title && (
          <h4 className={cn("font-semibold text-[13px] mb-0.5", current.title)}>
            {title}
          </h4>
        )}
        {children && <div className={cn("text-[13px]", current.body)}>{children}</div>}
      </div>
    );
  }
);

Alert.displayName = "Alert";
