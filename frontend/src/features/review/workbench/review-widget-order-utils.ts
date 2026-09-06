import {
  parseWidgetGroupEntry,
  type WidgetBoardGroup,
} from "@/components/workbench2/utils/widget-board-groups";
import { isReviewWidgetId } from "./review-widget-registry";

export function collectWidgetsFromBoardOrder(
  order: string[],
  groups: Record<string, WidgetBoardGroup>,
): Set<string> {
  const placed = new Set<string>();
  for (const entryId of order) {
    if (isReviewWidgetId(entryId)) {
      placed.add(entryId);
    }
    const groupId = parseWidgetGroupEntry(entryId);
    if (groupId && groups[groupId]) {
      for (const widgetId of groups[groupId].widgetIds) {
        placed.add(widgetId);
      }
    }
  }
  return placed;
}

/** 去掉已收入组合视图、却又单独出现在 order 里的 widget */
export function removeGroupedWidgetDuplicates(
  order: string[],
  groups: Record<string, WidgetBoardGroup>,
): string[] {
  const groupedOnly = new Set<string>();
  for (const entryId of order) {
    const groupId = parseWidgetGroupEntry(entryId);
    if (groupId && groups[groupId]) {
      for (const widgetId of groups[groupId].widgetIds) {
        groupedOnly.add(widgetId);
      }
    }
  }
  return order.filter((entryId) => {
    if (isReviewWidgetId(entryId) && groupedOnly.has(entryId)) {
      return false;
    }
    return true;
  });
}
