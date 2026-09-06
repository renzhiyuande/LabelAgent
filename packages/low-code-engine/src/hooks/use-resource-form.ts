import { useEffect, useState } from "react";
import type { ResourceMeta } from "../schema/types";
import type { ResourceListScope } from "../utils/list-scope";
import { setValueAtPath } from "../utils/object-path";
import { collectSectionDefaults, mergeFormValues } from "../utils/form-values";

function collectDefaults(resource: ResourceMeta): Record<string, unknown> {
  return collectSectionDefaults(resource.form.sections);
}

export function useResourceForm(
  resource: ResourceMeta,
  mode: "create" | "edit",
  record: Record<string, unknown> | null,
  open: boolean,
  scope?: ResourceListScope,
) {
  const [values, setValues] = useState<Record<string, unknown>>(() => collectDefaults(resource));

  useEffect(() => {
    if (!open) {
      return;
    }
    const defaults = collectDefaults(resource);
    if (mode === "edit" && record) {
      setValues(mergeFormValues(defaults, record));
      return;
    }
    if (record) {
      setValues(mergeFormValues(defaults, record));
      return;
    }
    if (mode === "create" && scope) {
      setValues(setValueAtPath(defaults, scope.field, scope.value));
      return;
    }
    setValues(defaults);
  }, [mode, open, record, resource, scope]);

  return {
    values,
    setValues,
  };
}
