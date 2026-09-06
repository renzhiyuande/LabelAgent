"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { FieldShell } from "../field-shell/FieldShell";
import { FieldControlRenderer } from "./FieldControlRenderer";
import type { BaseFieldViewModel, SharedFieldHandlers } from "./types";

interface SharedFieldProps {
  model: BaseFieldViewModel;
  handlers: SharedFieldHandlers;
  className?: string;
  queryProps?: HTMLAttributes<HTMLDivElement>;
  children?: ReactNode;
}

export function SharedField({ model, handlers, className, queryProps, children }: SharedFieldProps) {
  return (
    <FieldShell
      variant={model.uiVariant === "table" ? "form" : model.uiVariant}
      label={model.label}
      required={model.required}
      description={model.description}
      error={model.error}
      className={className}
      queryProps={queryProps}
    >
      {children ?? <FieldControlRenderer model={model} handlers={handlers} />}
    </FieldShell>
  );
}
