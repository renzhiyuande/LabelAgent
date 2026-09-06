import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface ErrorStatusPageProps {
  code: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone?: "neutral" | "danger";
  path?: string;
  actions: ReactNode;
}

export function ErrorStatusPage({
  code,
  title,
  description,
  icon: Icon,
  tone = "neutral",
  path,
  actions,
}: ErrorStatusPageProps) {
  const isDanger = tone === "danger";

  return (
    <section className="flex h-full min-h-[28rem] flex-1 items-center justify-center px-1 py-6 sm:py-10">
      <div
        className={cn(
          "relative w-full max-w-xl overflow-hidden rounded-[28px] border bg-card/90 p-8 shadow-[0_18px_45px_hsl(var(--foreground)/0.06)] backdrop-blur sm:p-10",
          isDanger ? "border-destructive/20" : "border-border/70",
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute -right-3 -top-8 select-none text-[7.5rem] font-semibold leading-none tracking-tighter sm:text-[8.5rem]",
            isDanger ? "text-destructive/10" : "text-primary/10",
          )}
          aria-hidden
        >
          {code}
        </div>

        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b to-transparent",
            isDanger ? "from-destructive/8" : "from-primary/8",
          )}
          aria-hidden
        />

        <div className="relative flex flex-col items-start gap-6">
          <div
            className={cn(
              "inline-flex h-14 w-14 items-center justify-center rounded-2xl border shadow-sm",
              isDanger
                ? "border-destructive/20 bg-destructive/10 text-destructive"
                : "border-primary/15 bg-primary/10 text-primary",
            )}
          >
            <Icon className="h-7 w-7" strokeWidth={1.75} />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{code}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">{title}</h1>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
          </div>

          {path ? (
            <div className="w-full rounded-2xl border border-border/60 bg-muted/35 px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">请求路径</p>
              <p className="mt-1 break-all font-mono text-sm text-foreground">{path}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2.5">{actions}</div>
        </div>
      </div>
    </section>
  );
}
