import { Braces, LayoutGrid, MoveDown, MoveLeft, MoveRight, MoveUp, Settings2, Table2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkbenchRegionId, WorkbenchRenderContext } from "@/components/workbench2";
import { cn } from "@/lib/utils";

export type LabelerWorkbenchSlotId = "toolbar" | "summary" | "queue" | "payload" | "annotate" | "ai";

export type LabelerWorkbenchViewMode = "inline" | "cards" | "json";

export interface LabelerSlotFrameControls {
  editMode: boolean;
  slotModes: Record<LabelerWorkbenchSlotId, LabelerWorkbenchViewMode>;
  setSlotMode: (slotId: LabelerWorkbenchSlotId, mode: LabelerWorkbenchViewMode) => void;
  moveTab: (tabId: string, regionId: WorkbenchRegionId) => void;
}

const viewModeOptions: Array<{ mode: LabelerWorkbenchViewMode; label: string; icon: typeof Table2 }> = [
  { mode: "inline", label: "表格", icon: Table2 },
  { mode: "cards", label: "卡片", icon: LayoutGrid },
  { mode: "json", label: "JSON", icon: Braces },
];

const moveOptions: Array<{ regionId: WorkbenchRegionId; label: string; icon: typeof MoveUp }> = [
  { regionId: "top", label: "顶部", icon: MoveUp },
  { regionId: "left", label: "左侧", icon: MoveLeft },
  { regionId: "center", label: "中间", icon: MoveDown },
  { regionId: "right", label: "右侧", icon: MoveRight },
];

interface LabelerSlotFrameProps {
  slotId: LabelerWorkbenchSlotId;
  title: string;
  description: string;
  env: WorkbenchRenderContext;
  controls: LabelerSlotFrameControls;
  extraActions?: ReactNode;
  /** Widget 板槽位由各组件自行切换视图，隐藏槽位级显示方式 */
  suppressViewMode?: boolean;
  children: ReactNode;
}

export function LabelerSlotFrame({
  slotId,
  title,
  description,
  env,
  controls,
  extraActions,
  suppressViewMode = false,
  children,
}: LabelerSlotFrameProps) {
  const activeMode = controls.slotModes[slotId] ?? "inline";
  const activeModeMeta = viewModeOptions.find((item) => item.mode === activeMode) ?? viewModeOptions[0];
  const ActiveModeIcon = activeModeMeta.icon;

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
            <div className="flex items-center gap-1.5">
              {extraActions}
              {!suppressViewMode ? (
                <>
                  <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted p-0.5">
                    {viewModeOptions.map(({ mode, label, icon: Icon }) => (
                      <Button
                        key={mode}
                        type="button"
                        variant={activeMode === mode ? "default" : "ghost"}
                        size="icon"
                        className="h-7 w-7 rounded-full"
                        title={label}
                        onClick={() => controls.setSlotMode(slotId, mode)}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </Button>
                    ))}
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
                      <DropdownMenuLabel className="text-xs">显示方式</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={activeMode}
                        onValueChange={(value) => controls.setSlotMode(slotId, value as LabelerWorkbenchViewMode)}
                      >
                        {viewModeOptions.map(({ mode, label }) => (
                          <DropdownMenuRadioItem key={mode} value={mode}>
                            {label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
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
                  <div className="hidden items-center gap-1 rounded-full border border-border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground md:inline-flex">
                    <ActiveModeIcon className="h-3.5 w-3.5" />
                    {activeModeMeta.label}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </header>
      ) : null}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3",
          showSlotHeader ? "pt-0" : "pt-3",
        )}
      >
        {children}
      </div>
    </div>
  );
}
