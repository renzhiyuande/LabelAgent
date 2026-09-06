"use client";

import { useMemo, type FormEvent } from "react";
import type { OptionItem, PromptFormSchema, RemoteOptionQuery } from "../../schema/types";
import { useResourceFormEngine } from "./use-resource-form-engine";
import { buildSyntheticPromptResource } from "../../utils/prompt-form-utils";

interface LHPromptFormProps {
  schema: PromptFormSchema;
  formId: string;
  values: Record<string, unknown>;
  fieldErrors?: Record<string, string>;
  onChange: (key: string, value: unknown) => void;
  onSubmit: () => Promise<void>;
  onFieldErrorsChange?: (errors: Record<string, string>) => void;
  loadRemoteOptions: (source: string, query?: string | RemoteOptionQuery) => Promise<OptionItem[]>;
}

export function LHPromptForm({
  schema,
  formId,
  values,
  fieldErrors,
  onChange,
  onSubmit,
  onFieldErrorsChange,
  loadRemoteOptions,
}: LHPromptFormProps) {
  const syntheticResource = useMemo(() => buildSyntheticPromptResource(schema), [schema]);

  const engine = useResourceFormEngine({
    resource: syntheticResource,
    mode: "create",
    values,
    onChange,
    onSubmit,
    loadRemoteOptions,
    fieldErrors,
    onFieldErrorsChange,
  });

  return (
    <form
      id={formId}
      className="lh-prompt-form"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void engine.handleSubmit();
      }}
    >
      <div className="lh-prompt-form-grid">
        {schema.fields.map((field) => engine.renderFormField(field, "lh-form-field--full"))}
      </div>
    </form>
  );
}
