"use client";

import { Info, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function readDismissed(storageKey: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(storageKey) === "1";
}

function writeDismissed(storageKey: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(storageKey, "1");
}

export interface DismissibleHintProps {
  storageKey: string;
  children: ReactNode;
  className?: string;
  compact?: boolean;
  dismissLabel?: string;
}

export function DismissibleHint({
  storageKey,
  children,
  className,
  compact = false,
  dismissLabel = "关闭提示",
}: DismissibleHintProps) {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(readDismissed(storageKey));
    setReady(true);
  }, [storageKey]);

  if (!ready || dismissed) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative flex gap-2 rounded-lg border border-border/80 bg-muted/40 pr-8 text-foreground",
        compact ? "px-2.5 py-2 text-[11px] leading-snug" : "px-3 py-2.5 text-xs leading-relaxed",
        className,
      )}
      role="note"
    >
      <Info
        className={cn("shrink-0 text-muted-foreground", compact ? "mt-0.5 h-3.5 w-3.5" : "mt-0.5 h-4 w-4")}
        aria-hidden
      />
      <div className="min-w-0 flex-1">{children}</div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "absolute right-0.5 top-0.5 text-muted-foreground hover:text-foreground",
          compact ? "h-6 w-6" : "h-7 w-7",
        )}
        aria-label={dismissLabel}
        onClick={() => {
          writeDismissed(storageKey);
          setDismissed(true);
        }}
      >
        <X className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </Button>
    </div>
  );
}
