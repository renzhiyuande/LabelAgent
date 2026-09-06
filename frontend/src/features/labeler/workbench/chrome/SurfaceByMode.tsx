import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LabelerWorkbenchViewMode } from "../LabelerSlotFrame";
import { JsonPanel } from "./JsonPanel";

export function SurfaceByMode({
  mode,
  children,
  jsonData,
  surfaceClassName,
}: {
  mode: LabelerWorkbenchViewMode;
  children: ReactNode;
  jsonData: unknown;
  surfaceClassName?: string;
}) {
  if (mode === "json") {
    return <JsonPanel data={jsonData} />;
  }

  return (
    <div className={cn("min-h-0 flex-1 overflow-hidden", surfaceClassName)}>
      {children}
    </div>
  );
}
