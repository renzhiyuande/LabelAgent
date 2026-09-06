import type { WorkbenchRegionId, WorkbenchTabItem } from "../types";
import type { WorkbenchWidgetPaletteItem } from "../components/WorkbenchWidgetPalette";
import type { WidgetBoardGroup } from "../utils/widget-board-groups";

export type WorkbenchWidgetBoardGroups<TBoardId extends string> = Record<
  TBoardId,
  Record<string, WidgetBoardGroup>
>;

export interface WorkbenchLayoutBridge {
  tabs: WorkbenchTabItem[];
  setTabs: (tabs: WorkbenchTabItem[]) => void;
  activateRegionTab: (regionId: WorkbenchRegionId, tabId: string) => void;
}

export interface WorkbenchWidgetDefinition {
  id: string;
  title: string;
  transferable: boolean;
  defaultBoard: string;
}

export interface WorkbenchWidgetPlacementValue<TBoardId extends string, TWidgetId extends string> {
  orders: Record<TBoardId, string[]>;
  groups: Record<TBoardId, Record<string, WidgetBoardGroup>>;
  hiddenWidgetIds: string[];
  setBoardOrder: (boardId: TBoardId, order: string[]) => void;
  mergeWidgets: (boardId: TBoardId, widgetA: string, widgetB: string) => void;
  dissolveGroup: (boardId: TBoardId, groupId: string) => void;
  updateGroup: (
    boardId: TBoardId,
    groupId: string,
    patch: Partial<Pick<WidgetBoardGroup, "layout" | "splitSizes">>,
  ) => void;
  reorderGroupWidgets: (boardId: TBoardId, groupId: string, widgetIds: string[]) => void;
  boardIdForWidget: (widgetId: string) => TBoardId | null;
  tabWidgetIds: Set<string>;
  activeDragWidgetId: string | null;
  setActiveDragWidgetId: (widgetId: string | null) => void;
  /** 拖拽过程中是否按住 Shift/Alt（用于合并落点与高亮） */
  dragMergeModifier: boolean;
  moveWidgetToBoard: (widgetId: TWidgetId, targetBoardId: TBoardId, overWidgetId?: string) => void;
  removeWidget: (widgetId: TWidgetId) => void;
  restoreWidget: (widgetId: TWidgetId, boardId?: TBoardId) => void;
  assignWidgetToTab: (widgetId: TWidgetId, regionId: WorkbenchRegionId) => void;
  getWidgetPaletteItems: (availableWidgetIds?: readonly TWidgetId[]) => WorkbenchWidgetPaletteItem[];
}

export interface WorkbenchWidgetPlacementConfig<TBoardId extends string, TWidgetId extends string> {
  boardIds: readonly TBoardId[];
  hiddenStorageKey: string;
  isWidgetId: (id: string) => id is TWidgetId;
  isBoardId: (id: string) => id is TBoardId;
  getWidgetDefinition: (id: TWidgetId) => WorkbenchWidgetDefinition;
  loadInitialOrders: () => Record<TBoardId, string[]>;
  persistOrders: (orders: Record<TBoardId, string[]>) => void;
  /** 写入 orders 前规范化（如跨板去重） */
  normalizeOrders?: (orders: Record<TBoardId, string[]>) => Record<TBoardId, string[]>;
  /** board 内顺序变化时同步 split sizes 等 */
  onBoardOrderChange?: (boardId: TBoardId, prevOrder: string[], nextOrder: string[]) => void;
  /** widget 从 board 移除或 board 列表变化时 */
  onBoardWidgetsChanged?: (boardId: TBoardId, prevOrder: string[], nextOrder: string[]) => void;
  canMoveToBoard?: (widgetId: TWidgetId, targetBoardId: TBoardId) => boolean;
  resolveTargetBoardList?: (params: {
    widgetId: TWidgetId;
    targetBoardId: TBoardId;
    baseList: string[];
    overWidgetId?: string;
  }) => string[];
  defaultAvailableWidgetIds?: readonly TWidgetId[];
  /** 组件库仅展示可转移 widget，默认 true */
  paletteTransferableOnly?: boolean;
  /** 设置后启用 board 内 widget 组合（Shift+拖到另一组件上合并） */
  widgetGroupsStorageKey?: string;
  /** 自定义 groups 初始值（可与 localStorage 合并） */
  loadInitialGroups?: () => WorkbenchWidgetBoardGroups<TBoardId>;
}
