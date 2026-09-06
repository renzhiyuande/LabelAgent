"use client";

import { PenSquare, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LabelerRenderSettings } from "./LabelerRenderSettings";
import type { LabelerWorkbenchBusinessContext } from "../types";

interface LabelerWorkbenchSettingsPanelProps {
  context: LabelerWorkbenchBusinessContext;
  onToggleEditMode: () => void;
  onResetWorkbench: () => void;
}

export function LabelerWorkbenchSettingsPanel({
  context,
  onToggleEditMode,
  onResetWorkbench,
}: LabelerWorkbenchSettingsPanelProps) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">工作台设置</div>
        <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          这里统一放编辑布局、重置布局和当前工作台提示。
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={context.editMode ? "default" : "outline"}
          size="sm"
          className="h-9 rounded-xl px-3"
          onClick={onToggleEditMode}
        >
          <PenSquare className="mr-2 h-4 w-4" />
          {context.editMode ? "完成编辑" : "编辑布局"}
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
      <LabelerRenderSettings
        formSchema={context.formSchema}
        prefs={context.renderPrefs}
        onChange={context.setRenderPrefs}
        onReset={context.resetRenderPrefs}
        onApplyDefaultViews={context.applyRenderDefaultViews}
        onApplySectionWidgets={context.applySectionWidgetLayout}
      />
      <div className="rounded-2xl border border-border/70 bg-muted/80 p-3 text-xs text-muted-foreground">
        编辑态下支持拖动 tab、拖动左中右区域、拖动分隔线改宽度；题面/作答区组件可跨区域拖动，并支持上下、左右、标签布局。
      </div>
    </div>
  );
}
