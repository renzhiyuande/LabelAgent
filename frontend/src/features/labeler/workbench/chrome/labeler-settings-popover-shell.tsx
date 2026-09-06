import type { ReactNode } from "react";
import { PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface LabelerSettingsPopoverShellProps {
  children: ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
  widthClassName?: string;
}

export function LabelerSettingsPopoverShell({
  children,
  align = "end",
  className,
  widthClassName = "w-80",
}: LabelerSettingsPopoverShellProps) {
  return (
    <PopoverContent
      align={align}
      sideOffset={10}
      className={cn(
        widthClassName,
        "max-h-[min(85vh,720px)] overflow-hidden rounded-[24px] p-0",
        className,
      )}
    >
      <div className="max-h-[min(85vh,720px)] overflow-y-auto p-4">{children}</div>
    </PopoverContent>
  );
}
