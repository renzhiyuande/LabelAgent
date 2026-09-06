import { useCallback } from "react";
import { cn } from "@/lib/utils";

interface WorkbenchResizeHandleProps {
  orientation: "vertical" | "horizontal";
  onDrag: (delta: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  className?: string;
}

export function WorkbenchResizeHandle({
  orientation,
  onDrag,
  onDragStart,
  onDragEnd,
  className,
}: WorkbenchResizeHandleProps) {
  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const target = event.currentTarget;
      target.setPointerCapture(event.pointerId);
      onDragStart?.();
      let start = orientation === "vertical" ? event.clientX : event.clientY;

      function handleMove(moveEvent: PointerEvent) {
        const current = orientation === "vertical" ? moveEvent.clientX : moveEvent.clientY;
        const delta = current - start;
        if (delta !== 0) {
          onDrag(delta);
          start = current;
        }
      }

      function handleUp(moveEvent: PointerEvent) {
        if (target.hasPointerCapture(moveEvent.pointerId)) {
          target.releasePointerCapture(moveEvent.pointerId);
        }
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);
        onDragEnd?.();
      }

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
    },
    [onDrag, onDragEnd, onDragStart, orientation],
  );

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      data-workbench-resize-handle=""
      onPointerDown={handlePointerDown}
      className={cn(
        "group relative z-20 shrink-0 touch-none bg-transparent",
        orientation === "vertical" ? "w-4 cursor-col-resize" : "h-4 min-h-4 cursor-row-resize",
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-0 rounded-full opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100",
          "group-hover:bg-primary/10 group-active:bg-primary/15",
          orientation === "vertical" ? "mx-auto w-full" : "my-auto h-full",
        )}
      />
      <div
        className={cn(
          "absolute rounded-full opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100",
          "bg-slate-300/90 group-hover:bg-primary/80 dark:bg-slate-700",
          orientation === "vertical"
            ? "bottom-4 left-1/2 top-4 w-1 -translate-x-1/2"
            : "left-4 right-4 top-1/2 h-1 -translate-y-1/2",
        )}
      />
    </div>
  );
}
