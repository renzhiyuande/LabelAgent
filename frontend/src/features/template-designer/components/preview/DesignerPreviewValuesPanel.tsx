"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface DesignerPreviewValuesPanelProps {
  values: Record<string, unknown>;
}

export function DesignerPreviewValuesPanel({ values }: DesignerPreviewValuesPanelProps) {
  const keyCount = Object.keys(values).length;
  const jsonText = JSON.stringify(values, null, 2);

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="p-3">
        <div className="rounded-xl border border-border/80 bg-card/95 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">JSON</p>
          {keyCount === 0 ? (
            <p className="text-sm text-muted-foreground">暂无表单值</p>
          ) : (
            <pre
              className={cn(
                "overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-2.5",
                "font-mono text-xs leading-5 text-foreground",
              )}
            >
              {jsonText}
            </pre>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
