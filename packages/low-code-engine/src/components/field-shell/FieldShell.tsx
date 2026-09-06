"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

interface FieldShellProps {
  label: string;
  required?: boolean;
  description?: string;
  error?: string;
  variant: "form" | "query";
  className?: string;
  queryProps?: HTMLAttributes<HTMLDivElement>;
  children: ReactNode;
}

export function FieldShell({
  label,
  required = false,
  description,
  error,
  variant,
  className,
  queryProps,
  children,
}: FieldShellProps) {
  if (variant === "query") {
    return (
      <div className={cn("lh-query-item", className)} {...queryProps}>
        <span>{label}</span>
        {children}
      </div>
    );
  }

  return (
    <div className={cn("lh-form-field", className)}>
      <span className="lh-field-label">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
      {error ? <small className="text-sm text-rose-500">{error}</small> : null}
      {description ? <small className="lh-field-description">{description}</small> : null}
    </div>
  );
}
