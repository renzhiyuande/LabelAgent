import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface WorkbenchContentShellProps {
  pending?: boolean;
  children: ReactNode;
  className?: string;
}

/** 切题/切项时保持壳层稳定，仅在内容区可选显示顶部细进度条 */
export function WorkbenchContentShell({ pending = false, children, className }: WorkbenchContentShellProps) {
  return (
    <div className={cn("relative flex h-full min-h-0 flex-col overflow-hidden", className)}>
      {pending ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-border/60">
          <div className="h-full w-1/3 animate-[lh-labeler-indeterminate_1s_ease-in-out_infinite] bg-primary/70" />
        </div>
      ) : null}
      {children}
    </div>
  );
}
