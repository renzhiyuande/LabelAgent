"use client";

import type { FormSchema } from "@/low-code/schema/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WorkbenchChrome } from "@/components/workbench2";
import {
  buildDefaultSectionWidgetConfigs,
  createDefaultLabelerRenderPrefs,
  ensureSectionWidgetConfigs,
  type LabelerRenderPrefs,
  type LabelerSectionSurface,
  type LabelerSectionWidgetConfig,
  type LabelerSurfaceViewMode,
  type LabelerWorkbenchLayoutMode,
} from "../labeler-render-prefs";

interface LabelerRenderSettingsProps {
  formSchema: FormSchema | null;
  prefs: LabelerRenderPrefs;
  onChange: (patch: Partial<LabelerRenderPrefs>) => void;
  onReset: () => void;
  onApplyDefaultViews?: (defaults: LabelerRenderPrefs["defaults"]) => void;
  onApplySectionWidgets?: () => void;
}

const chromeOptions: Array<{ value: WorkbenchChrome; label: string; hint: string }> = [
  {
    value: "flush",
    label: "贴边",
    hint: "VS Code 式无外边距，区域 tab 贴顶栏",
  },
  {
    value: "default",
    label: "卡片",
    hint: "圆角卡片 + 内边距，区域独立浮层",
  },
];

const layoutOptions: Array<{ value: LabelerWorkbenchLayoutMode; label: string; hint: string }> = [
  {
    value: "classic",
    label: "经典布局",
    hint: "题面 + 作答两个主 widget（与原先一致）",
  },
  {
    value: "sectionWidgets",
    label: "按区块独立 Widget",
    hint: "每个模板 section 一个可拖拽 widget，可单独选渲染器",
  },
];

const surfaceOptions: Array<{ value: LabelerSectionSurface; label: string }> = [
  { value: "auto", label: "自动" },
  { value: "display", label: "题面展示" },
  { value: "annotate", label: "作答表单" },
];

const viewModeOptions: Array<{ value: LabelerSurfaceViewMode; label: string }> = [
  { value: "inline", label: "紧凑" },
  { value: "cards", label: "卡片" },
  { value: "json", label: "JSON" },
];

export function LabelerRenderSettings({
  formSchema,
  prefs,
  onChange,
  onReset,
  onApplyDefaultViews,
  onApplySectionWidgets,
}: LabelerRenderSettingsProps) {
  const sections = formSchema?.sections ?? [];
  const sectionConfigs =
    prefs.layoutMode === "sectionWidgets" && formSchema
      ? ensureSectionWidgetConfigs(formSchema, prefs.sectionWidgets)
      : {};

  function setSectionConfig(sectionKey: string, patch: Partial<LabelerSectionWidgetConfig>) {
    onChange({
      sectionWidgets: {
        ...sectionConfigs,
        [sectionKey]: {
          ...sectionConfigs[sectionKey],
          ...patch,
        },
      },
    });
  }

  function handleLayoutModeChange(value: LabelerWorkbenchLayoutMode) {
    if (value === "sectionWidgets" && formSchema) {
      onChange({
        layoutMode: value,
        sectionWidgets: buildDefaultSectionWidgetConfigs(formSchema),
      });
      onApplySectionWidgets?.();
      return;
    }
    onChange({ layoutMode: value });
    if (value === "classic") {
      onApplySectionWidgets?.();
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-medium text-foreground">展示方式</div>
        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
          仅保存在本机，不修改模板 schema。切换后可在「编辑布局」里拖动各区块 widget。
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">工作台 Chrome</Label>
        <div className="space-y-1.5">
          {chromeOptions.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer gap-2 rounded-xl border border-border/80 bg-card/80 px-3 py-2"
            >
              <input
                type="radio"
                name="labeler-chrome"
                className="mt-1 accent-primary"
                checked={prefs.chrome === option.value}
                onChange={() => onChange({ chrome: option.value })}
              />
              <span className="min-w-0">
                <span className="block text-xs font-medium text-foreground">
                  {option.label}
                </span>
                <span className="block text-[11px] leading-5 text-muted-foreground">
                  {option.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">工作台布局</Label>
        <div className="space-y-1.5">
          {layoutOptions.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer gap-2 rounded-xl border border-border/80 bg-card/80 px-3 py-2"
            >
              <input
                type="radio"
                name="labeler-layout-mode"
                className="mt-1 accent-primary"
                checked={prefs.layoutMode === option.value}
                onChange={() => handleLayoutModeChange(option.value)}
              />
              <span className="min-w-0">
                <span className="block text-xs font-medium text-foreground">
                  {option.label}
                </span>
                <span className="block text-[11px] leading-5 text-muted-foreground">
                  {option.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {prefs.layoutMode === "sectionWidgets" && sections.length > 0 ? (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">区块 Widget 渲染器</Label>
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-border/80 p-2">
            {sections.map((section) => {
              const config = sectionConfigs[section.key] ?? { surface: "auto" as const, visible: true };
              return (
                <div key={section.key} className="space-y-1.5 rounded-lg bg-muted/50 p-2">
                  <div className="truncate text-xs font-medium text-foreground" title={section.key}>
                    {section.title?.trim() || section.key}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={config.surface ?? "auto"}
                      onValueChange={(value) => {
                        setSectionConfig(section.key, { surface: value as LabelerSectionSurface });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="渲染器" />
                      </SelectTrigger>
                      <SelectContent>
                        {surfaceOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={config.viewMode ?? "inherit"}
                      onValueChange={(value) => {
                        setSectionConfig(section.key, {
                          viewMode: value === "inherit" ? undefined : (value as LabelerSurfaceViewMode),
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="视图" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inherit">继承默认</SelectItem>
                        {viewModeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 w-full rounded-xl"
            onClick={onApplySectionWidgets}
          >
            应用区块 Widget 布局
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-600 dark:text-slate-300">题面默认视图</Label>
          <Select
            value={prefs.defaults.payload}
            onValueChange={(value) => {
              const defaults = { ...prefs.defaults, payload: value as LabelerSurfaceViewMode };
              onChange({ defaults });
              onApplyDefaultViews?.(defaults);
            }}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {viewModeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-600 dark:text-slate-300">作答默认视图</Label>
          <Select
            value={prefs.defaults.annotate}
            onValueChange={(value) => {
              const defaults = { ...prefs.defaults, annotate: value as LabelerSurfaceViewMode };
              onChange({ defaults });
              onApplyDefaultViews?.(defaults);
            }}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {viewModeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 w-full rounded-xl"
        onClick={() => {
          onReset();
          onApplyDefaultViews?.(createDefaultLabelerRenderPrefs().defaults);
          onApplySectionWidgets?.();
        }}
      >
        恢复展示默认
      </Button>
    </div>
  );
}
