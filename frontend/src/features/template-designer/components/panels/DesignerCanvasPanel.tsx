"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { fetchRemoteOptions } from "@/low-code";
import { LHResourceForm } from "@/low-code/components/forms/LHResourceForm";
import { useRemoteOptionsCache } from "@/low-code/hooks/use-remote-options-cache";
import type { RemoteOptionQuery } from "@/low-code/schema/types";
import { buildFormDefaultValues, buildResourceMeta } from "@/low-code/utils/form-schema";
import { useDesignerEditorStore } from "../../stores/designer-editor-store";
import { buildPreviewValuesWithPayload } from "../../utils/build-preview-values";
import { findFieldInSections } from "../../utils/schema-edit";
import { DESIGNER_CANVAS_DROP_ID, fieldDndId } from "../../utils/dnd";
import { CanvasTabBar } from "../canvas/CanvasTabBar";
import { CanvasArrayShell } from "../canvas/CanvasArrayShell";
import { CanvasFieldWrapper } from "../canvas/CanvasFieldWrapper";
import { CanvasFieldPreview } from "../canvas/CanvasFieldPreview";

export function DesignerCanvasPanel() {
  const formSchema = useDesignerEditorStore((state) => state.formSchema);
  const templateName = useDesignerEditorStore((state) => state.templateName);
  const resourceKey = useDesignerEditorStore((state) => state.resourceKey);
  const activeSectionKey = useDesignerEditorStore((state) => state.activeSectionKey);
  const selectedParentKey = useDesignerEditorStore((state) => state.selectedParentKey);
  const isPreviewMode = useDesignerEditorStore((state) => state.isPreviewMode);
  const currentVersionId = useDesignerEditorStore((state) => state.currentVersionId);
  const previewValues = useDesignerEditorStore((state) => state.previewValues);
  const previewSample = useDesignerEditorStore((state) => state.previewSample);
  const clearSelection = useDesignerEditorStore((state) => state.clearSelection);
  const exitArrayScope = useDesignerEditorStore((state) => state.exitArrayScope);
  const select = useDesignerEditorStore((state) => state.select);
  const selectedId = useDesignerEditorStore((state) => state.selectedId);
  const setPreviewValues = useDesignerEditorStore((state) => state.setPreviewValues);
  const updatePreviewValue = useDesignerEditorStore((state) => state.updatePreviewValue);
  const requestPreviewSampleDrawer = useDesignerEditorStore((state) => state.requestPreviewSampleDrawer);
  const getScopeFields = useDesignerEditorStore((state) => state.getScopeFields);

  const scopeFields = useMemo(() => getScopeFields(), [formSchema, activeSectionKey, selectedParentKey, getScopeFields]);

  const arrayParent = useMemo(() => {
    if (!selectedParentKey) {
      return undefined;
    }
    return findFieldInSections(formSchema.sections, selectedParentKey);
  }, [formSchema.sections, selectedParentKey]);

  const fieldSortableIds = useMemo(
    () => scopeFields.map((field) => fieldDndId(field.key)),
    [scopeFields],
  );

  const { setNodeRef, isOver } = useDroppable({
    id: DESIGNER_CANVAS_DROP_ID,
    disabled: isPreviewMode,
  });

  const previewResource = useMemo(
    () => buildResourceMeta(formSchema, templateName, resourceKey),
    [formSchema, resourceKey, templateName],
  );
  const previewDefaults = useMemo(() => buildFormDefaultValues(formSchema), [formSchema]);

  const loadRemoteOptionsRaw = useCallback(
    (source: string, query?: string | RemoteOptionQuery) => fetchRemoteOptions(previewResource, source, query),
    [previewResource],
  );
  const cachedLoadRemoteOptions = useRemoteOptionsCache(loadRemoteOptionsRaw);
  const loadRemoteOptions = cachedLoadRemoteOptions ?? loadRemoteOptionsRaw;

  const previewFormContext = useMemo(
    () => ({
      ...(currentVersionId ? { templateVersionId: currentVersionId } : {}),
      ...(previewSample?.taskItemId ? { taskItemId: previewSample.taskItemId } : {}),
      itemPayload: previewSample?.itemPayload,
      displaySchema: formSchema,
    }),
    [currentVersionId, formSchema, previewSample?.itemPayload, previewSample?.taskItemId],
  );

  useEffect(() => {
    if (!isPreviewMode) {
      return;
    }
    if (previewSample?.itemPayload) {
      setPreviewValues(buildPreviewValuesWithPayload(formSchema, previewDefaults, previewSample.itemPayload));
      return;
    }
    setPreviewValues(previewDefaults);
  }, [formSchema, isPreviewMode, previewDefaults, previewSample?.itemPayload, setPreviewValues]);

  const handleCanvasClick = (event: React.MouseEvent) => {
    if (
      event.target === event.currentTarget ||
      (event.target as HTMLElement).closest(".canvas-empty-area")
    ) {
      clearSelection();
    }
  };

  if (isPreviewMode) {
    return (
      <div className="flex h-full flex-col bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-primary/10 px-4 py-2 text-sm text-primary">
          <div className="min-w-0">
            预览模式 · 与线上一致
            {previewSample ? (
              <span className="ml-2 text-primary/90">
                · 题目：{previewSample.taskTitle} / {previewSample.taskItemLabel}
              </span>
            ) : (
              <span className="ml-2 text-primary/80">
                · 请选择任务数据项注入 payload
              </span>
            )}
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg border border-primary/30 bg-card/80 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-card"
            onClick={requestPreviewSampleDrawer}
          >
            {previewSample ? "切换题目数据" : "选择题目数据"}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <LHResourceForm
            resource={previewResource}
            mode="edit"
            values={previewValues}
            formId="template-designer-preview"
            formContext={previewFormContext}
            onChange={updatePreviewValue}
            onSubmit={async () => undefined}
            loadRemoteOptions={loadRemoteOptions}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-card">
      <CanvasTabBar />
      <div
        ref={setNodeRef}
        onClick={handleCanvasClick}
        className={`flex-1 overflow-y-auto p-6 transition-colors ${
          isOver ? "bg-primary/10" : ""
        }`}
      >
        {selectedParentKey && arrayParent ? (
          <div className="mx-auto max-w-3xl">
            <CanvasArrayShell
              field={arrayParent}
              variant="sub"
              selected={selectedId === arrayParent.key}
              onSelectParent={() => select(arrayParent.key)}
              onExitSubCanvas={exitArrayScope}
            >
              {scopeFields.length === 0 ? (
                <div className="canvas-empty-area flex min-h-[220px] items-center justify-center rounded-lg border-2 border-dashed border-border">
                  <p className="px-4 text-center text-sm text-muted-foreground">
                    从左侧拖拽组件到此处，写入「{arrayParent.label}」的子字段
                  </p>
                </div>
              ) : (
                <SortableContext items={fieldSortableIds} strategy={verticalListSortingStrategy}>
                  {scopeFields.map((field, index) => (
                    <CanvasFieldWrapper
                      key={field.key}
                      field={field}
                      index={index}
                      totalFields={scopeFields.length}
                    >
                      <CanvasFieldPreview field={field} />
                    </CanvasFieldWrapper>
                  ))}
                </SortableContext>
              )}
            </CanvasArrayShell>
          </div>
        ) : scopeFields.length === 0 ? (
          <div className="canvas-empty-area flex h-full min-h-[400px] items-center justify-center rounded-xl border-2 border-dashed border-border">
            <div className="text-center">
              <div className="mb-4 text-muted-foreground/40">
                <svg
                  className="mx-auto h-20 w-20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  aria-hidden
                >
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">
                从左侧拖拽组件到此处，写入当前区块（{activeSectionKey}）
              </p>
            </div>
          </div>
        ) : (
          <SortableContext items={fieldSortableIds} strategy={verticalListSortingStrategy}>
            <div className="mx-auto max-w-3xl">
              {scopeFields.map((field, index) => (
                <CanvasFieldWrapper
                  key={field.key}
                  field={field}
                  index={index}
                  totalFields={scopeFields.length}
                >
                  <CanvasFieldPreview field={field} />
                </CanvasFieldWrapper>
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
}
