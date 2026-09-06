import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface LabelerPanelScrollAreaProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

/** 标注工作台 panel / widget 内可滚动内容区（flex 子项需配合 min-h-0） */
export function LabelerPanelScrollArea({
  children,
  className,
  contentClassName,
}: LabelerPanelScrollAreaProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
      <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", contentClassName)}>
        {children}
      </div>
    </div>
  );
}
