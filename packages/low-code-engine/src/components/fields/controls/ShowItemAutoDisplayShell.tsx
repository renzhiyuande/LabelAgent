"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  resolveShowItemAutoShellHeight,
  SHOW_ITEM_DISPLAY_HEIGHT_BOUNDS,
} from "../show-item-utils";

const displayShellClass =
  "lh-show-item-display w-full rounded-md border border-border/80 bg-muted/40 p-2";

const RESIZE_HANDLE_ZONE_PX = 14;

interface ShowItemAutoDisplayShellProps {
  children: ReactNode;
  /** 内容变化时重新测量初始高度 */
  measureKey: string;
}

export function ShowItemAutoDisplayShell({ children, measureKey }: ShowItemAutoDisplayShellProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const userTunedRef = useRef(false);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    userTunedRef.current = false;
    setHeight(undefined);
  }, [measureKey]);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content || userTunedRef.current) {
      return;
    }

    function measure() {
      if (userTunedRef.current) {
        return;
      }
      setHeight(resolveShowItemAutoShellHeight(content!.scrollHeight));
    }

    measure();

    const observer = new ResizeObserver(() => {
      measure();
    });
    observer.observe(content);

    return () => {
      observer.disconnect();
    };
  }, [measureKey]);

  function onShellMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }
    const rect = shell.getBoundingClientRect();
    if (event.clientY >= rect.bottom - RESIZE_HANDLE_ZONE_PX) {
      userTunedRef.current = true;
    }
  }

  return (
    <div
      ref={shellRef}
      className={`${displayShellClass} lh-show-item-display--auto`}
      style={{
        height: height != null ? height : undefined,
        maxHeight: SHOW_ITEM_DISPLAY_HEIGHT_BOUNDS.max,
      }}
      onMouseDown={onShellMouseDown}
    >
      <div ref={contentRef} className="lh-show-item-display__content">
        {children}
      </div>
    </div>
  );
}
