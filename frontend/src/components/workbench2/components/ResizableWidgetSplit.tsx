import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { WorkbenchResizeHandle } from "../core/WorkbenchResizeHandle";
import { normalizeSplitSizes } from "./resizable-widget-split";

export type WidgetSplitDirection = "horizontal" | "vertical";

const HANDLE_TRACK = "6px";

interface ResizableWidgetSplitProps {
  paneIds: string[];
  sizes: number[];
  onSizesChange: (sizes: number[]) => void;
  /** horizontal = 左右并排；vertical = 上下堆叠 */
  direction: WidgetSplitDirection;
  /** 编辑布局时关闭，避免与组件拖动手柄抢指针 */
  resizeEnabled?: boolean;
  /** 为 true 时该 pane 按内容高度占位（仅纵向 stack），不参与 fr 比例 */
  paneAutoSizes?: boolean[];
  className?: string;
  children: (paneId: string, index: number) => ReactNode;
}

function resizablePanePairs(paneAutoSizes: boolean[] | undefined, paneCount: number): Array<[number, number]> {
  const autoFlags = paneAutoSizes ?? Array.from({ length: paneCount }, () => false);
  const pairs: Array<[number, number]> = [];
  for (let index = 0; index < paneCount - 1; index += 1) {
    if (!autoFlags[index] && !autoFlags[index + 1]) {
      pairs.push([index, index + 1]);
    }
  }
  return pairs;
}

function normalizedFrSizes(sizes: number[], paneAutoSizes: boolean[] | undefined, paneCount: number): number[] {
  const autoFlags = paneAutoSizes ?? Array.from({ length: paneCount }, () => false);
  const frIndices = autoFlags.map((auto, index) => (auto ? -1 : index)).filter((index) => index >= 0);
  if (frIndices.length === 0) {
    return [];
  }
  const frRaw = frIndices.map((index) => sizes[index] ?? 1);
  const normalized = normalizeSplitSizes(frRaw, frRaw.length);
  const result = [...sizes];
  frIndices.forEach((paneIndex, frIndex) => {
    result[paneIndex] = normalized[frIndex];
  });
  return result;
}

function buildGridTemplate(
  sizes: number[],
  includeHandles: boolean,
  direction: WidgetSplitDirection,
  paneAutoSizes?: boolean[],
): string {
  const isVertical = direction === "vertical";
  const autoFlags = paneAutoSizes ?? Array.from({ length: sizes.length }, () => false);
  const frSizes = isVertical ? normalizedFrSizes(sizes, paneAutoSizes, sizes.length) : sizes;
  const tracks: string[] = [];
  sizes.forEach((size, index) => {
    if (isVertical && autoFlags[index]) {
      tracks.push("auto");
    } else {
      const frValue = isVertical ? frSizes[index] : size;
      tracks.push(`${frValue}fr`);
    }
    if (
      includeHandles &&
      index < sizes.length - 1 &&
      (!isVertical || (!autoFlags[index] && !autoFlags[index + 1]))
    ) {
      tracks.push(HANDLE_TRACK);
    }
  });
  return tracks.join(" ");
}

export function ResizableWidgetSplit({
  paneIds,
  sizes,
  onSizesChange,
  direction,
  resizeEnabled = true,
  paneAutoSizes,
  className,
  children,
}: ResizableWidgetSplitProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isHorizontal = direction === "horizontal";
  const normalizedSizes = isHorizontal
    ? normalizeSplitSizes(sizes, paneIds.length)
    : normalizedFrSizes(sizes, paneAutoSizes, paneIds.length);
  const sizesRef = useRef<number[]>(normalizedSizes);
  const resizePairs = resizablePanePairs(paneAutoSizes, paneIds.length);

  useEffect(() => {
    sizesRef.current = isHorizontal
      ? normalizeSplitSizes(sizes, paneIds.length)
      : normalizedFrSizes(sizes, paneAutoSizes, paneIds.length);
  }, [isHorizontal, paneIds.length, paneAutoSizes?.join(","), sizes.join(",")]);

  function applyResize(handleIndex: number, delta: number, axis: "x" | "y") {
    const length =
      axis === "x" ? (containerRef.current?.offsetWidth ?? 0) : (containerRef.current?.offsetHeight ?? 0);
    if (length <= 0) {
      return;
    }
    const pair = resizePairs[handleIndex];
    if (!pair) {
      return;
    }
    const [leftIndex, rightIndex] = pair;
    const next = [...sizesRef.current];
    const left = next[leftIndex];
    const right = next[rightIndex];
    const pairTotal = left + right;
    let nextLeft = left + delta / length;
    const minFraction = 0.12;
    nextLeft = Math.max(minFraction, Math.min(pairTotal - minFraction, nextLeft));
    next[leftIndex] = nextLeft;
    next[rightIndex] = pairTotal - nextLeft;
    const normalized = isHorizontal
      ? normalizeSplitSizes(next, next.length)
      : normalizedFrSizes(next, paneAutoSizes, next.length);
    sizesRef.current = normalized;
    onSizesChange(normalized);
  }

  function renderHandle(paneId: string, index: number, axis: "x" | "y", className?: string) {
    return (
      <WorkbenchResizeHandle
        key={`split-handle-${axis}-${paneId}`}
        orientation={axis === "x" ? "vertical" : "horizontal"}
        className={cn("z-30 shrink-0", axis === "x" ? "min-w-6" : "min-h-6", className)}
        onDrag={(delta) => applyResize(index, delta, axis)}
      />
    );
  }

  if (paneIds.length === 0) {
    return null;
  }

  if (paneIds.length === 1) {
    return (
      <div ref={containerRef} className={cn("flex h-full min-h-0 flex-1 overflow-hidden", className)}>
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children(paneIds[0], 0)}
        </div>
      </div>
    );
  }

  if (!isHorizontal) {
    const autoFlags = paneAutoSizes ?? Array.from({ length: paneIds.length }, () => false);
    return (
      <div
        ref={containerRef}
        className={cn("grid h-full min-h-0 flex-1 overflow-hidden", className)}
        style={{ gridTemplateRows: buildGridTemplate(normalizedSizes, resizeEnabled, direction, paneAutoSizes) }}
      >
        {paneIds.flatMap((paneId, index) => {
          const nodes: ReactNode[] = [
            <div
              key={paneId}
              className={cn(
                "flex min-w-0 flex-col overflow-hidden",
                autoFlags[index] ? "h-auto shrink-0" : "h-full min-h-0",
              )}
            >
              {children(paneId, index)}
            </div>,
          ];
          if (resizeEnabled && index < paneIds.length - 1 && !autoFlags[index] && !autoFlags[index + 1]) {
            const handleIndex = resizePairs.findIndex(([left]) => left === index);
            nodes.push(renderHandle(paneId, handleIndex, "y"));
          }
          return nodes;
        })}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("grid h-full min-h-0 flex-1 overflow-hidden", className)}
      style={{ gridTemplateColumns: buildGridTemplate(normalizedSizes, resizeEnabled, direction, paneAutoSizes) }}
    >
      {paneIds.flatMap((paneId, index) => {
        const nodes: ReactNode[] = [
          <div key={paneId} className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
            {children(paneId, index)}
          </div>,
        ];
        if (resizeEnabled && index < paneIds.length - 1) {
          nodes.push(renderHandle(paneId, index, "x"));
        }
        return nodes;
      })}
    </div>
  );
}
