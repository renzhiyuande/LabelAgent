import type { WidgetLayoutMode } from "../components/EditableWidgetBoard";

export interface WidgetBoardGroup {
  id: string;
  widgetIds: string[];
  layout: WidgetLayoutMode;
  splitSizes: number[];
}

const GROUP_PREFIX = "group:";

export function createWidgetGroupId(): string {
  return `wg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isWidgetGroupEntry(entryId: string): boolean {
  return entryId.startsWith(GROUP_PREFIX);
}

export function toWidgetGroupEntry(groupId: string): string {
  return `${GROUP_PREFIX}${groupId}`;
}

export function parseWidgetGroupEntry(entryId: string): string | null {
  return isWidgetGroupEntry(entryId) ? entryId.slice(GROUP_PREFIX.length) : null;
}

export function equalGroupSplitSizes(paneCount: number): number[] {
  return Array.from({ length: Math.max(paneCount, 1) }, () => 1 / Math.max(paneCount, 1));
}

export function findGroupContainingWidget(
  groups: Record<string, WidgetBoardGroup>,
  widgetId: string,
): string | null {
  for (const [groupId, group] of Object.entries(groups)) {
    if (group.widgetIds.includes(widgetId)) {
      return groupId;
    }
  }
  return null;
}

export function flattenBoardOrder(order: string[], groups: Record<string, WidgetBoardGroup>): string[] {
  const flat: string[] = [];
  for (const entry of order) {
    const groupId = parseWidgetGroupEntry(entry);
    if (groupId && groups[groupId]) {
      for (const widgetId of groups[groupId].widgetIds) {
        if (!flat.includes(widgetId)) {
          flat.push(widgetId);
        }
      }
      continue;
    }
    if (!flat.includes(entry)) {
      flat.push(entry);
    }
  }
  return flat;
}

export function findBoardForWidgetInOrder(
  order: string[],
  groups: Record<string, WidgetBoardGroup>,
  widgetId: string,
): boolean {
  if (order.includes(widgetId)) {
    return true;
  }
  return findGroupContainingWidget(groups, widgetId) != null;
}

export function mergeWidgetsInBoard(
  order: string[],
  groups: Record<string, WidgetBoardGroup>,
  widgetA: string,
  widgetB: string,
): { order: string[]; groups: Record<string, WidgetBoardGroup> } {
  if (widgetA === widgetB) {
    return { order, groups };
  }

  const groupA = findGroupContainingWidget(groups, widgetA);
  const groupB = findGroupContainingWidget(groups, widgetB);

  const mergedIds: string[] = [];
  const dissolveIds: string[] = [];

  if (groupA) {
    mergedIds.push(...groups[groupA].widgetIds);
    dissolveIds.push(groupA);
  } else {
    mergedIds.push(widgetA);
  }

  if (groupB) {
    for (const id of groups[groupB].widgetIds) {
      if (!mergedIds.includes(id)) {
        mergedIds.push(id);
      }
    }
    if (!dissolveIds.includes(groupB)) {
      dissolveIds.push(groupB);
    }
  } else if (!mergedIds.includes(widgetB)) {
    mergedIds.push(widgetB);
  }

  const nextGroups = { ...groups };
  for (const gid of dissolveIds) {
    delete nextGroups[gid];
  }

  const newGroupId = createWidgetGroupId();
  nextGroups[newGroupId] = {
    id: newGroupId,
    widgetIds: mergedIds,
    layout: "row",
    splitSizes: equalGroupSplitSizes(mergedIds.length),
  };

  const removedEntries = new Set([
    ...dissolveIds.map(toWidgetGroupEntry),
    ...mergedIds,
  ]);

  const nextOrder: string[] = [];
  let groupInserted = false;

  for (const entry of order) {
    if (removedEntries.has(entry)) {
      if (!groupInserted) {
        nextOrder.push(toWidgetGroupEntry(newGroupId));
        groupInserted = true;
      }
      continue;
    }
    nextOrder.push(entry);
  }

  if (!groupInserted) {
    nextOrder.push(toWidgetGroupEntry(newGroupId));
  }

  return { order: nextOrder, groups: nextGroups };
}

export function dissolveWidgetGroup(
  order: string[],
  groups: Record<string, WidgetBoardGroup>,
  groupId: string,
): { order: string[]; groups: Record<string, WidgetBoardGroup> } {
  const group = groups[groupId];
  if (!group) {
    return { order, groups };
  }

  const entry = toWidgetGroupEntry(groupId);
  const index = order.indexOf(entry);
  const nextGroups = { ...groups };
  delete nextGroups[groupId];

  if (index < 0) {
    return { order, groups: nextGroups };
  }

  const nextOrder = [...order.slice(0, index), ...group.widgetIds, ...order.slice(index + 1)];
  return { order: nextOrder, groups: nextGroups };
}

export function reorderWidgetsInGroup(
  groups: Record<string, WidgetBoardGroup>,
  groupId: string,
  widgetIds: string[],
): Record<string, WidgetBoardGroup> {
  const group = groups[groupId];
  if (!group || group.widgetIds.join(",") === widgetIds.join(",")) {
    return groups;
  }
  return {
    ...groups,
    [groupId]: {
      ...group,
      widgetIds,
      splitSizes: equalGroupSplitSizes(widgetIds.length),
    },
  };
}

export function updateWidgetGroup(
  groups: Record<string, WidgetBoardGroup>,
  groupId: string,
  patch: Partial<Pick<WidgetBoardGroup, "layout" | "splitSizes">>,
): Record<string, WidgetBoardGroup> {
  const group = groups[groupId];
  if (!group) {
    return groups;
  }
  const layoutChanged = patch.layout != null && patch.layout !== group.layout;
  return {
    ...groups,
    [groupId]: {
      ...group,
      ...patch,
      splitSizes:
        patch.splitSizes ??
        (layoutChanged ? equalGroupSplitSizes(group.widgetIds.length) : group.splitSizes),
    },
  };
}

export function readWidgetBoardGroups<TBoardId extends string>(
  storageKey: string,
  boardIds: readonly TBoardId[],
): Record<TBoardId, Record<string, WidgetBoardGroup>> {
  const empty = Object.fromEntries(boardIds.map((id) => [id, {}])) as Record<
    TBoardId,
    Record<string, WidgetBoardGroup>
  >;
  if (typeof window === "undefined") {
    return empty;
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return empty;
    }
    const parsed = JSON.parse(raw) as Record<string, Record<string, WidgetBoardGroup>>;
    const next = { ...empty };
    for (const boardId of boardIds) {
      next[boardId] = parsed[boardId] ?? {};
    }
    return next;
  } catch {
    return empty;
  }
}

export function removeWidgetFromBoardLayout(
  order: string[],
  groups: Record<string, WidgetBoardGroup>,
  widgetId: string,
): { order: string[]; groups: Record<string, WidgetBoardGroup> } {
  let nextOrder = order.filter((entry) => entry !== widgetId);
  let nextGroups = { ...groups };

  for (const [groupId, group] of Object.entries(nextGroups)) {
    if (!group.widgetIds.includes(widgetId)) {
      continue;
    }
    const remaining = group.widgetIds.filter((id) => id !== widgetId);
    if (remaining.length <= 1) {
      const dissolved = dissolveWidgetGroup(nextOrder, nextGroups, groupId);
      nextOrder = dissolved.order;
      nextGroups = dissolved.groups;
      continue;
    }
    nextGroups[groupId] = {
      ...group,
      widgetIds: remaining,
      splitSizes: equalGroupSplitSizes(remaining.length),
    };
  }

  return { order: nextOrder, groups: nextGroups };
}

export function writeWidgetBoardGroups<TBoardId extends string>(
  storageKey: string,
  groups: Record<TBoardId, Record<string, WidgetBoardGroup>>,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(storageKey, JSON.stringify(groups));
}
