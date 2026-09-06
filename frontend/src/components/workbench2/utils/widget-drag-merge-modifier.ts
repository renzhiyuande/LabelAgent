import type { DragEndEvent } from "@dnd-kit/core";

let mergeModifierActive = false;
let stopTracking: (() => void) | null = null;
let modifierListener: ((active: boolean) => void) | null = null;

export function setWidgetDragMergeModifierListener(listener: ((active: boolean) => void) | null): void {
  modifierListener = listener;
}

export function readPointerMergeModifier(event: Event | null | undefined): boolean {
  if (!event || typeof event !== "object") {
    return false;
  }
  const pointer = event as PointerEvent & { altKey?: boolean };
  return Boolean(pointer.shiftKey || pointer.altKey);
}

export function readWidgetDragMergeModifier(): boolean {
  return mergeModifierActive;
}

export function isDragMergeModifier(event: DragEndEvent): boolean {
  return readPointerMergeModifier(event.activatorEvent) || mergeModifierActive;
}

export function startWidgetDragMergeModifierTracking(
  activatorEvent: Event | null,
  onChange?: (active: boolean) => void,
): void {
  stopWidgetDragMergeModifierTracking();

  const apply = (event: Event | null) => {
    const next = readPointerMergeModifier(event);
    if (next === mergeModifierActive) {
      return;
    }
    mergeModifierActive = next;
    onChange?.(next);
    modifierListener?.(next);
  };

  apply(activatorEvent);
  const onPointerMove = (event: Event) => apply(event);
  const onKeyChange = (event: Event) => apply(event);

  window.addEventListener("pointermove", onPointerMove, true);
  window.addEventListener("keydown", onKeyChange, true);
  window.addEventListener("keyup", onKeyChange, true);

  stopTracking = () => {
    window.removeEventListener("pointermove", onPointerMove, true);
    window.removeEventListener("keydown", onKeyChange, true);
    window.removeEventListener("keyup", onKeyChange, true);
    mergeModifierActive = false;
    onChange?.(false);
    stopTracking = null;
  };
}

export function stopWidgetDragMergeModifierTracking(): void {
  stopTracking?.();
}
