import type { ReactNode } from "react";
import { X } from "lucide-react";
import { SideSlidePanel, SIDE_SLIDE_CLOSE_MS } from "../../components/layout/SideSlidePanel";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import type { ResourceMeta } from "../../schema/types";

export const LH_DRAWER_CLOSE_MS = SIDE_SLIDE_CLOSE_MS;

/** 新建/编辑/详情抽屉统一宽度，与 detail 配置对齐 */
export function resolveResourceDrawerWidth(resource: ResourceMeta): "md" | "lg" {
  return resource.detail?.width === "lg" ? "lg" : "md";
}

interface LHDrawerShellProps {
  open: boolean;
  onClose: () => void;
  /** 关闭动画结束后触发，可用于延迟卸载子树 */
  onClosed?: () => void;
  title: string;
  description?: string;
  width?: "sm" | "md" | "lg" | "xl";
  placement?: "left" | "right";
  footer?: ReactNode;
  children: ReactNode;
}

function drawerPanelClass(
  width: LHDrawerShellProps["width"],
  placement: NonNullable<LHDrawerShellProps["placement"]>,
): string {
  return cn(
    "lh-drawer-slide-panel w-full",
    width === "sm" && "lh-drawer-slide-panel--sm",
    width === "lg" && "lh-drawer-slide-panel--lg",
    width === "xl" && "lh-drawer-slide-panel--xl",
    (width === "md" || !width) && "lh-drawer-slide-panel--md",
    placement === "left" && "lh-drawer-slide-panel--left",
  );
}

export function LHDrawerShell({
  open,
  onClose,
  onClosed,
  title,
  description,
  width = "md",
  placement = "right",
  footer,
  children,
}: LHDrawerShellProps) {
  return (
    <SideSlidePanel
      open={open}
      onClose={onClose}
      onClosed={onClosed}
      placement={placement}
      fixed
      className={drawerPanelClass(width, placement)}
    >
      <div className="lh-drawer-shell">
        <header className="lh-drawer-header">
          <div className="lh-drawer-heading">
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <Button type="button" variant="outline" size="icon" className="lh-drawer-close" onClick={onClose} aria-label="关闭抽屉">
            <X className="h-5 w-5" />
          </Button>
        </header>
        <div className="lh-drawer-body">{children}</div>
        {footer ? <footer className="lh-drawer-footer">{footer}</footer> : null}
      </div>
    </SideSlidePanel>
  );
}
