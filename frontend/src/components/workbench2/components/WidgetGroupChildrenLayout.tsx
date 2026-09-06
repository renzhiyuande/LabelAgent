import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WidgetBoardGroup } from "../utils/widget-board-groups";
import type { EditableWidgetItem } from "./EditableWidgetBoard";
import { ResizableWidgetSplit } from "./ResizableWidgetSplit";
import { WidgetGroupChildrenSortable } from "./WidgetGroupChildSortable";

interface WidgetGroupChildrenLayoutProps {
  group: WidgetBoardGroup;
  childItems: EditableWidgetItem[];
  editing: boolean;
  renderPane: (item: EditableWidgetItem) => ReactNode;
  onGroupSplitSizesChange?: (groupId: string, sizes: number[]) => void;
  onWidgetIdsReorder?: (widgetIds: string[]) => void;
}

export function WidgetGroupChildrenLayout({
  group,
  childItems,
  editing,
  renderPane,
  onGroupSplitSizesChange,
  onWidgetIdsReorder,
}: WidgetGroupChildrenLayoutProps) {
  const [groupTab, setGroupTab] = useState(childItems[0]?.id ?? "");
  const widgetIds = childItems.map((item) => item.id);

  function wrapChild(item: EditableWidgetItem, className?: string) {
    return (
      <div
        key={item.id}
        className={cn("flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden", className)}
      >
        {renderPane(item)}
      </div>
    );
  }

  function wrapChildren(content: ReactNode, layoutClassName?: string) {
    return (
      <WidgetGroupChildrenSortable
        widgetIds={widgetIds}
        editing={editing}
        onReorder={onWidgetIdsReorder}
        className={cn("h-full min-h-0 w-full overflow-hidden", layoutClassName)}
      >
        {content}
      </WidgetGroupChildrenSortable>
    );
  }

  if (group.layout === "tabs") {
    const activeChild = childItems.find((item) => item.id === groupTab) ?? childItems[0];
    const tabsBody = (
      <div className="flex h-full min-h-0 flex-col gap-2">
        <div className="lh-scrollbar-none flex shrink-0 flex-wrap gap-1.5">
          {childItems.map((child) => (
            <Button
              key={child.id}
              type="button"
              size="sm"
              variant={groupTab === child.id ? "default" : "outline"}
              className="h-7 rounded-lg px-2 text-xs"
              onClick={() => setGroupTab(child.id)}
            >
              {child.title}
            </Button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {activeChild ? wrapChild(activeChild) : null}
        </div>
      </div>
    );
    return wrapChildren(tabsBody);
  }

  const direction = group.layout === "row" ? "horizontal" : "vertical";
  const canResize = Boolean(onGroupSplitSizesChange) && childItems.length > 1;

  if (canResize) {
    const splitBody = (
      <ResizableWidgetSplit
        paneIds={widgetIds}
        sizes={group.splitSizes}
        onSizesChange={(sizes) => onGroupSplitSizesChange?.(group.id, sizes)}
        direction={direction}
        resizeEnabled={!editing}
        className="h-full min-h-0 flex-1"
      >
        {(_, index) => {
          const child = childItems[index];
          if (!child) {
            return null;
          }
          return wrapChild(child);
        }}
      </ResizableWidgetSplit>
    );
    return wrapChildren(splitBody, "h-full min-h-0 flex-1");
  }

  const stackBody = (
    <div
      className={cn(
        "flex h-full min-h-0 flex-1 gap-2 overflow-hidden",
        group.layout === "row" ? "flex-row" : "flex-col",
      )}
    >
      {childItems.map((child) =>
        wrapChild(child, group.layout === "row" ? "min-w-0 flex-1" : undefined),
      )}
    </div>
  );
  return wrapChildren(stackBody, "h-full min-h-0 flex-1");
}
