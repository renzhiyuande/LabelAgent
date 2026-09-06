"use client";

import type { FormEvent } from "react";
import { cn } from "../../lib/utils";
import type { AuthenticatedUser } from "../../lib/types";
import type { OptionItem, ResourceMeta } from "../../schema/types";
import { isFormSectionVisible } from "../../utils/form-field-mode";
import { useResourceFormEngine, type ResourceFormContext } from "./use-resource-form-engine";

export type { ResourceFormContext };

interface ResourceFormProps {
  resource: ResourceMeta;
  mode: "create" | "edit" | "assignment";
  values: Record<string, unknown>;
  currentUser?: AuthenticatedUser | null;
  formId: string;
  onChange: (key: string, value: unknown) => void;
  onSubmit: () => Promise<void>;
  loadRemoteOptions: (source: string, query?: string | import("../../schema/types").RemoteOptionQuery) => Promise<OptionItem[]>;
  formContext?: ResourceFormContext;
  fieldErrors?: Record<string, string>;
  onFieldErrorsChange?: (errors: Record<string, string>) => void;
  variant?: "default" | "labeler-annotate" | "labeler-display";
}

export function LHResourceForm({
  resource,
  mode,
  values,
  currentUser = null,
  formId,
  onChange,
  onSubmit,
  loadRemoteOptions,
  formContext,
  fieldErrors,
  onFieldErrorsChange,
  variant = "default",
}: ResourceFormProps) {
  const filterEmptySections = variant === "labeler-annotate" || variant === "labeler-display";

  const engine = useResourceFormEngine({
    resource,
    mode,
    values,
    currentUser,
    onChange,
    onSubmit,
    loadRemoteOptions,
    formContext,
    fieldErrors,
    onFieldErrorsChange,
  });

  return (
    <form
      id={formId}
      className={cn(
        "lh-drawer-form lh-resource-form",
        variant === "labeler-annotate" && "lh-labeler-annotate-form",
        variant === "labeler-display" && "lh-labeler-display-form",
      )}
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void engine.handleSubmit();
      }}
    >
      {engine.introText ? <div className="lh-drawer-callout">{engine.introText}</div> : null}
      {resource.form.sections.map((section) => {
        if (!isFormSectionVisible(section, mode)) {
          return null;
        }
        const sectionFields = section.fields
          .map((field) => engine.renderFormField(field))
          .filter((node) => node != null);

        if (filterEmptySections && sectionFields.length === 0) {
          return null;
        }

        return (
          <section
            className={cn(
              "lh-form-section",
              (variant === "labeler-annotate" || variant === "labeler-display") && "lh-labeler-form-section",
            )}
            key={section.key}
          >
            {section.title ? <h3>{section.title}</h3> : null}
            {section.description ? <p>{section.description}</p> : null}
            <div className="lh-form-grid">{sectionFields}</div>
          </section>
        );
      })}
    </form>
  );
}
