"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Database, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { appMessage } from "@/lib/message";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { collectLlmDisplayFields } from "@/low-code/components/fields/llm-suggest-context";
import { getValueAtPath } from "@/low-code/utils/object-path";
import { buildFormDefaultValues } from "@/low-code/utils/form-schema";
import type { FormSchema } from "@/low-code/schema/types";
import { useDesignerEditorStore } from "../stores/designer-editor-store";
import {
  fetchPreviewTaskItemPayload,
  findLinkedTaskForTemplate,
  listPreviewTaskItems,
  listPreviewTasks,
  parsePreviewTemplateSchema,
  resolvePreviewTemplateForTask,
  type PreviewTaskItemOption,
  type PreviewTaskOption,
} from "../designer-preview-sample-api";
import { buildPreviewValuesWithPayload } from "../utils/build-preview-values";
import {
  clearPreviewSampleSelection,
  loadPreviewSampleSelection,
  savePreviewSampleSelection,
} from "../utils/designer-preview-sample-storage";
import { SideSlidePanel } from "./SideSlidePanel";

interface DesignerPreviewSampleDrawerProps {
  open: boolean;
  onClose: () => void;
}

function formatTaskItemLabel(item: PreviewTaskItemOption): string {
  const seq = item.seqNo > 0 ? `第 ${item.seqNo} 题` : "题目";
  const key = item.sourceItemKey ? ` · ${item.sourceItemKey}` : "";
  return `${seq}${key}`;
}

function truncatePreviewValue(value: unknown, maxLen = 80): string {
  if (value == null || value === "") {
    return "（空）";
  }
  const text =
    typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : JSON.stringify(value);
  return text.length <= maxLen ? text : `${text.slice(0, maxLen)}…`;
}

export function DesignerPreviewSampleDrawer({ open, onClose }: DesignerPreviewSampleDrawerProps) {
  const formSchema = useDesignerEditorStore((state) => state.formSchema);
  const templateId = useDesignerEditorStore((state) => state.templateId);
  const previewSample = useDesignerEditorStore((state) => state.previewSample);
  const setPreviewSample = useDesignerEditorStore((state) => state.setPreviewSample);
  const clearPreviewSample = useDesignerEditorStore((state) => state.clearPreviewSample);
  const loadFormSchemaForPreview = useDesignerEditorStore((state) => state.loadFormSchemaForPreview);
  const setTemplateId = useDesignerEditorStore((state) => state.setTemplateId);
  const markVersionAsCurrent = useDesignerEditorStore((state) => state.markVersionAsCurrent);
  const setPreviewValues = useDesignerEditorStore((state) => state.setPreviewValues);
  const togglePreviewMode = useDesignerEditorStore((state) => state.togglePreviewMode);
  const isPreviewMode = useDesignerEditorStore((state) => state.isPreviewMode);

  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [applying, setApplying] = useState(false);
  const [taskOptions, setTaskOptions] = useState<PreviewTaskOption[]>([]);
  const [itemOptions, setItemOptions] = useState<PreviewTaskItemOption[]>([]);
  const [taskKeyword, setTaskKeyword] = useState("");
  const syncedTaskIdRef = useRef<string | null>(null);
  const activeSchemaRef = useRef<FormSchema>(formSchema);

  const selectedTaskId = previewSample?.taskId ?? "";
  const selectedItemId = previewSample?.taskItemId ?? "";

  useEffect(() => {
    activeSchemaRef.current = formSchema;
  }, [formSchema]);

  const loadTasks = useCallback(async (keyword?: string) => {
    setLoadingTasks(true);
    try {
      const tasks = await listPreviewTasks(keyword);
      setTaskOptions(tasks);
      return tasks;
    } catch (error) {
      appMessage.errorUnlessHandled("加载任务列表失败", error);
      return [];
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const syncTemplateForTask = useCallback(
    async (taskId: string): Promise<FormSchema> => {
      if (syncedTaskIdRef.current === taskId) {
        return activeSchemaRef.current;
      }
      const templateSync = await resolvePreviewTemplateForTask(taskId);
      if (!templateSync) {
        syncedTaskIdRef.current = taskId;
        return activeSchemaRef.current;
      }
      const schema = parsePreviewTemplateSchema(templateSync.schemaJson);
      loadFormSchemaForPreview(schema);
      activeSchemaRef.current = schema;
      if (templateSync.templateId) {
        setTemplateId(templateSync.templateId);
      }
      if (templateSync.versionId) {
        markVersionAsCurrent(templateSync.versionId);
      }
      syncedTaskIdRef.current = taskId;
      return schema;
    },
    [loadFormSchemaForPreview, markVersionAsCurrent, setTemplateId],
  );

  const applyTaskItem = useCallback(
    async (taskId: string, item: PreviewTaskItemOption, options?: { syncTemplate?: boolean }) => {
      setApplying(true);
      try {
        const shouldSyncTemplate = options?.syncTemplate !== false;
        const schema = shouldSyncTemplate
          ? await syncTemplateForTask(taskId)
          : activeSchemaRef.current;

        const payload = await fetchPreviewTaskItemPayload(taskId, item.id);
        const task = taskOptions.find((option) => option.id === taskId);
        const sample = {
          taskId,
          taskTitle: task?.title ?? taskId,
          taskItemId: item.id,
          taskItemLabel: formatTaskItemLabel(item),
          itemPayload: payload,
        };
        setPreviewSample(sample);
        savePreviewSampleSelection(templateId, sample);

        const defaults = buildFormDefaultValues(schema);
        setPreviewValues(buildPreviewValuesWithPayload(schema, defaults, payload));
        if (!isPreviewMode) {
          togglePreviewMode(true);
        }
      } catch (error) {
        appMessage.errorUnlessHandled("加载题目数据失败", error);
      } finally {
        setApplying(false);
      }
    },
    [
      isPreviewMode,
      setPreviewSample,
      setPreviewValues,
      syncTemplateForTask,
      taskOptions,
      templateId,
      togglePreviewMode,
    ],
  );

  const restoreSelection = useCallback(
    async (taskId: string, itemId: string) => {
      setLoadingItems(true);
      try {
        const items = await listPreviewTaskItems(taskId);
        setItemOptions(items);
        const item = items.find((option) => option.id === itemId) ?? items[0];
        if (!item) {
          return;
        }
        await applyTaskItem(taskId, item, { syncTemplate: true });
      } catch (error) {
        appMessage.errorUnlessHandled("恢复预览题目失败", error);
      } finally {
        setLoadingItems(false);
      }
    },
    [applyTaskItem],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    let active = true;
    void (async () => {
      const tasks = await loadTasks();
      if (!active) {
        return;
      }

      const stored = loadPreviewSampleSelection(templateId);
      if (stored) {
        await restoreSelection(stored.taskId, stored.taskItemId);
        return;
      }

      if (previewSample?.taskId) {
        const items = await listPreviewTaskItems(previewSample.taskId);
        if (!active) {
          return;
        }
        setItemOptions(items);
        syncedTaskIdRef.current = previewSample.taskId;
        return;
      }

      if (templateId) {
        try {
          const linkedTaskId = await findLinkedTaskForTemplate(templateId);
          if (linkedTaskId && tasks.some((task) => task.id === linkedTaskId)) {
            await handleTaskChange(linkedTaskId, { skipRestore: true });
          }
        } catch {
          // 关联任务可选，失败时保持手动选择
        }
      }
    })();

    return () => {
      active = false;
    };
    // 仅在侧拉打开时初始化一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleTaskChange(taskId: string, options?: { skipRestore?: boolean }) {
    if (!taskId) {
      clearPreviewSample();
      clearPreviewSampleSelection();
      setItemOptions([]);
      syncedTaskIdRef.current = null;
      setPreviewValues(buildFormDefaultValues(activeSchemaRef.current));
      return;
    }

    setLoadingItems(true);
    try {
      const items = await listPreviewTaskItems(taskId);
      setItemOptions(items);
      if (items.length === 0) {
        toast.info("该任务暂无标注数据项");
        return;
      }
      const preferredItem =
        !options?.skipRestore && previewSample?.taskId === taskId
          ? items.find((item) => item.id === previewSample.taskItemId) ?? items[0]
          : items[0];
      await applyTaskItem(taskId, preferredItem, { syncTemplate: true });
    } catch (error) {
      appMessage.errorUnlessHandled("加载任务数据项失败", error);
    } finally {
      setLoadingItems(false);
    }
  }

  async function handleItemChange(itemId: string) {
    if (!selectedTaskId || !itemId) {
      return;
    }
    const item = itemOptions.find((option) => option.id === itemId);
    if (!item) {
      return;
    }
    await applyTaskItem(selectedTaskId, item, { syncTemplate: false });
  }

  function handleClear() {
    clearPreviewSample();
    clearPreviewSampleSelection();
    setItemOptions([]);
    syncedTaskIdRef.current = null;
    setPreviewValues(buildFormDefaultValues(activeSchemaRef.current));
  }

  const displayFieldPreview = useMemo(() => {
    if (!previewSample?.itemPayload) {
      return [];
    }
    return collectLlmDisplayFields(formSchema).map((field) => ({
      label: field.label,
      value: truncatePreviewValue(getValueAtPath(previewSample.itemPayload, field.path)),
    }));
  }, [formSchema, previewSample]);

  return (
    <SideSlidePanel open={open} onClose={onClose} className="w-full max-w-md">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Database className="h-4 w-4 text-primary" />
          预览题目数据
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          关闭
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
        <p className="text-xs leading-5 text-muted-foreground">
          选择任务与数据项后，将自动加载该任务关联模板，并把 payload 注入预览（含 LLM 辅助题面上下文）。切换任务会同步模板，切换数据项仅更新 payload。
        </p>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">标注任务</span>
          <Combobox
            value={selectedTaskId}
            options={taskOptions.map((task) => ({
              value: task.id,
              label: task.taskCode ? `${task.title} (${task.taskCode})` : task.title,
              keywords: `${task.title} ${task.taskCode ?? ""} ${task.id}`,
            }))}
            placeholder={loadingTasks ? "加载任务…" : "选择任务"}
            emptyText="暂无任务"
            searchValue={taskKeyword}
            onSearchChange={setTaskKeyword}
            shouldFilter={false}
            disabled={applying}
            onValueChange={(taskId) => void handleTaskChange(taskId)}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            disabled={loadingTasks}
            onClick={() => void loadTasks(taskKeyword)}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loadingTasks ? "animate-spin" : ""}`} />
            刷新任务列表
          </Button>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">数据项</span>
          <Combobox
            value={selectedItemId}
            options={itemOptions.map((item) => ({
              value: item.id,
              label: formatTaskItemLabel(item),
              keywords: `${item.seqNo} ${item.sourceItemKey ?? ""} ${item.payloadPreview ?? ""}`,
            }))}
            placeholder={
              !selectedTaskId
                ? "请先选择任务"
                : loadingItems
                  ? "加载题目…"
                  : "选择数据项"
            }
            emptyText={selectedTaskId ? "该任务暂无数据项" : "请先选择任务"}
            disabled={!selectedTaskId || loadingItems || applying}
            onValueChange={(itemId) => void handleItemChange(itemId)}
          />
        </div>

        {previewSample?.itemPayload ? (
          <div className="space-y-2 rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs leading-5 text-foreground">
            <div>
              <p className="font-medium">{previewSample.taskTitle}</p>
              <p className="text-muted-foreground">{previewSample.taskItemLabel}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                已注入 {Object.keys(previewSample.itemPayload).length} 个 payload 字段
              </p>
            </div>
            {displayFieldPreview.length > 0 ? (
              <div className="space-y-1 border-t border-primary/15 pt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                  题面字段预览
                </p>
                {displayFieldPreview.map((field) => (
                  <div key={field.label} className="flex gap-2">
                    <span className="shrink-0 rounded-md border border-border/80 bg-card/80 px-1.5 py-0.5 font-medium text-foreground">
                      {field.label}
                    </span>
                    <span className="min-w-0 flex-1 break-words text-foreground/90">
                      {field.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={!previewSample}
            onClick={handleClear}
          >
            清除抽样
          </Button>
          {applying ? (
            <Button type="button" size="sm" className="flex-1" disabled>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              应用中…
            </Button>
          ) : null}
        </div>
      </div>
    </SideSlidePanel>
  );
}
