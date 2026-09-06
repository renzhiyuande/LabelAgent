import type { ReactNode } from "react";

export function TopCapsule({
  icon,
  label,
  badge,
  title,
}: {
  icon: ReactNode;
  label: string;
  badge?: ReactNode;
  /** 悬停展示完整文案（默认同 label） */
  title?: string;
}) {
  const tooltip = title ?? label;
  return (
    <span className="flex min-w-0 max-w-[min(100%,14rem)] items-center gap-2" title={tooltip}>
      <span className="shrink-0 text-current">{icon}</span>
      <span className="truncate">{label}</span>
      {badge != null ? (
        typeof badge === "string" || typeof badge === "number" ? (
          <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-card/90 px-1.5 text-[11px] font-semibold text-foreground">
            {badge}
          </span>
        ) : (
          badge
        )
      ) : null}
    </span>
  );
}
