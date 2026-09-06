"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const SIDE_SLIDE_CLOSE_MS = 300;

interface SideSlidePanelProps {
  open: boolean;
  onClose: () => void;
  /** 关闭动画结束后触发，可用于延迟卸载子树 */
  onClosed?: () => void;
  children: ReactNode;
  className?: string;
  placement?: "left" | "right";
  /** 固定定位，覆盖视口（用于资源侧栏等全局场景） */
  fixed?: boolean;
}

export function SideSlidePanel({
  open,
  onClose,
  onClosed,
  children,
  className,
  placement = "right",
  fixed = false,
}: SideSlidePanelProps) {
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setRendered(true);
      setClosing(false);
      return;
    }

    if (!rendered) {
      return;
    }

    setClosing(true);
    const timer = window.setTimeout(() => {
      setRendered(false);
      setClosing(false);
      onClosed?.();
    }, SIDE_SLIDE_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [onClosed, open, rendered]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!rendered) {
    return null;
  }

  return (
    <>
      <div
        aria-hidden
        className={cn(
          "lh-side-slide-overlay",
          fixed && "lh-side-slide-overlay--fixed",
          closing && "lh-side-slide-overlay--closing",
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          "lh-side-slide-panel",
          fixed && "lh-side-slide-panel--fixed",
          placement === "left" && "lh-side-slide-panel--left",
          closing && "lh-side-slide-panel--closing",
          className,
        )}
      >
        {children}
      </div>
    </>
  );
}
