"use client";

import {
  resolvePreviewTagClassName,
  resolvePreviewTagLabel,
} from "../../../utils/dict-tag-style";

interface DictTagPreviewFieldControlProps {
  formValues?: Record<string, unknown>;
}

export function DictTagPreviewFieldControl({ formValues }: DictTagPreviewFieldControlProps) {
  const label = resolvePreviewTagLabel(formValues?.itemLabel);
  const tagClassName = resolvePreviewTagClassName(formValues?.tone, formValues?.className);

  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/70 px-4 py-3">
      <div className="mb-2 text-xs font-medium text-muted-foreground">效果预览</div>
      <div className="flex flex-wrap items-center gap-3">
        <span className={tagClassName}>{label}</span>
        <code className="rounded-md bg-card px-2 py-1 text-xs text-muted-foreground">
          {tagClassName}
        </code>
      </div>
    </div>
  );
}
