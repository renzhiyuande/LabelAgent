import type { ReactNode } from "react";
import type { WorkbenchGlobalLayoutState } from "../types";
import type { WorkbenchEditLayoutSidebarFeatures } from "./WorkbenchEditLayoutSidebar";
import { WorkbenchEditLayoutSidebar } from "./WorkbenchEditLayoutSidebar";
import type { WorkbenchWidgetPaletteItem } from "./WorkbenchWidgetPalette";
import { renameWorkbenchTab, removeWorkbenchTab } from "../utils/widget-tab-operations";

export interface WorkbenchEditLayoutSidebarPlacement<
  TWidgetId extends string,
  TBoardId extends string = string,
> {
  getWidgetPaletteItems: (availableWidgetIds?: readonly TWidgetId[]) => WorkbenchWidgetPaletteItem[];
  removeWidget: (widgetId: TWidgetId) => void;
  restoreWidget: (widgetId: TWidgetId, boardId?: TBoardId) => void;
}

export interface CreateWorkbenchEditLayoutSidebarOptions<
  TWidgetId extends string,
  TBoardId extends string = string,
> {
  features?: WorkbenchEditLayoutSidebarFeatures;
  layoutState: WorkbenchGlobalLayoutState;
  onLayoutStateChange: (state: WorkbenchGlobalLayoutState) => void;
  placement: WorkbenchEditLayoutSidebarPlacement<TWidgetId, TBoardId>;
  isWidgetId: (id: string) => id is TWidgetId;
  availableWidgetIds?: readonly TWidgetId[];
  widgetPaletteTitle?: string;
}

/** 根据编辑模式生成侧栏节点 */
export function createWorkbenchEditLayoutSidebar<
  TWidgetId extends string,
  TBoardId extends string = string,
>(
  editMode: boolean,
  options: CreateWorkbenchEditLayoutSidebarOptions<TWidgetId, TBoardId>,
): ReactNode {
  if (!editMode) {
    return null;
  }

  const {
    features,
    layoutState,
    onLayoutStateChange,
    placement,
    isWidgetId,
    availableWidgetIds,
    widgetPaletteTitle,
  } = options;

  return (
    <WorkbenchEditLayoutSidebar
      features={features}
      tabs={layoutState.tabs}
      onRenameTab={(tabId, label) => {
        onLayoutStateChange({
          ...layoutState,
          tabs: renameWorkbenchTab(layoutState.tabs, tabId, label),
        });
      }}
      onRemoveTab={(tabId) => {
        const tab = layoutState.tabs.find((item) => item.id === tabId);
        if (tab?.widgetId && isWidgetId(tab.widgetId)) {
          placement.removeWidget(tab.widgetId);
        }
        onLayoutStateChange({
          ...layoutState,
          tabs: removeWorkbenchTab(layoutState.tabs, tabId),
        });
      }}
      widgets={placement.getWidgetPaletteItems(availableWidgetIds)}
      onAddWidget={(widgetId) => {
        if (isWidgetId(widgetId)) {
          placement.restoreWidget(widgetId);
        }
      }}
      widgetPaletteTitle={widgetPaletteTitle}
    />
  );
}
