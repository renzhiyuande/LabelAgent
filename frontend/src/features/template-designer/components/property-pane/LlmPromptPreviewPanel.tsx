"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { previewLlmSuggest } from "@/low-code/api/llm-suggest-api";
import { useDesignerEditorStore } from "../../stores/designer-editor-store";
import { useDesignerSessionStore } from "../../stores/designer-session-store";

interface LlmPromptPreviewPanelProps {
  fieldCode: string;
  templateVersionId?: string | null;
  /** 配置变更时递增，用于提示保存后刷新（预览读已落库 schema） */
  configRevision?: string;
}

export function LlmPromptPreviewPanel({
  fieldCode,
  templateVersionId,
  configRevision,
}: LlmPromptPreviewPanelProps) {
  const sessionReady = useDesignerSessionStore((state) => state.sessionReady);
  const previewSample = useDesignerEditorStore((state) => state.previewSample);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [mode, setMode] = useState<string>("chat");
  const [contextFieldCount, setContextFieldCount] = useState(0);
  const [applyCount, setApplyCount] = useState(0);
  const [outputJsonSchema, setOutputJsonSchema] = useState<string>("");
  const [staleConfig, setStaleConfig] = useState(false);
  const loadedRevisionRef = useRef<string | null>(null);

  const loadPreview = useCallback(async () => {
    if (!sessionReady) {
      return;
    }
    if (!templateVersionId || !fieldCode) {
      setError("请先保存模板草稿以获取版本 ID");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await previewLlmSuggest({
        fieldCode,
        templateVersionId,
        ...(previewSample?.taskItemId ? { taskItemId: previewSample.taskItemId } : {}),
      });
      setSystemPrompt(result.systemPrompt);
      setUserPrompt(result.userPrompt);
      setMode(result.mode);
      setContextFieldCount(result.contextFieldCount ?? 0);
      setApplyCount(result.applyMappings?.length ?? 0);
      setOutputJsonSchema(
        result.outputJsonSchema ? JSON.stringify(result.outputJsonSchema, null, 2) : "",
      );
      loadedRevisionRef.current = configRevision ?? null;
      setStaleConfig(false);
    } catch (previewError) {
      const message = previewError instanceof Error ? previewError.message : "预览失败";
      setError(message);
      setSystemPrompt("");
      setUserPrompt("");
      setOutputJsonSchema("");
    } finally {
      setLoading(false);
    }
  }, [configRevision, fieldCode, previewSample?.taskItemId, sessionReady, templateVersionId]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  useEffect(() => {
    if (loadedRevisionRef.current == null || configRevision == null) {
      return;
    }
    setStaleConfig(loadedRevisionRef.current !== configRevision);
  }, [configRevision]);

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-slate-300 bg-white/70 p-3 dark:border-slate-600 dark:bg-slate-950/30">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-slate-700 dark:text-slate-200">服务端 Prompt 预览</p>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
            完整提示词由后端从已保存的 schema 与题面数据组装；修改配置后请先保存草稿再刷新。
            {previewSample?.taskItemId ? " 已使用预览样本题目。" : " 未选样本题时将使用空题面。"}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 rounded-lg px-2"
          disabled={loading}
          onClick={() => void loadPreview()}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </Button>
      </div>
      {error ? <p className="text-xs text-amber-600 dark:text-amber-400">{error}</p> : null}
      {staleConfig && !error ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          配置已修改，请先保存草稿，再点击刷新查看最新 Prompt / Schema。
        </p>
      ) : null}
      {!error && !loading ? (
        <p className="text-[11px] text-slate-500">
          模式 {mode}
          {contextFieldCount > 0 ? ` · 上下文 ${contextFieldCount} 项` : ""}
          {applyCount > 0 ? ` · 可填充 ${applyCount} 项` : ""}
        </p>
      ) : null}
      {systemPrompt ? (
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-slate-500">系统提示词（只读）</p>
          <pre className="max-h-28 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2 text-[11px] leading-5 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {systemPrompt}
          </pre>
        </div>
      ) : null}
      {userPrompt ? (
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-slate-500">用户提示词（只读）</p>
          <pre className="max-h-36 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2 text-[11px] leading-5 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {userPrompt}
          </pre>
        </div>
      ) : null}
      {outputJsonSchema ? (
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-slate-500">Agent JSON Schema（只读）</p>
          <pre className="max-h-32 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2 text-[11px] leading-5 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {outputJsonSchema}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
