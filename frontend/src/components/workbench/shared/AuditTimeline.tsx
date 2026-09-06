import { cn } from "@/lib/utils";

export interface AuditTimelineEntry {
  id: string;
  stage: string;
  label: string;
  detail?: string;
  timestamp: string;
  tone?: "default" | "success" | "warning" | "destructive";
}

export type AuditTimelineVariant = "default" | "compact" | "rail";

interface AuditTimelineProps {
  entries: AuditTimelineEntry[];
  className?: string;
  title?: string;
  variant?: AuditTimelineVariant;
}

const TONE_DOT: Record<NonNullable<AuditTimelineEntry["tone"]>, string> = {
  default: "bg-muted-foreground",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  destructive: "bg-rose-500",
};

export function AuditTimeline({ entries, className, title, variant = "default" }: AuditTimelineProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无记录</p>;
  }

  if (variant === "rail") {
    return (
      <div className={cn("flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto px-1 py-2 lh-workbench-rail-scroll", className)}>
        <ol className="relative flex flex-col items-center gap-2">
          {entries.map((entry, index) => {
            const tone = entry.tone ?? "default";
            const isLast = index === entries.length - 1;
            return (
              <li key={entry.id} className="relative flex flex-col items-center">
                {!isLast ? (
                  <span className="absolute top-3 h-[calc(100%+0.25rem)] w-px bg-border" />
                ) : null}
                <span
                  className={cn(
                    "relative z-[1] h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background",
                    TONE_DOT[tone],
                  )}
                  title={`${entry.label}${entry.detail ? ` · ${entry.detail}` : ""}\n${entry.timestamp}`}
                />
              </li>
            );
          })}
        </ol>
        <span className="text-[10px] font-medium text-muted-foreground">{entries.length} 步</span>
      </div>
    );
  }

  const compact = variant === "compact";

  return (
    <section
      className={cn(
        compact
          ? "space-y-0"
          : "rounded-xl border border-border/80 bg-card/90 p-3",
        className,
      )}
    >
      {title ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{title}</p>
      ) : null}
      <ol className={cn("relative space-y-0", title ? "mt-3" : undefined)}>
        {entries.map((entry, index) => {
          const tone = entry.tone ?? "default";
          const isLast = index === entries.length - 1;
          return (
            <li key={entry.id} className={cn("relative flex gap-3", compact ? "pb-2.5 last:pb-0" : "pb-4 last:pb-0")}>
              {!isLast ? (
                <span className="absolute left-[5px] top-3 h-[calc(100%-4px)] w-px bg-border" />
              ) : null}
              <span
                className={cn(
                  "relative z-[1] mt-1.5 shrink-0 rounded-full ring-2 ring-background",
                  compact ? "h-2 w-2" : "h-2.5 w-2.5",
                  TONE_DOT[tone],
                )}
              />
              <div className="min-w-0 flex-1">
                <div className={cn("flex min-w-0 flex-wrap items-center gap-2", compact && "gap-1.5")}>
                  {!compact ? (
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {entry.stage}
                    </span>
                  ) : null}
                  <span className={cn("font-medium text-foreground", compact ? "text-xs" : "text-sm")}>
                    {entry.label}
                  </span>
                  <span className={cn("text-muted-foreground", compact ? "text-[10px]" : "text-[11px]")}>{entry.timestamp}</span>
                </div>
                {entry.detail ? (
                  <p
                    className={cn(
                      "leading-5 text-muted-foreground",
                      compact ? "mt-0.5 line-clamp-2 text-[11px]" : "mt-1 text-xs",
                    )}
                  >
                    {entry.detail}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
