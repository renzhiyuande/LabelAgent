import { useCallback } from "react";
import { cn } from "@/lib/utils";

interface ResizeDividerProps {
  orientation: "vertical" | "horizontal";
  onDrag: (delta: number) => void;
}

export function ResizeDivider({ orientation, onDrag }: ResizeDividerProps) {
  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      let start = orientation === "vertical" ? event.clientX : event.clientY;

      function handleMove(moveEvent: PointerEvent) {
        const current = orientation === "vertical" ? moveEvent.clientX : moveEvent.clientY;
        const delta = current - start;
        if (delta !== 0) {
          onDrag(delta);
          start = current;
        }
      }

      function handleUp() {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      }

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [onDrag, orientation],
  );

  return (
    <div
      role="separator"
      data-workbench-resize
      aria-orientation={orientation}
      title={orientation === "vertical" ? "拖动调整列宽" : "拖动调整行高"}
      onPointerDown={handlePointerDown}
      className={cn(
        "group z-20 shrink-0 touch-none bg-transparent",
        orientation === "vertical"
          ? "w-2 cursor-col-resize hover:bg-primary/15 active:bg-primary/25"
          : "h-2 cursor-row-resize hover:bg-primary/15 active:bg-primary/25",
      )}
    >
      <div
        className={cn(
          "mx-auto rounded-full bg-slate-300/90 transition-colors group-hover:bg-primary/80 dark:bg-slate-600",
          orientation === "vertical" ? "h-16 w-1" : "h-1 w-16",
        )}
      />
    </div>
  );
}
