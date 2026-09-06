import type { ReactNode } from "react";
import { WorkbenchEditSidebar } from "./WorkbenchEditSidebar";
import { WorkbenchTabManager } from "./WorkbenchTabManager";
import { WorkbenchWidgetPalette, type WorkbenchWidgetPaletteItem } from "./WorkbenchWidgetPalette";
import type { WorkbenchTabItem } from "../types";

export interface WorkbenchEditLayoutSidebarFeatures {
  /** Tab 列表管理（重命名 / 删除 widget Tab） */
  tabManager?: boolean;
  /** 组件库（恢复已隐藏 widget） */
  widgetPalette?: boolean;
}

export interface WorkbenchEditLayoutSidebarProps {
  /** 按需开启 Tab 管理、组件库，默认均为 true */
  features?: WorkbenchEditLayoutSidebarFeatures;
  tabs: WorkbenchTabItem[];
  onRenameTab: (tabId: string, label: string) => void;
  onRemoveTab: (tabId: string) => void;
  widgets?: WorkbenchWidgetPaletteItem[];
  onAddWidget?: (widgetId: string) => void;
  widgetPaletteTitle?: string;
  className?: string;
}

function resolveFeatures(features?: WorkbenchEditLayoutSidebarFeatures) {
  return {
    tabManager: features?.tabManager !== false,
    widgetPalette: features?.widgetPalette !== false,
  };
}

/** 编辑模式侧栏：Tab 管理 + 组件库，可按 feature 开关 */
export function WorkbenchEditLayoutSidebar({
  features,
  tabs,
  onRenameTab,
  onRemoveTab,
  widgets = [],
  onAddWidget,
  widgetPaletteTitle,
  className,
}: WorkbenchEditLayoutSidebarProps): ReactNode {
  const resolved = resolveFeatures(features);
  const showTabManager = resolved.tabManager;
  const showWidgetPalette = resolved.widgetPalette && Boolean(onAddWidget);

  if (!showTabManager && !showWidgetPalette) {
    return null;
  }

  return (
    <WorkbenchEditSidebar
      className={className}
      tabManager={
        showTabManager ? (
          <WorkbenchTabManager tabs={tabs} onRenameTab={onRenameTab} onRemoveTab={onRemoveTab} />
        ) : null
      }
      widgetPalette={
        showWidgetPalette ? (
          <WorkbenchWidgetPalette
            title={widgetPaletteTitle}
            widgets={widgets}
            onAddWidget={onAddWidget!}
          />
        ) : null
      }
    />
  );
}
