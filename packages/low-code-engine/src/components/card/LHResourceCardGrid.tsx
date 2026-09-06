import type { ReactNode } from "react";
import type { CardPageSchema } from "../../schema/types";
import { cn } from "../../lib/utils";

interface LHResourceCardGridProps {
  card: CardPageSchema;
  loading?: boolean;
  children: ReactNode;
}

function gridClassName(card: CardPageSchema): string {
  const columns = card.columns ?? { base: 1, sm: 1, md: 2, lg: 3, xl: 4 };
  const gap = card.gap === "sm" ? "gap-3" : card.gap === "lg" ? "gap-6" : "gap-4";
  const colMap: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  };
  const base = colMap[columns.base ?? 1] ?? "grid-cols-1";
  const sm = columns.sm ? `sm:${colMap[columns.sm]}` : "";
  const md = columns.md ? `md:${colMap[columns.md]}` : "md:grid-cols-2";
  const lg = columns.lg ? `lg:${colMap[columns.lg]}` : "lg:grid-cols-3";
  const xl = columns.xl ? `xl:${colMap[columns.xl]}` : "";
  const layout = card.layout === "list" ? "grid-cols-1" : "";
  return cn("grid", gap, layout || [base, sm, md, lg, xl].filter(Boolean).join(" "));
}

export function LHResourceCardGrid({ card, loading, children }: LHResourceCardGridProps) {
  if (loading) {
    const count = card.skeleton?.count ?? 6;
    return (
      <div className={gridClassName(card)}>
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="h-48 animate-pulse rounded-[20px] bg-muted"
          />
        ))}
      </div>
    );
  }
  return <div className={gridClassName(card)}>{children}</div>;
}

export function LHResourceCardEmpty({ card }: { card: CardPageSchema }) {
  const empty = card.empty ?? { title: "暂无数据" };
  return (
    <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-border bg-muted/80 px-6 py-16 text-center">
      <h3 className="text-base font-medium text-foreground">{empty.title}</h3>
      {empty.description ? (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{empty.description}</p>
      ) : null}
    </div>
  );
}
