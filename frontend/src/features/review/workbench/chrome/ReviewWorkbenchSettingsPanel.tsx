"use client";

import { PenSquare, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReviewRenderSettings } from "./ReviewRenderSettings";
import type { ReviewRenderPrefs } from "../review-render-prefs";

interface ReviewWorkbenchSettingsPanelProps {
  editMode: boolean;
  renderPrefs: ReviewRenderPrefs;
  onToggleEditMode: () => void;
  onResetWorkbench: () => void;
  onRenderPrefsChange: (patch: Partial<ReviewRenderPrefs>) => void;
  onResetRenderPrefs: () => ReviewRenderPrefs;
  onApplyDefaultViews: (defaults: ReviewRenderPrefs["defaults"]) => void;
  layoutHint?: string;
}

export function ReviewWorkbenchSettingsPanel({
  editMode,
  renderPrefs,
  onToggleEditMode,
  onResetWorkbench,
  onRenderPrefsChange,
  onResetRenderPrefs,
  onApplyDefaultViews,
  layoutHint = "编辑布局可拖动 tab 与组件；重置将恢复默认三栏结构。",
}: ReviewWorkbenchSettingsPanelProps) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-semibold text-foreground">工作台设置</div>
        <div className="mt-1 text-xs leading-5 text-muted-foreground">{layoutHint}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={editMode ? "default" : "outline"}
          size="sm"
          className="h-9 rounded-xl px-3"
          onClick={onToggleEditMode}
        >
          <PenSquare className="mr-2 h-4 w-4" />
          {editMode ? "完成编辑" : "编辑布局"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 rounded-xl px-3"
          onClick={onResetWorkbench}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          重置布局
        </Button>
      </div>
      <ReviewRenderSettings
        prefs={renderPrefs}
        onChange={onRenderPrefsChange}
        onReset={onResetRenderPrefs}
        onApplyDefaultViews={onApplyDefaultViews}
      />
    </div>
  );
}
