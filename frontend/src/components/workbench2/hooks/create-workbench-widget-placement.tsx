import { arrayMove } from "@dnd-kit/sortable";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import type { WorkbenchWidgetDragHandlers } from "./use-workbench-dnd";
import type { WorkbenchRegionId } from "../types";
import type {
  WorkbenchLayoutBridge,
  WorkbenchWidgetPlacementConfig,
  WorkbenchWidgetPlacementValue,
} from "../types/widget-placement";
import { createWidgetTab, findWidgetTab, removeWorkbenchTab } from "../utils/widget-tab-operations";
import {
  clearHiddenWidgetStorage,
  readHiddenWidgetIds,
  writeHiddenWidgetIds,
} from "../utils/hidden-widget-storage";
import {
  buildWidgetPaletteItems,
  collectTabWidgetIds,
  defaultResolveTargetBoardList,
  findBoardForWidget,
  parseTabDropzoneRegionId,
  parseWidgetBoardDropId,
  removeWidgetFromAllBoards,
  resolveOverWidgetId,
} from "../utils/widget-placement-helpers";
import {
  isDragMergeModifier,
  setWidgetDragMergeModifierListener,
  startWidgetDragMergeModifierTracking,
  stopWidgetDragMergeModifierTracking,
} from "../utils/widget-drag-merge-modifier";
import {
  dissolveWidgetGroup,
  findGroupContainingWidget,
  mergeWidgetsInBoard,
  readWidgetBoardGroups,
  removeWidgetFromBoardLayout,
  reorderWidgetsInGroup,
  updateWidgetGroup,
  writeWidgetBoardGroups,
  type WidgetBoardGroup,
} from "../utils/widget-board-groups";
import { isWidgetGroupChildSortDrag } from "../components/WidgetGroupChildSortable";

function normalizeOrders<TBoardId extends string>(
  orders: Record<TBoardId, string[]>,
  normalize?: (orders: Record<TBoardId, string[]>) => Record<TBoardId, string[]>,
): Record<TBoardId, string[]> {
  return normalize ? normalize(orders) : orders;
}

function useWorkbenchWidgetPlacementState<TBoardId extends string, TWidgetId extends string>(
  config: WorkbenchWidgetPlacementConfig<TBoardId, TWidgetId>,
  layoutBridge: WorkbenchLayoutBridge,
): WorkbenchWidgetPlacementValue<TBoardId, TWidgetId> {
  const {
    boardIds,
    hiddenStorageKey,
    isWidgetId,
    isBoardId,
    getWidgetDefinition,
    loadInitialOrders,
    persistOrders,
    normalizeOrders: normalizeOrdersFn,
    onBoardOrderChange,
    onBoardWidgetsChanged,
    canMoveToBoard,
    resolveTargetBoardList,
    defaultAvailableWidgetIds,
    paletteTransferableOnly = true,
    widgetGroupsStorageKey,
    loadInitialGroups,
  } = config;

  const groupsEnabled = Boolean(widgetGroupsStorageKey || loadInitialGroups);
  const emptyGroups = () =>
    Object.fromEntries(boardIds.map((boardId) => [boardId, {}])) as Record<
      TBoardId,
      Record<string, WidgetBoardGroup>
    >;

  const [orders, setOrders] = useState(loadInitialOrders);
  const [groups, setGroups] = useState<Record<TBoardId, Record<string, WidgetBoardGroup>>>(() => {
    if (loadInitialGroups) {
      return loadInitialGroups();
    }
    if (groupsEnabled && widgetGroupsStorageKey) {
      return readWidgetBoardGroups(widgetGroupsStorageKey, boardIds);
    }
    return emptyGroups();
  });
  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  const [hiddenWidgetIds, setHiddenWidgetIds] = useState<string[]>(() =>
    readHiddenWidgetIds(hiddenStorageKey, isWidgetId),
  );
  const [activeDragWidgetId, setActiveDragWidgetId] = useState<string | null>(null);
  const [dragMergeModifier, setDragMergeModifier] = useState(false);
  const layoutBridgeRef = useRef(layoutBridge);
  layoutBridgeRef.current = layoutBridge;

  useEffect(() => {
    persistOrders(orders);
  }, [orders, persistOrders]);

  useEffect(() => {
    if (groupsEnabled && widgetGroupsStorageKey) {
      writeWidgetBoardGroups(widgetGroupsStorageKey, groups);
    }
  }, [groups, groupsEnabled, widgetGroupsStorageKey]);

  const tabWidgetIds = useMemo(() => collectTabWidgetIds(layoutBridge.tabs), [layoutBridge.tabs]);

  useEffect(() => {
    setWidgetDragMergeModifierListener(setDragMergeModifier);
    return () => setWidgetDragMergeModifierListener(null);
  }, []);

  const unhideWidget = useCallback(
    (widgetId: TWidgetId) => {
      setHiddenWidgetIds((current) => {
        if (!current.includes(widgetId)) {
          return current;
        }
        const next = current.filter((id) => id !== widgetId);
        writeHiddenWidgetIds(hiddenStorageKey, next);
        return next;
      });
    },
    [hiddenStorageKey],
  );

  const hideWidget = useCallback(
    (widgetId: TWidgetId) => {
      setHiddenWidgetIds((current) => {
        if (current.includes(widgetId)) {
          return current;
        }
        const next = [...current, widgetId];
        writeHiddenWidgetIds(hiddenStorageKey, next);
        return next;
      });
    },
    [hiddenStorageKey],
  );

  const removeWidgetTab = useCallback((widgetId: TWidgetId) => {
    const bridge = layoutBridgeRef.current;
    const widgetTab = findWidgetTab(bridge.tabs, widgetId);
    if (widgetTab) {
      bridge.setTabs(removeWorkbenchTab(bridge.tabs, widgetTab.id));
    }
  }, []);

  const boardGroupsFor = useCallback(
    (boardId: TBoardId) => groupsRef.current[boardId] ?? {},
    [],
  );

  const mergeWidgets = useCallback(
    (boardId: TBoardId, widgetA: string, widgetB: string) => {
      if (!groupsEnabled) {
        return;
      }
      setOrders((current) => {
        const { order, groups: nextBoardGroups } = mergeWidgetsInBoard(
          current[boardId],
          boardGroupsFor(boardId),
          widgetA,
          widgetB,
        );
        const nextGroups = { ...groupsRef.current, [boardId]: nextBoardGroups };
        groupsRef.current = nextGroups;
        setGroups(nextGroups);
        const nextOrders = { ...current, [boardId]: order };
        persistOrders(nextOrders);
        return nextOrders;
      });
    },
    [boardGroupsFor, groupsEnabled, persistOrders],
  );

  const dissolveGroup = useCallback(
    (boardId: TBoardId, groupId: string) => {
      if (!groupsEnabled) {
        return;
      }
      setOrders((current) => {
        const { order, groups: nextBoardGroups } = dissolveWidgetGroup(
          current[boardId],
          boardGroupsFor(boardId),
          groupId,
        );
        const nextGroups = { ...groupsRef.current, [boardId]: nextBoardGroups };
        groupsRef.current = nextGroups;
        setGroups(nextGroups);
        const nextOrders = { ...current, [boardId]: order };
        persistOrders(nextOrders);
        return nextOrders;
      });
    },
    [boardGroupsFor, groupsEnabled, persistOrders],
  );

  const updateGroup = useCallback(
    (
      boardId: TBoardId,
      groupId: string,
      patch: Partial<Pick<WidgetBoardGroup, "layout" | "splitSizes">>,
    ) => {
      if (!groupsEnabled) {
        return;
      }
      const nextBoardGroups = updateWidgetGroup(boardGroupsFor(boardId), groupId, patch);
      const nextGroups = { ...groupsRef.current, [boardId]: nextBoardGroups };
      groupsRef.current = nextGroups;
      setGroups(nextGroups);
      if (widgetGroupsStorageKey) {
        writeWidgetBoardGroups(widgetGroupsStorageKey, nextGroups);
      }
    },
    [boardGroupsFor, groupsEnabled, widgetGroupsStorageKey],
  );

  const reorderGroupWidgets = useCallback(
    (boardId: TBoardId, groupId: string, widgetIds: string[]) => {
      if (!groupsEnabled) {
        return;
      }
      const nextBoardGroups = reorderWidgetsInGroup(boardGroupsFor(boardId), groupId, widgetIds);
      const nextGroups = { ...groupsRef.current, [boardId]: nextBoardGroups };
      groupsRef.current = nextGroups;
      setGroups(nextGroups);
    },
    [boardGroupsFor, groupsEnabled],
  );

  const setBoardOrder = useCallback(
    (boardId: TBoardId, order: string[]) => {
      setOrders((current) => {
        const prevOrder = current[boardId];
        const next = normalizeOrders({ ...current, [boardId]: order }, normalizeOrdersFn);
        persistOrders(next);
        if (prevOrder.join(",") !== order.join(",") && order.length > 1) {
          onBoardOrderChange?.(boardId, prevOrder, order);
        }
        return next;
      });
    },
    [normalizeOrdersFn, onBoardOrderChange, persistOrders],
  );

  const moveWidgetToBoard = useCallback(
    (widgetId: TWidgetId, targetBoardId: TBoardId, overWidgetId?: string) => {
      if (!getWidgetDefinition(widgetId).transferable) {
        return;
      }
      if (canMoveToBoard && !canMoveToBoard(widgetId, targetBoardId)) {
        return;
      }

      unhideWidget(widgetId);
      removeWidgetTab(widgetId);

      setOrders((current) => {
        const sourceBoardId = findBoardForWidget(current, boardIds, widgetId, groupsRef.current);
        const nextBase = groupsEnabled
          ? (() => {
              const nextOrders = { ...current };
              const nextGroups = { ...groupsRef.current };
              for (const id of boardIds) {
                const result = removeWidgetFromBoardLayout(
                  current[id],
                  nextGroups[id] ?? {},
                  widgetId,
                );
                nextOrders[id] = result.order;
                nextGroups[id] = result.groups;
              }
              groupsRef.current = nextGroups;
              setGroups(nextGroups);
              return nextOrders;
            })()
          : removeWidgetFromAllBoards(current, boardIds, widgetId);
        const baseList = nextBase[targetBoardId].filter((id) => id !== widgetId);
        const targetList = resolveTargetBoardList
          ? resolveTargetBoardList({ widgetId, targetBoardId, baseList, overWidgetId })
          : defaultResolveTargetBoardList({ widgetId, baseList, overWidgetId });
        const next = normalizeOrders({ ...nextBase, [targetBoardId]: targetList }, normalizeOrdersFn);
        persistOrders(next);
        if (sourceBoardId) {
          onBoardWidgetsChanged?.(sourceBoardId, current[sourceBoardId], next[sourceBoardId]);
        }
        onBoardWidgetsChanged?.(targetBoardId, current[targetBoardId], next[targetBoardId]);
        return next;
      });
    },
    [
      boardIds,
      canMoveToBoard,
      getWidgetDefinition,
      groupsEnabled,
      normalizeOrdersFn,
      onBoardWidgetsChanged,
      persistOrders,
      removeWidgetTab,
      resolveTargetBoardList,
      unhideWidget,
    ],
  );

  const removeWidget = useCallback(
    (widgetId: TWidgetId) => {
      if (!getWidgetDefinition(widgetId).transferable) {
        return;
      }

      hideWidget(widgetId);
      removeWidgetTab(widgetId);

      setOrders((current) => {
        const sourceBoardId = findBoardForWidget(current, boardIds, widgetId, groupsRef.current);
        const next = groupsEnabled
          ? (() => {
              const nextOrders = { ...current };
              const nextGroups = { ...groupsRef.current };
              for (const id of boardIds) {
                const result = removeWidgetFromBoardLayout(current[id], nextGroups[id] ?? {}, widgetId);
                nextOrders[id] = result.order;
                nextGroups[id] = result.groups;
              }
              groupsRef.current = nextGroups;
              setGroups(nextGroups);
              return nextOrders;
            })()
          : removeWidgetFromAllBoards(current, boardIds, widgetId);
        persistOrders(next);
        if (sourceBoardId) {
          onBoardWidgetsChanged?.(sourceBoardId, current[sourceBoardId], next[sourceBoardId]);
        }
        return next;
      });
    },
    [boardIds, getWidgetDefinition, groupsEnabled, hideWidget, onBoardWidgetsChanged, persistOrders, removeWidgetTab],
  );

  const restoreWidget = useCallback(
    (widgetId: TWidgetId, boardId?: TBoardId) => {
      const targetBoard = (boardId ?? getWidgetDefinition(widgetId).defaultBoard) as TBoardId;
      moveWidgetToBoard(widgetId, targetBoard);
    },
    [getWidgetDefinition, moveWidgetToBoard],
  );

  const assignWidgetToTab = useCallback(
    (widgetId: TWidgetId, regionId: WorkbenchRegionId) => {
      if (!getWidgetDefinition(widgetId).transferable) {
        return;
      }

      unhideWidget(widgetId);

      setOrders((current) => {
        const sourceBoardId = findBoardForWidget(current, boardIds, widgetId, groupsRef.current);
        const next = groupsEnabled
          ? (() => {
              const nextOrders = { ...current };
              const nextGroups = { ...groupsRef.current };
              for (const id of boardIds) {
                const result = removeWidgetFromBoardLayout(current[id], nextGroups[id] ?? {}, widgetId);
                nextOrders[id] = result.order;
                nextGroups[id] = result.groups;
              }
              groupsRef.current = nextGroups;
              setGroups(nextGroups);
              return nextOrders;
            })()
          : removeWidgetFromAllBoards(current, boardIds, widgetId);
        persistOrders(next);
        if (sourceBoardId) {
          onBoardWidgetsChanged?.(sourceBoardId, current[sourceBoardId], next[sourceBoardId]);
        }
        return next;
      });

      const bridge = layoutBridgeRef.current;
      const { tabs, tabId } = createWidgetTab({
        widgetId,
        regionId,
        label: getWidgetDefinition(widgetId).title,
        tabs: bridge.tabs,
      });
      bridge.setTabs(tabs);
      bridge.activateRegionTab(regionId, tabId);
    },
    [boardIds, getWidgetDefinition, onBoardWidgetsChanged, persistOrders, unhideWidget],
  );

  const getWidgetPaletteItems = useCallback(
    (availableWidgetIds: readonly TWidgetId[] = defaultAvailableWidgetIds ?? []) =>
      buildWidgetPaletteItems({
        orders,
        boardIds,
        tabWidgetIds,
        hiddenWidgetIds,
        widgetIds: availableWidgetIds,
        getWidgetDefinition,
        transferableOnly: paletteTransferableOnly,
      }),
    [
      boardIds,
      defaultAvailableWidgetIds,
      getWidgetDefinition,
      hiddenWidgetIds,
      orders,
      paletteTransferableOnly,
      tabWidgetIds,
    ],
  );

  return useMemo(
    () => ({
      orders,
      groups,
      hiddenWidgetIds,
      setBoardOrder,
      mergeWidgets,
      dissolveGroup,
      updateGroup,
      reorderGroupWidgets,
      boardIdForWidget: (widgetId: string) => findBoardForWidget(orders, boardIds, widgetId, groups),
      tabWidgetIds,
      activeDragWidgetId,
      setActiveDragWidgetId,
      dragMergeModifier,
      moveWidgetToBoard,
      removeWidget,
      restoreWidget,
      assignWidgetToTab,
      getWidgetPaletteItems,
    }),
    [
      activeDragWidgetId,
      dragMergeModifier,
      assignWidgetToTab,
      boardIds,
      dissolveGroup,
      getWidgetPaletteItems,
      groups,
      hiddenWidgetIds,
      mergeWidgets,
      moveWidgetToBoard,
      orders,
      removeWidget,
      restoreWidget,
      setBoardOrder,
      tabWidgetIds,
      updateGroup,
      reorderGroupWidgets,
    ],
  );
}

export interface WorkbenchWidgetPlacementContextBundle<TBoardId extends string, TWidgetId extends string> {
  Provider: (props: { layoutBridge: WorkbenchLayoutBridge; children: ReactNode }) => ReactNode;
  usePlacement: () => WorkbenchWidgetPlacementValue<TBoardId, TWidgetId>;
  usePlacementOptional: () => WorkbenchWidgetPlacementValue<TBoardId, TWidgetId> | null;
  useDragHandlers: (editMode: boolean) => WorkbenchWidgetDragHandlers;
  clearHiddenStorage: () => void;
}

export function createWorkbenchWidgetPlacementContext<TBoardId extends string, TWidgetId extends string>(
  config: WorkbenchWidgetPlacementConfig<TBoardId, TWidgetId>,
): WorkbenchWidgetPlacementContextBundle<TBoardId, TWidgetId> {
  const Context = createContext<WorkbenchWidgetPlacementValue<TBoardId, TWidgetId> | null>(null);

  function Provider({
    layoutBridge,
    children,
  }: {
    layoutBridge: WorkbenchLayoutBridge;
    children: ReactNode;
  }) {
    const value = useWorkbenchWidgetPlacementState(config, layoutBridge);
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  function usePlacement() {
    const context = useContext(Context);
    if (!context) {
      throw new Error("usePlacement must be used within WorkbenchWidgetPlacementProvider");
    }
    return context;
  }

  function usePlacementOptional() {
    return useContext(Context);
  }

  function useDragHandlers(editMode: boolean): WorkbenchWidgetDragHandlers {
    const placement = usePlacement();
    const ordersRef = useRef(placement.orders);
    ordersRef.current = placement.orders;
    const groupsEnabled = Boolean(config.widgetGroupsStorageKey);

    const onDragStart = useCallback(
      (event: DragStartEvent) => {
        if (isWidgetGroupChildSortDrag(event.active.data)) {
          return;
        }
        const id = String(event.active.id);
        if (config.isWidgetId(id)) {
          placement.setActiveDragWidgetId(id);
          startWidgetDragMergeModifierTracking(event.activatorEvent);
        }
      },
      [placement],
    );

    const onDragEnd = useCallback(
      (event: DragEndEvent) => {
        stopWidgetDragMergeModifierTracking();
        placement.setActiveDragWidgetId(null);
        if (isWidgetGroupChildSortDrag(event.active.data)) {
          return true;
        }
        if (!editMode) {
          return false;
        }
        const { active, over } = event;
        const activeId = String(active.id);
        if (!config.isWidgetId(activeId)) {
          return false;
        }
        if (!over) {
          return true;
        }

        const overId = String(over.id);
        const currentOrders = ordersRef.current;
        const sourceBoardId = findBoardForWidget(
          currentOrders,
          config.boardIds,
          activeId,
          placement.groups,
        );
        const overWidgetId = resolveOverWidgetId(event, activeId, config.isWidgetId);
        const mergeModifier = isDragMergeModifier(event);
        const shouldMerge =
          groupsEnabled &&
          mergeModifier &&
          overWidgetId &&
          sourceBoardId &&
          activeId !== overWidgetId &&
          findBoardForWidget(currentOrders, config.boardIds, overWidgetId, placement.groups) ===
            sourceBoardId;

        if (shouldMerge && overWidgetId) {
          placement.mergeWidgets(sourceBoardId, activeId, overWidgetId);
          return true;
        }

        if (
          mergeModifier &&
          overWidgetId &&
          activeId !== overWidgetId &&
          sourceBoardId &&
          findBoardForWidget(currentOrders, config.boardIds, overWidgetId, placement.groups) === sourceBoardId
        ) {
          return true;
        }

        const regionId = parseTabDropzoneRegionId(overId);
        if (regionId) {
          placement.assignWidgetToTab(activeId, regionId as WorkbenchRegionId);
          return true;
        }

        const boardDropId = parseWidgetBoardDropId(overId);
        if (boardDropId && config.isBoardId(boardDropId)) {
          const targetBoardId = boardDropId;
          if (!sourceBoardId) {
            placement.restoreWidget(activeId, targetBoardId);
            return true;
          }
          if (sourceBoardId === targetBoardId) {
            const boardOrder = currentOrders[sourceBoardId];
            const withoutActive = boardOrder.filter((id) => id !== activeId);
            if (withoutActive.length < boardOrder.length) {
              const vertical = Math.abs(event.delta.y) >= Math.abs(event.delta.x);
              const movingToStart = vertical ? event.delta.y < -6 : event.delta.x < -6;
              placement.setBoardOrder(
                targetBoardId,
                movingToStart ? [activeId, ...withoutActive] : [...withoutActive, activeId],
              );
            }
          } else {
            placement.moveWidgetToBoard(activeId, targetBoardId);
          }
          return true;
        }

        if (overWidgetId) {
          const targetBoardId = findBoardForWidget(currentOrders, config.boardIds, overWidgetId, placement.groups);
          if (!targetBoardId) {
            return true;
          }
          if (!sourceBoardId) {
            placement.restoreWidget(activeId, targetBoardId);
            return true;
          }
          if (sourceBoardId === targetBoardId) {
            const boardGroups = placement.groups[sourceBoardId] ?? {};
            const sourceGroupId = findGroupContainingWidget(boardGroups, activeId);
            const targetGroupId = findGroupContainingWidget(boardGroups, overWidgetId);
            if (sourceGroupId && sourceGroupId === targetGroupId) {
              const group = boardGroups[sourceGroupId];
              const oldIndex = group.widgetIds.indexOf(activeId);
              const newIndex = group.widgetIds.indexOf(overWidgetId);
              if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
                placement.reorderGroupWidgets(
                  sourceBoardId,
                  sourceGroupId,
                  arrayMove(group.widgetIds, oldIndex, newIndex),
                );
              }
              return true;
            }

            const boardOrder = currentOrders[sourceBoardId];
            const oldIndex = boardOrder.indexOf(activeId);
            const newIndex = boardOrder.indexOf(overWidgetId);
            if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
              placement.setBoardOrder(sourceBoardId, arrayMove(boardOrder, oldIndex, newIndex));
            }
            return true;
          }
          placement.moveWidgetToBoard(activeId, targetBoardId, overWidgetId);
          return true;
        }

        if (!config.isWidgetId(overId) || activeId === overId) {
          return true;
        }

        const targetBoardId = findBoardForWidget(currentOrders, config.boardIds, overId, placement.groups);
        if (!targetBoardId) {
          return true;
        }

        if (sourceBoardId === targetBoardId) {
          const boardOrder = currentOrders[sourceBoardId];
          const oldIndex = boardOrder.indexOf(activeId);
          const newIndex = boardOrder.indexOf(overId);
          if (oldIndex >= 0 && newIndex >= 0) {
            placement.setBoardOrder(sourceBoardId, arrayMove(boardOrder, oldIndex, newIndex));
          }
          return true;
        }

        placement.moveWidgetToBoard(activeId, targetBoardId, overId);
        return true;
      },
      [editMode, placement],
    );

    return useMemo(
      () => ({ onDragStart, onDragEnd, isWidgetId: config.isWidgetId }),
      [onDragEnd, onDragStart],
    );
  }

  function clearHiddenStorage() {
    clearHiddenWidgetStorage(config.hiddenStorageKey);
  }

  return {
    Provider,
    usePlacement,
    usePlacementOptional,
    useDragHandlers,
    clearHiddenStorage,
  };
}

export function createWorkbenchLayoutBridge(params: {
  tabs: WorkbenchLayoutBridge["tabs"];
  setTabs: WorkbenchLayoutBridge["setTabs"];
  activateRegionTab: WorkbenchLayoutBridge["activateRegionTab"];
}): WorkbenchLayoutBridge {
  return params;
}
