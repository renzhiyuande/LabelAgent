import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface SidebarRevealTextProps {
  collapsed: boolean;
  children: ReactNode;
  className?: string;
}

/** 侧栏收起时隐藏文案，展开时淡入滑入 */
export function SidebarRevealText({ collapsed, children, className }: SidebarRevealTextProps) {
  return (
    <span
      className={cn(
        "inline-block min-w-0 truncate transition-[opacity,transform,max-width] duration-300 ease-in-out",
        collapsed ? "max-w-0 -translate-x-1 opacity-0" : "max-w-[200px] translate-x-0 opacity-100",
        className,
      )}
    >
      {children}
    </span>
  );
}

interface SidebarRevealPanelProps {
  collapsed: boolean;
  children: ReactNode;
  className?: string;
}

/** 侧栏底部卡片等块级内容展开/收起 */
export function SidebarRevealPanel({ collapsed, children, className }: SidebarRevealPanelProps) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out",
        collapsed ? "mt-0 grid-rows-[0fr] opacity-0" : "mt-6 grid-rows-[1fr] opacity-100",
        className,
      )}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}
