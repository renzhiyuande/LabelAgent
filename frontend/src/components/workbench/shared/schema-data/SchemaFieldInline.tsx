import { getValueAtPath } from "@/low-code/utils/object-path";
import type { FormFieldSchema, OptionItem } from "@/low-code/schema/types";
import { cn } from "@/lib/utils";
import {
  SchemaFieldReadonlyBody,
  canRenderTemplateAlignedReadonlyField,
  resolveSchemaFieldFallbackText,
} from "./SchemaFieldReadonlyBody";

interface SchemaFieldInlineProps {
  field: FormFieldSchema;
  value: unknown;
  className?: string;
  context?: Record<string, unknown>;
  dictOptions?: Record<string, OptionItem[]>;
}

export function SchemaFieldInlineRow({ field, value, className, context, dictOptions = {} }: SchemaFieldInlineProps) {
  if (canRenderTemplateAlignedReadonlyField(field)) {
    return (
      <div
        className={cn(
          "border-b border-border/60 px-3 py-2.5 last:border-b-0",
          className,
        )}
      >
        <div className="mb-1.5 text-xs font-medium text-muted-foreground">{field.label}</div>
        <SchemaFieldReadonlyBody field={field} value={value} context={context} dictOptions={dictOptions} />
      </div>
    );
  }

  const text = resolveSchemaFieldFallbackText(field, value, dictOptions);
  const isLong = text.length > 80;

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(5.5rem,8rem)_1fr] items-start gap-x-3 gap-y-1 border-b border-border/60 px-3 py-2.5 last:border-b-0",
        className,
      )}
    >
      <span className="text-xs font-medium leading-5 text-muted-foreground">{field.label}</span>
      <span
        className={cn(
          "min-w-0 text-sm leading-6 text-foreground",
          isLong && "line-clamp-3",
        )}
        title={isLong ? text : undefined}
      >
        {text}
      </span>
    </div>
  );
}

interface SchemaFieldInlineListProps {
  fields: FormFieldSchema[];
  values: Record<string, unknown>;
  className?: string;
  context?: Record<string, unknown>;
  dictOptions?: Record<string, OptionItem[]>;
}

export function SchemaFieldInlineList({ fields, values, className, context, dictOptions = {} }: SchemaFieldInlineListProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border/70 bg-muted/40",
        className,
      )}
    >
      {fields.map((field) => {
        const path = field.path ?? field.key;
        const value = getValueAtPath(values, path);
        return (
          <SchemaFieldInlineRow
            key={field.key}
            field={field}
            value={value}
            context={context ?? values}
            dictOptions={dictOptions}
          />
        );
      })}
    </div>
  );
}
