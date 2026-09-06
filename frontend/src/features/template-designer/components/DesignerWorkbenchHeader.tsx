"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Code2,
  Database,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  History,
  Layers,
  Maximize2,
  Minimize2,
  Save,
  Send,
} from "lucide-react";
import { WorkbenchHeaderLayout } from "@/components/workbench";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDesignerEditorStore } from "../stores/designer-editor-store";
import { useDesignerBack } from "../hooks/use-designer-back";

export interface DesignerWorkbenchHeaderProps {
  focusMode: boolean;
  saving?: boolean;
  onToggleFocusMode: () => void;
  onSave: () => void;
  onPublish: () => void;
  onExport: () => void;
  onVersionHistory: () => void;
  onReviewConfig: () => void;
  onOpenPreviewSample?: () => void;
}

export function DesignerWorkbenchHeader({
  focusMode,
  saving = false,
  onToggleFocusMode,
  onSave,
  onPublish,
  onExport,
  onVersionHistory,
  onReviewConfig,
  onOpenPreviewSample,
}: DesignerWorkbenchHeaderProps) {
  const { goBack } = useDesignerBack();
  const templateName = useDesignerEditorStore((state) => state.templateName);
  const versionNo = useDesignerEditorStore((state) => state.versionNo);
  const isDirty = useDesignerEditorStore((state) => state.isDirty);
  const isPreviewMode = useDesignerEditorStore((state) => state.isPreviewMode);
  const previewSample = useDesignerEditorStore((state) => state.previewSample);
  const setTemplateName = useDesignerEditorStore((state) => state.setTemplateName);
  const togglePreviewMode = useDesignerEditorStore((state) => state.togglePreviewMode);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(templateName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditName(templateName);
  }, [templateName]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleNameSave = () => {
    const newName = editName.trim() || "新建模板";
    setTemplateName(newName);
    setEditName(newName);
    setIsEditing(false);
  };

  return (
    <WorkbenchHeaderLayout
      start={
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full"
            onClick={goBack}
            title="返回"
            aria-label="返回"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <FileText className="h-5 w-5 shrink-0 text-primary" />
          {isEditing ? (
            <Input
              ref={inputRef}
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleNameSave();
                } else if (event.key === "Escape") {
                  setEditName(templateName);
                  setIsEditing(false);
                }
              }}
              className="h-8 w-48 text-sm"
            />
          ) : (
            <div
              className="group flex min-w-0 cursor-pointer select-none items-center gap-1.5"
              onDoubleClick={() => setIsEditing(true)}
              title="双击编辑名称"
            >
              <span className="truncate text-base font-semibold text-foreground">
                {templateName}
              </span>
              <Edit3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          )}
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            v{versionNo}
            {isDirty ? " · 未保存" : ""}
          </span>
        </div>
      }
      end={
        <>
          <Button type="button" variant="outline" size="sm" onClick={onToggleFocusMode}>
            {focusMode ? <Minimize2 className="mr-1 h-4 w-4" /> : <Maximize2 className="mr-1 h-4 w-4" />}
            {focusMode ? "退出禅模式" : "禅模式"}
          </Button>
          <Button
            type="button"
            variant={isPreviewMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const next = !isPreviewMode;
              togglePreviewMode(next);
              if (next && !previewSample) {
                onOpenPreviewSample?.();
              }
            }}
          >
            {isPreviewMode ? <EyeOff className="mr-1.5 h-4 w-4" /> : <Eye className="mr-1.5 h-4 w-4" />}
            {isPreviewMode ? "退出预览" : "预览"}
          </Button>
          {isPreviewMode && onOpenPreviewSample ? (
            <Button type="button" variant="outline" size="sm" onClick={onOpenPreviewSample}>
              <Database className="mr-1.5 h-4 w-4" />
              题目数据
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={onReviewConfig}>
            <Layers className="mr-1.5 h-4 w-4" />
            审核配置
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onExport}>
            <Code2 className="mr-1.5 h-4 w-4" />
            导出 FormSchema
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={saving} onClick={onSave}>
            <Save className="mr-1.5 h-4 w-4" />
            {saving ? "保存中…" : "保存草稿"}
          </Button>
          <Button type="button" size="sm" onClick={onPublish}>
            <Send className="mr-1.5 h-4 w-4" />
            发布
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onVersionHistory}>
            <History className="mr-1.5 h-4 w-4" />
            版本历史
          </Button>
        </>
      }
    />
  );
}
