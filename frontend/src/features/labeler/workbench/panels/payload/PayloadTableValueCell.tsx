import { Badge } from "@/components/ui/badge";
import { formatSchemaDisplayValue } from "@/components/workbench";

function normalizeArrayTagLabels(value: unknown[]): string[] {
  return value.map((item) => {
    if (item == null || item === "") {
      return "—";
    }
    if (typeof item === "object") {
      return JSON.stringify(item);
    }
    return String(item);
  });
}

export function PayloadTableValueCell({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-slate-400">—</span>;
    }

    return (
      <div className="flex flex-wrap gap-1.5">
        {normalizeArrayTagLabels(value).map((label, index) => (
          <Badge key={`${label}-${index}`} variant="secondary" className="max-w-full truncate font-normal">
            {label}
          </Badge>
        ))}
      </div>
    );
  }

  const text = formatSchemaDisplayValue(value);
  const isMultiline = text.includes("\n");

  if (isMultiline) {
    return (
      <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-900 dark:text-slate-50">
        {text}
      </pre>
    );
  }

  return <span className="break-words text-slate-900 dark:text-slate-50">{text}</span>;
}
