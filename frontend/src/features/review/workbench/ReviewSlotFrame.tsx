import { MoveDown, MoveLeft, MoveRight, MoveUp, Settings2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkbenchRegionId, WorkbenchRenderContext } from "@/components/workbench2";
import { cn } from "@/lib/utils";

export type ReviewWorkbenchSlotId = "toolbar" | "ai-header" | "queue" | "history" | "content" | "review" | "ai";

export interface ReviewSlotFrameControls {
  editMode: boolean;
  moveTab: (tabId: string, regionId: WorkbenchRegionId) => void;
}

interface ReviewSlotFrameProps {
  slotId: ReviewWorkbenchSlotId;
  title: string;
  description: string;
  env: WorkbenchRenderContext;
  controls: ReviewSlotFrameControls;
  flush?: boolean;
  children: ReactNode;
}

const moveOptions: Array<{ regionId: WorkbenchRegionId; label: string; icon: typeof MoveUp }> = [
  { regionId: "top", label: "顶部", icon: MoveUp },
  { regionId: "left", label: "左侧", icon: MoveLeft },
  { regionId: "center", label: "中间", icon: MoveDown },
  { regionId: "right", label: "右侧", icon: MoveRight },
];

export function ReviewSlotFrame({
  slotId,
  title,
  description,
  env,
  controls,
  flush = false,
  children,
}: ReviewSlotFrameProps) {
  const showSlotHeader = controls.editMode;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {showSlotHeader ? (
        <header className="shrink-0 px-3 pb-2 pt-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{title}</h3>
              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="icon" className="h-7 w-7 rounded-full">
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>组件设置</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs">移动到</DropdownMenuLabel>
                {moveOptions.map(({ regionId, label, icon: Icon }) => (
                  <DropdownMenuItem
                    key={regionId}
                    onClick={() => controls.moveTab(env.tabId, regionId)}
                    disabled={env.regionId === regionId}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
      ) : null}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden",
          flush ? "p-0" : "px-3 pb-3",
          !flush && (showSlotHeader ? "pt-0" : "pt-3"),
        )}
      >
        {children}
      </div>
    </div>
  );
}
