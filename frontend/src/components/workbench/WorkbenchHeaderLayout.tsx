import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface WorkbenchHeaderLayoutProps {
  start?: ReactNode;
  center?: ReactNode;
  end?: ReactNode;
  className?: string;
}

/** 标准工作台顶栏三区布局：左（标题/meta）· 中（可选）· 右（操作） */
export function WorkbenchHeaderLayout({ start, center, end, className }: WorkbenchHeaderLayoutProps) {
  return (
    <header
      className={cn(
        "flex shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-card/95 px-4 py-3",
        className,
      )}
    >
      {start ? <div className="flex min-w-0 flex-1 items-center gap-3">{start}</div> : <div className="min-w-0 flex-1" />}
      {center ? <div className="hidden shrink-0 items-center gap-2 md:flex">{center}</div> : null}
      {end ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{end}</div> : null}
    </header>
  );
}
