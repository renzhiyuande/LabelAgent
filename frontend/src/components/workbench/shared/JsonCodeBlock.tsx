import { cn } from "@/lib/utils";

interface JsonCodeBlockProps {
  value: unknown;
  title?: string;
  className?: string;
  maxHeight?: string;
}

export function JsonCodeBlock({ value, title, className, maxHeight = "max-h-80" }: JsonCodeBlockProps) {
  const text =
    typeof value === "string"
      ? value
      : value == null
        ? ""
        : JSON.stringify(value, null, 2);

  return (
    <div className={cn("rounded-xl border border-border/80 bg-card/95 p-3", className)}>
      {title ? (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{title}</p>
      ) : null}
      <pre
        className={cn(
          "overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-2.5 font-mono text-xs leading-5 text-foreground",
          maxHeight,
        )}
      >
        {text || "—"}
      </pre>
    </div>
  );
}
