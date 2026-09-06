import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { FormFieldSchema, OptionItem } from "@/low-code/schema/types";
import {
  SchemaFieldReadonlyBody,
  canRenderTemplateAlignedReadonlyField,
  resolveSchemaFieldFallbackText,
} from "./SchemaFieldReadonlyBody";

interface SchemaFieldCardProps {
  field: FormFieldSchema;
  value: unknown;
  context?: Record<string, unknown>;
  dictOptions?: Record<string, OptionItem[]>;
}

export function SchemaFieldCard({ field, value, context, dictOptions = {} }: SchemaFieldCardProps) {
  const [expanded, setExpanded] = useState(false);
  const useTemplateControl = canRenderTemplateAlignedReadonlyField(field);

  if (useTemplateControl) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
        <div className="mb-2 text-xs font-medium text-muted-foreground">{field.label}</div>
        <SchemaFieldReadonlyBody field={field} value={value} context={context} dictOptions={dictOptions} />
      </div>
    );
  }

  const text = resolveSchemaFieldFallbackText(field, value, dictOptions);
  const isLong = typeof value === "string" && value.length > 120;
  const isJson = typeof value === "object" && value !== null;
  const collapsible = isJson || isLong;

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
      <div className="mb-2 text-xs font-medium text-muted-foreground">{field.label}</div>
      {collapsible ? (
        <>
          <pre
            className={
              expanded
                ? "max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-background/80 p-2.5 text-sm leading-6 text-foreground"
                : "line-clamp-4 whitespace-pre-wrap break-words rounded-md bg-background/80 p-2.5 text-sm leading-6 text-foreground"
            }
          >
            {text}
          </pre>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 h-7 px-2 text-xs text-muted-foreground"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? "收起" : "展开全文"}
          </Button>
        </>
      ) : (
        <p className="text-sm leading-6 text-foreground">{text}</p>
      )}
    </div>
  );
}
