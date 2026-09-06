import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { WorkbenchHeaderLayout } from "./WorkbenchHeaderLayout";
import {
  WorkbenchLayoutEngine,
  type WorkbenchLayoutEngineProps,
  type WorkbenchPanelSlot,
} from "./WorkbenchLayoutEngine";
import { WorkbenchShell } from "./WorkbenchShell";
import type { WorkbenchLayoutConfig, WorkbenchLayoutSchema } from "./types";

export interface StandardWorkbenchPageProps<
  TPanelId extends string = string,
  TPreset extends string = string,
  TConfig extends WorkbenchLayoutConfig<TPanelId, TPreset> = WorkbenchLayoutConfig<TPanelId, TPreset>,
> extends Pick<
    WorkbenchLayoutEngineProps<TPanelId, TPreset, TConfig>,
    "schema" | "config" | "onConfigChange" | "panels" | "panelLabels" | "panelReorder"
  > {
  /** 完整顶栏覆盖；若提供则忽略 headerStart/Center/End */
  header?: ReactNode;
  headerStart?: ReactNode;
  headerCenter?: ReactNode;
  headerEnd?: ReactNode;
  footer?: ReactNode;
  className?: string;
  shellClassName?: string;
  enterAnimationClass?: string;
  loading?: boolean;
  loadingMessage?: ReactNode;
  /** 包裹布局引擎（如模板搭建 DnD Provider） */
  bodyWrapper?: (body: ReactNode) => ReactNode;
  /** 顶栏与布局引擎之间的插槽（如全局 Drawer 触发器） */
  children?: ReactNode;
}

export function StandardWorkbenchPage<
  TPanelId extends string,
  TPreset extends string,
  TConfig extends WorkbenchLayoutConfig<TPanelId, TPreset> = WorkbenchLayoutConfig<TPanelId, TPreset>,
>({
  schema,
  config,
  onConfigChange,
  panels,
  panelLabels,
  panelReorder,
  header,
  headerStart,
  headerCenter,
  headerEnd,
  footer,
  className,
  shellClassName,
  enterAnimationClass = "lh-workbench-enter",
  loading = false,
  loadingMessage = "正在加载…",
  bodyWrapper,
  children,
}: StandardWorkbenchPageProps<TPanelId, TPreset, TConfig>) {
  const resolvedHeader =
    header ??
    (headerStart || headerCenter || headerEnd ? (
      <WorkbenchHeaderLayout start={headerStart} center={headerCenter} end={headerEnd} />
    ) : undefined);

  const layoutBody = (
    <WorkbenchLayoutEngine
      schema={schema}
      config={config}
      onConfigChange={onConfigChange}
      panels={panels as Record<TPanelId, WorkbenchPanelSlot>}
      panelLabels={panelLabels}
      panelReorder={panelReorder}
    />
  );

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden bg-muted/70",
        className,
      )}
    >
      {loading ? (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 bg-background/95">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">{loadingMessage}</p>
        </div>
      ) : null}
      <WorkbenchShell
        className={cn("min-h-0 flex-1 overflow-hidden", shellClassName)}
        enterAnimationClass={enterAnimationClass}
        header={resolvedHeader}
        footer={footer}
      >
        {bodyWrapper ? bodyWrapper(layoutBody) : layoutBody}
      </WorkbenchShell>
      {children}
    </div>
  );
}
