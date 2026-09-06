export { WorkbenchRoot, type WorkbenchRootProps } from "./core/WorkbenchRoot";
export { WorkbenchBodyRegion } from "./core/WorkbenchBodyRegion";
export { WorkbenchRegion } from "./core/WorkbenchRegion";
export { WorkbenchResizeHandle } from "./core/WorkbenchResizeHandle";
export { WorkbenchTabContainer } from "./core/WorkbenchTabContainer";
export { WorkbenchTabItem as WorkbenchTabItemView } from "./core/WorkbenchTabItem";
export { StandardWorkbenchV2, type StandardWorkbenchV2Props } from "./extensions/StandardWorkbenchV2";
export { useWorkbenchGlobalDrag, WorkbenchDndProvider } from "./hooks/use-workbench-dnd";
export { useWorkbenchGlobalLayout, type UseWorkbenchGlobalLayoutOptions } from "./hooks/use-workbench-global-layout";
export { buildWorkbenchRenderContext, useWorkbenchRenderContext } from "./hooks/use-workbench-render-context";
export { useWorkbenchTabSelection } from "./hooks/use-workbench-tab-selection";
export {
  createDefaultWorkbenchLayoutState,
  normalizeWorkbenchLayoutState,
  type RawWorkbenchGlobalLayoutState,
} from "./utils/layout-global-normalize";
export { loadWorkbenchLayoutState, saveWorkbenchLayoutState } from "./utils/layout-global-storage";
export { moveTabToRegion, moveTabToRegionAtIndex, normalizeAllTabIndices, reorderTabsInRegion } from "./utils/layout-dnd-operations";
export {
  createWidgetTab,
  removeWorkbenchTab,
  renameWorkbenchTab,
  findWidgetTab,
  isWidgetHostTab,
  buildWidgetTabId,
} from "./utils/widget-tab-operations";
export { WorkbenchEditSidebar } from "./components/WorkbenchEditSidebar";
export {
  WorkbenchEditLayoutSidebar,
  type WorkbenchEditLayoutSidebarFeatures,
  type WorkbenchEditLayoutSidebarProps,
} from "./components/WorkbenchEditLayoutSidebar";
export { createWorkbenchEditLayoutSidebar } from "./components/create-workbench-edit-layout-sidebar";
export type { CreateWorkbenchEditLayoutSidebarOptions, WorkbenchEditLayoutSidebarPlacement } from "./components/create-workbench-edit-layout-sidebar";
export { WorkbenchWidgetTabSlotContent } from "./components/WorkbenchWidgetTabSlotContent";
export type { WorkbenchWidgetTabSlotContentProps } from "./components/WorkbenchWidgetTabSlotContent";
export {
  createWorkbenchWidgetPlacementContext,
  createWorkbenchLayoutBridge,
  type WorkbenchWidgetPlacementContextBundle,
} from "./hooks/create-workbench-widget-placement";
export type {
  WorkbenchLayoutBridge,
  WorkbenchWidgetDefinition,
  WorkbenchWidgetPlacementConfig,
  WorkbenchWidgetPlacementValue,
} from "./types/widget-placement";
export {
  readHiddenWidgetIds,
  writeHiddenWidgetIds,
  clearHiddenWidgetStorage,
} from "./utils/hidden-widget-storage";
export {
  collectTabWidgetIds,
  findBoardForWidget,
  removeWidgetFromAllBoards,
  resolveOverWidgetId,
  parseWidgetBoardDropId,
  parseTabDropzoneRegionId,
  buildWidgetPaletteItems,
  defaultResolveTargetBoardList,
} from "./utils/widget-placement-helpers";
export { WorkbenchTabManager } from "./components/WorkbenchTabManager";
export { WorkbenchWidgetPalette, type WorkbenchWidgetPaletteItem } from "./components/WorkbenchWidgetPalette";
export { WORKBENCH_WIDGET_HOST_SLOT_ID } from "./types";
export type {
  WorkbenchChrome,
  WorkbenchDragMode,
  WorkbenchDraggableData,
  WorkbenchDroppableData,
  WorkbenchGlobalDragState,
  WorkbenchGlobalLayoutState,
  WorkbenchPlacementMode,
  WorkbenchRegionDefinition,
  WorkbenchRegionId,
  WorkbenchRegionState,
  WorkbenchRenderContext,
  WorkbenchSlotProvider,
  WorkbenchTabItem,
  WorkbenchTopBarRenderParams,
  WorkbenchV2Schema,
} from "./types";
export {
  EditableWidgetBoard,
  type EditableWidgetItem,
  type WidgetLayoutMode,
  type WidgetViewMode,
} from "./components/EditableWidgetBoard";
export { WidgetGroupShell } from "./components/WidgetGroupShell";
export type { WidgetBoardGroup } from "./utils/widget-board-groups";
export {
  mergeWidgetsInBoard,
  dissolveWidgetGroup,
  isWidgetGroupEntry,
  parseWidgetGroupEntry,
} from "./utils/widget-board-groups";
