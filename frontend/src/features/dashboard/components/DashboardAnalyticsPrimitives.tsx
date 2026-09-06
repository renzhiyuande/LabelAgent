import type { ReactNode } from "react";

export function AnalyticsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-background/76 p-4 shadow-[0_18px_38px_hsl(var(--foreground)/0.05)]">
      <div className="mb-4">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="h-[260px]">{children}</div>
    </div>
  );
}

export function AnalyticsEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-[18px] border border-dashed border-border/80 bg-background/55 px-4 text-center text-sm leading-6 text-muted-foreground">
      {message}
    </div>
  );
}

export const OWNER_CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--foreground) / 0.78)",
  "hsl(var(--primary) / 0.55)",
  "hsl(var(--muted-foreground) / 0.85)",
];

export function DashboardTooltip({
  active,
  payload,
  label,
  formatLabel,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string | number;
    value?: string | number | Array<string | number>;
  }>;
  label?: unknown;
  formatLabel?: (label: unknown) => string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-[18px] border border-border/70 bg-popover/96 px-3 py-2 text-sm text-popover-foreground shadow-[0_16px_38px_hsl(var(--foreground)/0.12)]">
      {label ? (
        <p className="mb-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
          {formatLabel ? formatLabel(label) : String(label)}
        </p>
      ) : null}
      <div className="grid gap-1.5">
        {payload.map((entry) => (
          <div key={String(entry.name ?? "value")} className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="font-medium text-foreground">{formatTooltipValue(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTooltipValue(value: string | number | Array<string | number> | undefined) {
  if (typeof value !== "number") {
    return String(value ?? "—");
  }
  return Number.isInteger(value) ? new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(value) : value.toFixed(1);
}

export function formatShortDate(statDate: unknown) {
  if (typeof statDate !== "string") {
    return String(statDate ?? "");
  }
  const [, month, day] = statDate.split("-");
  if (!month || !day) {
    return statDate;
  }
  return `${month}/${day}`;
}
