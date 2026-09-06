import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { WorkbenchLayoutConfig, WorkbenchLayoutSchema } from "../types";

interface WorkbenchLayoutSettingsProps<
  TPanelId extends string,
  TPreset extends string,
  TConfig extends WorkbenchLayoutConfig<TPanelId, TPreset> = WorkbenchLayoutConfig<TPanelId, TPreset>,
> {
  schema: WorkbenchLayoutSchema<TPanelId, TPreset>;
  presetOptions: TPreset[];
  config: TConfig;
  onChange: (config: TConfig) => void;
  applyPresetPreservingState: (config: TConfig, preset: TPreset) => TConfig;
  disabled?: boolean;
  hint?: string;
}

export function WorkbenchLayoutSettings<
  TPanelId extends string,
  TPreset extends string,
  TConfig extends WorkbenchLayoutConfig<TPanelId, TPreset> = WorkbenchLayoutConfig<TPanelId, TPreset>,
>({
  schema,
  presetOptions,
  config,
  onChange,
  applyPresetPreservingState,
  disabled = false,
  hint = "辅助模块坞可在顶栏/左栏/右栏独立配置；拖动 Tab 可换序",
}: WorkbenchLayoutSettingsProps<TPanelId, TPreset, TConfig>) {
  function handlePresetChange(preset: TPreset) {
    onChange(applyPresetPreservingState(config, preset));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          <LayoutGrid className="mr-1 h-4 w-4" />
          布局
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>布局预设</DropdownMenuLabel>
        <div className="space-y-1 px-2 pb-2">
          {presetOptions.map((preset) => {
            const active = config.preset === preset;
            const presetDef = schema.presets[preset];
            return (
              <button
                key={preset}
                type="button"
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                  active
                    ? "border-primary/20 bg-primary/10 dark:border-primary/40 dark:bg-primary/10"
                    : "border-transparent hover:bg-slate-100 dark:hover:bg-slate-800",
                )}
                onClick={() => handlePresetChange(preset)}
              >
                <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{presetDef.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{presetDef.hint}</p>
              </button>
            );
          })}
        </div>
        <p className="px-3 pb-2 text-xs text-slate-500">{hint}</p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
