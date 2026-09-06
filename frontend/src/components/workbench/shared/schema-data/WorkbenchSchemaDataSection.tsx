import { GripVertical } from "lucide-react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import type { CSSProperties, ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { FormSchema } from "@/low-code/schema/types";
import type { WorkbenchPanelSectionRenderContext } from "../panel-sections/types";
import { SchemaDataView, type SchemaDataViewMode } from "./SchemaDataView";
import { SchemaDataViewToggle } from "./SchemaDataViewToggle";

export interface WorkbenchSchemaDataSectionProps {
  id: string;
  title: string;
  data?: Record<string, unknown>;
  schema?: FormSchema | null;
  viewMode: SchemaDataViewMode;
  onViewModeChange: (mode: SchemaDataViewMode) => void;
  sortable?: boolean;
  dragHandleProps?: {
    attributes: DraggableAttributes;
    listeners: SyntheticListenerMap | undefined;
  };
  dragStyle?: CSSProperties;
  setNodeRef?: (node: HTMLElement | null) => void;
  isDragging?: boolean;
  className?: string;
  emptyMessage?: string;
  fillHeight?: boolean;
  compactHeader?: boolean;
  hideViewToggle?: boolean;
  /** 独立 widget tab：隐藏区块标题与边框，避免与 tab 胶囊重复 */
  standaloneTab?: boolean;
  /** 仅展示标注填写项，隐藏题目上下文只读控件 */
  annotateOnly?: boolean;
  headerExtra?: ReactNode;
  bodyLead?: ReactNode;
  renderBody?: (context: WorkbenchPanelSectionRenderContext) => ReactNode | null;
}

export function WorkbenchSchemaDataSection({
  id,
  title,
  data,
  schema,
  viewMode,
  onViewModeChange,
  sortable = false,
  dragHandleProps,
  dragStyle,
  setNodeRef,
  isDragging = false,
  className,
  emptyMessage,
  fillHeight = false,
  compactHeader = false,
  hideViewToggle = false,
  standaloneTab = false,
  annotateOnly = false,
  headerExtra,
  bodyLead,
  renderBody,
}: WorkbenchSchemaDataSectionProps) {
  const sectionData = data ?? {};
  const customBody = renderBody?.({ viewMode });
  const bodyContent =
    customBody != null ? (
      customBody
    ) : (
      <SchemaDataView
        data={sectionData}
        schema={schema}
        mode={viewMode}
        emptyMessage={emptyMessage}
        annotateOnly={annotateOnly}
      />
    );
  const showTitleHeader = !standaloneTab;
  const showViewToggleBar = standaloneTab && !hideViewToggle;

  return (
    <section
      ref={setNodeRef}
      style={dragStyle}
      data-section-id={id}
      className={cn(
        "flex flex-col",
        standaloneTab
          ? "h-full min-h-0 flex-1 overflow-hidden bg-transparent"
          : "rounded-none border border-border/80 bg-card/95",
        fillHeight ? "h-full min-h-0 flex-1 overflow-hidden" : "shrink-0",
        isDragging && "z-10 ring-2 ring-primary/30",
        className,
      )}
    >
      {showTitleHeader ? (
        <div className="shrink-0 border-b border-border/70">
          <div
            className={cn(
              "flex items-center gap-1",
              compactHeader ? "px-2 py-1" : "px-2.5 py-1.5",
            )}
          >
            {sortable ? (
              <button
                type="button"
                className="cursor-grab rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
                title="拖动排序"
                {...dragHandleProps?.attributes}
                {...dragHandleProps?.listeners}
              >
                <GripVertical className="h-4 w-4" />
              </button>
            ) : null}
            <p className="min-w-0 flex-1 truncate px-1 text-sm font-semibold text-foreground">{title}</p>
            {hideViewToggle ? null : (
              <SchemaDataViewToggle value={viewMode} onChange={onViewModeChange} compact={compactHeader} />
            )}
          </div>
          {headerExtra ? (
            <div className="border-t border-border/50 px-2.5 py-2">{headerExtra}</div>
          ) : null}
        </div>
      ) : showViewToggleBar ? (
        <div className="flex shrink-0 items-center justify-end gap-1 px-3 py-1">
          <SchemaDataViewToggle value={viewMode} onChange={onViewModeChange} compact />
        </div>
      ) : null}
      <div
        className={cn(
          standaloneTab ? "px-3 py-2.5" : "px-3 py-3",
          fillHeight && "h-0 min-h-0 flex-1 overflow-y-auto overscroll-contain",
        )}
      >
        {bodyLead ? <div className="mb-3">{bodyLead}</div> : null}
        {bodyContent}
      </div>
    </section>
  );
}

interface SortableSchemaDataSectionProps extends Omit<
  WorkbenchSchemaDataSectionProps,
  "sortable" | "dragHandleProps" | "dragStyle" | "setNodeRef" | "isDragging"
> {
  disabled?: boolean;
}

export function SortableSchemaDataSection({ id, disabled = false, ...props }: SortableSchemaDataSectionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  const dragStyle: CSSProperties = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    transition: isDragging ? transition : undefined,
  };

  return (
    <WorkbenchSchemaDataSection
      {...props}
      id={id}
      sortable
      isDragging={isDragging}
      setNodeRef={setNodeRef}
      dragStyle={dragStyle}
      dragHandleProps={{ attributes, listeners }}
    />
  );
}
