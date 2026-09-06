import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface WorkbenchShellProps {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  enterAnimationClass?: string;
}

export function WorkbenchShell({
  header,
  footer,
  children,
  className,
  enterAnimationClass = "lh-workbench-enter",
}: WorkbenchShellProps) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col", enterAnimationClass, className)}>
      {header}
      {children}
      {footer}
    </div>
  );
}
