"use client";

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
  createDefaultReviewRenderPrefs,
  type ReviewRenderPrefs,
  type ReviewSurfaceViewMode,
} from "../review-render-prefs";

interface ReviewRenderSettingsProps {
  prefs: ReviewRenderPrefs;
  onChange: (patch: Partial<ReviewRenderPrefs>) => void;
  onReset: () => ReviewRenderPrefs;
  onApplyDefaultViews?: (defaults: ReviewRenderPrefs["defaults"]) => void;
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

const viewModeOptions: Array<{ value: ReviewSurfaceViewMode; label: string }> = [
  { value: "inline", label: "紧凑" },
  { value: "cards", label: "卡片" },
  { value: "json", label: "JSON" },
];

export function ReviewRenderSettings({
  prefs,
  onChange,
  onReset,
  onApplyDefaultViews,
}: ReviewRenderSettingsProps) {
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
                name="review-chrome"
                className="mt-1 accent-primary"
                checked={prefs.chrome === option.value}
                onChange={() => onChange({ chrome: option.value })}
              />
              <span className="min-w-0">
                <span className="block text-xs font-medium text-foreground">{option.label}</span>
                <span className="block text-[11px] leading-5 text-muted-foreground">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">题面默认视图</Label>
          <Select
            value={prefs.defaults.payload}
            onValueChange={(value) => {
              const defaults = { ...prefs.defaults, payload: value as ReviewSurfaceViewMode };
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
          <Label className="text-xs text-muted-foreground">标注结果默认视图</Label>
          <Select
            value={prefs.defaults.annotate}
            onValueChange={(value) => {
              const defaults = { ...prefs.defaults, annotate: value as ReviewSurfaceViewMode };
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
          const next = onReset();
          onApplyDefaultViews?.(next.defaults);
        }}
      >
        恢复展示默认
      </Button>
    </div>
  );
}

export { createDefaultReviewRenderPrefs };
