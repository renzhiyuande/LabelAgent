import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pin } from "lucide-react";
import { forwardRef, type ComponentPropsWithoutRef, type MouseEvent, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  WorkbenchGlobalDragState,
  WorkbenchRegionId,
  WorkbenchSlotProvider,
  WorkbenchTabItem as WorkbenchTabItemModel,
} from "../types";

interface WorkbenchTabItemProps<TBusinessContext> extends Omit<ComponentPropsWithoutRef<typeof Button>, "onClick"> {
  tab: WorkbenchTabItemModel;
  regionId: WorkbenchRegionId;
  active: boolean;
  editing?: boolean;
  iconOnly?: boolean;
  compact?: boolean;
  provider: WorkbenchSlotProvider<TBusinessContext>;
  businessContext: TBusinessContext;
  badge?: ReactNode;
  customLabel?: ReactNode;
  onClick?: ComponentPropsWithoutRef<typeof Button>["onClick"];
  onActivate: (tabId: string) => void;
  dragState: WorkbenchGlobalDragState;
}

function assignButtonRef(
  node: HTMLButtonElement | null,
  refs: Array<((node: HTMLButtonElement | null) => void) | { current: HTMLButtonElement | null } | null | undefined>,
) {
  refs.forEach((ref) => {
    if (!ref) {
      return;
    }
    if (typeof ref === "function") {
      ref(node);
      return;
    }
    ref.current = node;
  });
}

function WorkbenchTabItemInner<TBusinessContext>(
  {
    tab,
    regionId,
    active,
    editing = false,
    iconOnly = false,
    compact = false,
    provider,
    businessContext: _businessContext,
    badge,
    customLabel,
    onActivate,
    dragState,
    onClick,
    ...buttonProps
  }: WorkbenchTabItemProps<TBusinessContext>,
  forwardedRef: React.ForwardedRef<HTMLButtonElement>,
) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.id,
    disabled: !editing,
    data: {
      type: "workbench-tab-item",
      tabId: tab.id,
      sourceRegionId: regionId,
    },
  });

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);
    if (event.defaultPrevented) {
      return;
    }
    onActivate(tab.id);
  }

  const dragHandleProps = editing ? { ...attributes, ...listeners } : undefined;

  return (
    <Button
      ref={(node) => assignButtonRef(node, [setNodeRef, forwardedRef])}
      type="button"
      variant={active ? "default" : "ghost"}
      size="sm"
      onClick={handleClick}
      {...dragHandleProps}
      className={cn(
        "group relative min-w-0 max-w-full flex-nowrap justify-start gap-2 overflow-hidden rounded-2xl text-left whitespace-nowrap",
        editing && "cursor-grab active:cursor-grabbing",
        compact ? "h-8 gap-1.5 px-2 py-1 text-xs" : "h-10 px-3 py-2",
        compact &&
          "!transition-none hover:translate-y-0 hover:shadow-none active:translate-y-0",
        iconOnly && (compact ? "h-8 w-8 min-w-8 max-w-8 justify-center px-0" : "h-12 w-12 min-w-12 max-w-12 justify-center px-0"),
        active
          ? "border border-primary/30 shadow-[0_10px_22px_hsl(var(--primary)/0.16)]"
          : "border border-transparent hover:border-border",
        isDragging && "pointer-events-none opacity-60",
        dragState.activeTabId === tab.id && "ring-2 ring-primary/20 dark:ring-primary/40",
      )}
      style={{
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        transition: editing ? transition : undefined,
      }}
      title={iconOnly ? tab.label : undefined}
      aria-label={editing && !iconOnly ? `拖拽标签 ${tab.label}` : undefined}
      {...buttonProps}
    >
      {editing ? (
        <span className="flex shrink-0 items-center text-slate-400" aria-hidden>
          <GripVertical className="h-4 w-4" />
        </span>
      ) : null}
      <span className={cn("min-w-0 flex-1", iconOnly && "flex-none")}>
        {iconOnly ? (
          provider.icon ? (
            <span className="shrink-0 text-slate-600 dark:text-slate-300">{provider.icon}</span>
          ) : (
            <span className="text-[10px] font-semibold leading-none">{tab.label.slice(0, 2)}</span>
          )
        ) : (
          customLabel ?? (
            <span className="flex min-w-0 items-center gap-2 whitespace-nowrap">
              {provider.icon ? <span className="shrink-0 text-slate-500">{provider.icon}</span> : null}
              <span className="truncate">{tab.label}</span>
              {editing && tab.pinned ? <Pin className="h-3.5 w-3.5 shrink-0 text-amber-500" /> : null}
            </span>
          )
        )}
      </span>
      {!iconOnly && badge ? <Badge variant="secondary" className="shrink-0">{badge}</Badge> : null}
    </Button>
  );
}

export const WorkbenchTabItem = forwardRef(WorkbenchTabItemInner) as <TBusinessContext>(
  props: WorkbenchTabItemProps<TBusinessContext> & { ref?: React.ForwardedRef<HTMLButtonElement> },
) => ReactNode;
