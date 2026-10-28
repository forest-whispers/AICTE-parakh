import React from "react";
import { cn } from "../lib/utils";

export type BadgeVariant =
  | "critical"
  | "high"
  | "medium"
  | "advisory"
  | "info"
  | "pass"
  | "neutral";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "neutral",
  size = "md",
  children,
  ...props
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    critical: "bg-[#FBEBE8] text-[#A14637] border-[#E9CDC8]",
    high: "bg-[#FDF3E7] text-[#94631F] border-[#EED9BC]",
    medium: "bg-[#EBF2F1] text-[#165A60] border-[#CCE0DC]",
    advisory: "bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]",
    info: "bg-[#EEF4F8] text-[#2563EB] border-[#D0E1FD]",
    pass: "bg-[#EEF4F1] text-[#376850] border-[#C7DCD1]",
    neutral: "bg-white text-[#5C6F73] border-[#D7DEDA]",
  };

  const sizeStyles = {
    sm: "text-[10px] px-1.5 py-0.5 leading-tight font-mono",
    md: "text-[11px] px-2 py-0.5 leading-tight font-mono font-medium",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[2px] border uppercase tracking-wider select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
