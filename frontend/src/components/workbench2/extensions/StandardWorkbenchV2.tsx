import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { WorkbenchHeaderLayout } from "@/components/workbench";
import { WorkbenchShell } from "@/components/workbench";
import { WorkbenchRoot, type WorkbenchRootProps } from "../core/WorkbenchRoot";

export interface StandardWorkbenchV2Props<TBusinessContext> extends WorkbenchRootProps<TBusinessContext> {
  headerStart?: ReactNode;
  headerCenter?: ReactNode;
  headerEnd?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
  shellClassName?: string;
  loading?: boolean;
  loadingMessage?: ReactNode;
  editSidebar?: ReactNode;
}

export function StandardWorkbenchV2<TBusinessContext>({
  headerStart,
  headerCenter,
  headerEnd,
  header,
  footer,
  className,
  shellClassName,
  loading = false,
  loadingMessage = "正在加载工作台…",
  editSidebar,
  ...props
}: StandardWorkbenchV2Props<TBusinessContext>) {
  const resolvedHeader =
    header ??
    (headerStart || headerCenter || headerEnd ? (
      <WorkbenchHeaderLayout start={headerStart} center={headerCenter} end={headerEnd} />
    ) : null);

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden",
        props.schema.chrome === "flush"
          ? "bg-background"
          : "bg-muted/40 dark:bg-background",
        className,
      )}
    >
      {loading ? (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-background/95">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-slate-600 dark:text-slate-300">{loadingMessage}</p>
        </div>
      ) : null}
      <WorkbenchShell
        header={resolvedHeader}
        footer={footer}
        enterAnimationClass={props.schema.chrome === "flush" ? "" : undefined}
        className={cn(
          "min-h-0 flex-1 overflow-hidden",
          props.schema.chrome === "flush" && "lh-workbench-v2-flush",
          shellClassName,
        )}
      >
        <WorkbenchRoot {...props} editSidebar={editSidebar} />
      </WorkbenchShell>
    </div>
  );
}
