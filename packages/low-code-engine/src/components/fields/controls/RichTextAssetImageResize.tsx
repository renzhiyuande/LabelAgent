"use client";

import { useEffect, type RefObject } from "react";
import type { RichTextImageDisplayConfig } from "../show-item-utils";
import { readRichTextImageHeight, setRichTextImageHeight } from "../show-item-utils";

const RESIZE_ZONE_PX = 14;
const MIN_HEIGHT = 80;
const MAX_HEIGHT = 640;

function clampHeight(height: number): number {
  return Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.round(height)));
}

function isInResizeZone(img: HTMLImageElement, clientY: number): boolean {
  const rect = img.getBoundingClientRect();
  return clientY >= rect.bottom - RESIZE_ZONE_PX;
}

export function useRichTextAssetImageDragResize({
  rootRef,
  enabled,
  config,
  onContentChange,
}: {
  rootRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  config: RichTextImageDisplayConfig;
  onContentChange?: () => void;
}) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !enabled) {
      return;
    }

    let activeImage: HTMLImageElement | null = null;
    let startY = 0;
    let startHeight = 0;

    function finishDrag() {
      if (activeImage) {
        onContentChange?.();
      }
      activeImage = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onDocumentMouseMove);
      document.removeEventListener("mouseup", onDocumentMouseUp);
    }

    function onDocumentMouseMove(event: MouseEvent) {
      if (!activeImage) {
        return;
      }
      event.preventDefault();
      const delta = event.clientY - startY;
      setRichTextImageHeight(activeImage, clampHeight(startHeight + delta), config);
    }

    function onDocumentMouseUp() {
      finishDrag();
    }

    function onMouseDown(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const img = target?.closest("img[data-lh-file-id]") as HTMLImageElement | null;
      if (!img || !root?.contains(img) || !isInResizeZone(img, event.clientY)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      activeImage = img;
      startY = event.clientY;
      startHeight = readRichTextImageHeight(img, config);
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onDocumentMouseMove);
      document.addEventListener("mouseup", onDocumentMouseUp);
    }

    function onMouseMove(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const img = target?.closest("img[data-lh-file-id]") as HTMLImageElement | null;
      if (!img || !root?.contains(img) || activeImage) {
        return;
      }
      (img as HTMLImageElement & { style: CSSStyleDeclaration }).style.cursor = isInResizeZone(
        img,
        event.clientY,
      )
        ? "ns-resize"
        : "";
    }

    function onMouseLeave(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const img = target?.closest("img[data-lh-file-id]") as HTMLImageElement | null;
      if (img && root?.contains(img)) {
        img.style.cursor = "";
      }
    }

    root.addEventListener("mousedown", onMouseDown);
    root.addEventListener("mousemove", onMouseMove);
    root.addEventListener("mouseleave", onMouseLeave);
    return () => {
      finishDrag();
      root.removeEventListener("mousedown", onMouseDown);
      root.removeEventListener("mousemove", onMouseMove);
      root.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [rootRef, enabled, config, onContentChange]);
}
