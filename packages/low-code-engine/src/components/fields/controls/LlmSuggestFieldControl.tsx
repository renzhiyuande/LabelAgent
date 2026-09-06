"use client";

import { ArrowDownToLine, Loader2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  invokeLlmSuggest,
  previewLlmSuggest,
  type LlmSuggestPreviewResponse,
} from "../../../api/llm-suggest-api";
import { Button } from '../../../components/ui/button';
import { appMessage } from "../../../adapters/lowcode-utils";
import type { LlmFieldMeta } from "../../../schema/types";
import { renderShowItemMarkdown, sanitizeShowItemHtml, SHOW_ITEM_MARKDOWN_PROSE_CLASS } from "../show-item-utils";
import { buildLlmApplyUpdates, formatAgentResultSummary, tryParseAgentJsonOutput } from "../llm-apply-utils";
import { resolveLlmFieldConfig } from "../llm-field-utils";
import { ShowItemRichHtmlView } from "./ShowItemRichHtmlView";

interface LlmSuggestFieldControlProps {
  fieldCode?: string;
  label: string;
  value: unknown;
  description?: string;
  disabled?: boolean;
  llm?: LlmFieldMeta;
  templateVersionId?: string;
  assignmentId?: string;
  submissionId?: string;
  taskId?: string;
  taskItemId?: string;
  /** 为 false 时禁止调用生成接口（如当前提交不可编辑） */
  invokeAllowed?: boolean;
  onChange: (value: string) => void;
  onApplyFieldValues?: (updates: Array<{ path: string; value: unknown }>) => void;
}

export function LlmSuggestFieldControl({
  fieldCode,
  label,
  value,
  description,
  disabled,
  llm,
  templateVersionId,
  assignmentId,
  submissionId,
  taskId,
  taskItemId,
  invokeAllowed = true,
  onChange,
  onApplyFieldValues,
}: LlmSuggestFieldControlProps) {
  const [loading, setLoading] = useState(false);
  const [parsedOutput, setParsedOutput] = useState<Record<string, unknown> | null>(null);
  const [resolvedApplyMappings, setResolvedApplyMappings] = useState<
    Array<{ sourceKey: string; targetPath: string }>
  >([]);
  const config = useMemo(() => resolveLlmFieldConfig(llm), [llm]);
  const isPromptPreviewOnly = !assignmentId && !submissionId && Boolean(templateVersionId);
  const text = typeof value === "string" ? value : value != null ? String(value) : "";
  const suggestionHtml = useMemo(
    () => (text ? sanitizeShowItemHtml(renderShowItemMarkdown(text)) : ""),
    [text],
  );
  const hasResult = text.length > 0;
  const isAgentMode = config.mode === "agent" && !isPromptPreviewOnly;
  const effectiveParsedOutput = useMemo(() => {
    if (parsedOutput) {
      return parsedOutput;
    }
    if (!isAgentMode || !hasResult) {
      return null;
    }
    return tryParseAgentJsonOutput(text);
  }, [hasResult, isAgentMode, parsedOutput, text]);
  const autoLoadTriggered = useRef(false);
  const invokeBlocked = invokeAllowed === false;
  const shouldHydrateOnMount =
    !isPromptPreviewOnly
    && !disabled
    && !invokeBlocked
    && Boolean(fieldCode)
    && Boolean(templateVersionId)
    && Boolean(assignmentId || submissionId)
    && !hasResult
    && (config.autoLoad || !config.allowRegenerate);

  // autoLoad / 不可重复生成时：进入工作台自动拉取（含服务端 llm_assist 缓存）
  useEffect(() => {
    if (!shouldHydrateOnMount || autoLoadTriggered.current) {
      return;
    }
    autoLoadTriggered.current = true;
    void handleGenerate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 草稿中已有 Agent 结果时，补拉 applyMappings（运行时 schema 不下发映射配置）
  useEffect(() => {
    if (
      !isAgentMode
      || !hasResult
      || resolvedApplyMappings.length > 0
      || !fieldCode
      || !templateVersionId
      || !(assignmentId || submissionId)
    ) {
      return;
    }
    let cancelled = false;
    void invokeLlmSuggest({
      fieldCode,
      templateVersionId,
      assignmentId,
      submissionId,
      taskId,
      allowRegenerate: false,
    })
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (result.applyMappings?.length) {
          setResolvedApplyMappings(result.applyMappings);
        }
        if (result.parsedOutput) {
          setParsedOutput(result.parsedOutput);
          return;
        }
        if (result.text) {
          const parsed = tryParseAgentJsonOutput(result.text);
          if (parsed) {
            setParsedOutput(parsed);
          }
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [
    assignmentId,
    fieldCode,
    hasResult,
    isAgentMode,
    resolvedApplyMappings.length,
    submissionId,
    taskId,
    templateVersionId,
  ]);
  const generateDisabled =
    disabled
    || loading
    || invokeBlocked
    || (hasResult && !config.allowRegenerate && !isPromptPreviewOnly);
  const applyMappings = resolvedApplyMappings.length > 0 ? resolvedApplyMappings : config.applyMappings;
  const applyUpdates = useMemo(
    () => buildLlmApplyUpdates(effectiveParsedOutput, applyMappings),
    [applyMappings, effectiveParsedOutput],
  );
  const canApply =
    !disabled
    && isAgentMode
    && applyUpdates.length > 0
    && typeof onApplyFieldValues === "function";
  const showGenerateButton =
    isPromptPreviewOnly || !hasResult || config.allowRegenerate;
  const generateButtonLabel = loading
    ? (isPromptPreviewOnly ? "组装中…" : "生成中…")
    : hasResult && (config.allowRegenerate || isPromptPreviewOnly)
      ? "重新生成"
      : config.buttonLabel;
  const agentResultSummary = useMemo(
    () => (effectiveParsedOutput ? formatAgentResultSummary(effectiveParsedOutput) : ""),
    [effectiveParsedOutput],
  );

  async function handleGenerate() {
    if (generateDisabled) {
      return;
    }
    if (!fieldCode || !templateVersionId) {
      appMessage.error("缺少模板版本或字段标识，无法生成建议");
      return;
    }
    setLoading(true);
    try {
      if (isPromptPreviewOnly) {
        const result = await previewLlmSuggest({
          fieldCode,
          templateVersionId,
          ...(taskItemId ? { taskItemId } : {}),
        });
        const previewText = formatPreviewPromptText(result);
        if (!previewText) {
          appMessage.error("未能组装有效 Prompt，请先保存草稿并检查 LLM 配置");
          return;
        }
        onChange(previewText);
        setParsedOutput(null);
        setResolvedApplyMappings(result.applyMappings ?? []);
        return;
      }

      const result = await invokeLlmSuggest({
        fieldCode,
        templateVersionId,
        assignmentId,
        submissionId,
        taskId,
        allowRegenerate: config.allowRegenerate,
      });
      if (!result.text) {
        appMessage.error("LLM 未返回有效建议，请检查模型配置");
        return;
      }
      onChange(result.text);
      setParsedOutput(result.parsedOutput ?? null);
      const mappings = result.applyMappings ?? [];
      setResolvedApplyMappings(mappings);
      if (
        isAgentMode
        && !result.parsedOutput
        && result.text
        && mappings.length > 0
      ) {
        const parsed = tryParseAgentJsonOutput(result.text);
        if (parsed) {
          setParsedOutput(parsed);
        }
      }
      if (isAgentMode && result.text) {
        appMessage.success("结构化参考已生成，可点击「应用到标注」写入字段");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成失败";
      if (!(error instanceof Error && "handled" in error && (error as { handled?: boolean }).handled)) {
        appMessage.error(message);
      }
    } finally {
      setLoading(false);
    }
  }

  function applyAgentUpdates(
    output: Record<string, unknown> | null | undefined,
    mappings: Array<{ sourceKey: string; targetPath: string }>,
    options?: { silent?: boolean; manual?: boolean },
  ) {
    if (
      disabled
      || config.mode !== "agent"
      || typeof onApplyFieldValues !== "function"
    ) {
      return false;
    }
    const updates = buildLlmApplyUpdates(output, mappings);
    if (updates.length === 0) {
      if (!options?.silent) {
        appMessage.info("已生成建议，但未能解析出可应用的 JSON 字段");
      }
      return false;
    }
    onApplyFieldValues(updates);
    appMessage.success(
      options?.manual
        ? `已应用到 ${updates.length} 个标注字段`
        : `已自动填充 ${updates.length} 个标注字段`,
    );
    return true;
  }

  function handleApply() {
    if (!canApply) {
      return;
    }
    applyAgentUpdates(effectiveParsedOutput, applyMappings, { silent: true, manual: true });
  }

  const helperText = isPromptPreviewOnly
    ? description
      ?? "设计器预览：调用 preview 接口展示服务端组装的 Prompt，不调用模型；修改配置后请先保存草稿。"
    : isAgentMode
      ? description ?? "Agent 模式：根据题面生成结构化参考，可一键写入标注字段（本字段不参与提交）。"
      : description ?? "根据题面生成参考回答，仅供参考，可重新生成；不参与题目导入与标注提交。";

  return (
    <div className="space-y-2 rounded-[0.85rem] border border-border bg-muted/50 p-3">
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary dark:text-primary/70" />
          <p className="min-w-0 flex-1 text-xs leading-5 text-muted-foreground">{helperText}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canApply ? (
            <Button
              type="button"
              variant="default"
              size="sm"
              className="rounded-xl"
              onClick={handleApply}
            >
              <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
              应用到标注
            </Button>
          ) : null}
          {showGenerateButton ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={generateDisabled}
              onClick={() => void handleGenerate()}
            >
              {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              {generateButtonLabel}
            </Button>
          ) : null}
        </div>
      </div>
      {canApply ? (
        <p className="text-[11px] leading-5 text-primary/80 dark:text-primary/70">
          结构化参考已就绪，点击「应用到标注」可写入 {applyUpdates.length} 个标注字段。
        </p>
      ) : isAgentMode && applyMappings.length > 0 ? (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          生成后可填充 {applyMappings.length} 个标注字段（配置由服务端解析）
        </p>
      ) : null}
      {invokeBlocked ? (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          当前提交不可编辑，无法生成 AI 建议；若已有历史结果将随草稿展示。
        </p>
      ) : null}
      {text ? (
        isPromptPreviewOnly ? (
          <pre className="whitespace-pre-wrap rounded-lg border border-border bg-card px-3 py-2 text-sm leading-6 text-foreground">
            {text}
          </pre>
        ) : isAgentMode ? (
          agentResultSummary ? (
            <div className="rounded-lg border border-border bg-card px-3 py-2">
              <p className="text-sm leading-6 text-foreground">{agentResultSummary}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              已生成结构化参考，但未能解析为可读摘要；请重新生成或联系管理员检查模板配置。
            </p>
          )
        ) : (
          <div className="rounded-lg border border-border bg-card px-3 py-2">
            <ShowItemRichHtmlView className={SHOW_ITEM_MARKDOWN_PROSE_CLASS} html={suggestionHtml} />
          </div>
        )
      ) : (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {isPromptPreviewOnly
            ? `尚未预览 Prompt，点击「${config.buttonLabel}」开始。`
            : `尚未生成建议，点击「${config.buttonLabel}」开始。`}
        </p>
      )}
    </div>
  );
}

function formatPreviewPromptText(result: LlmSuggestPreviewResponse): string {
  const parts: string[] = [];
  if (result.systemPrompt) {
    parts.push(`【系统提示词】\n${result.systemPrompt}`);
  }
  if (result.userPrompt) {
    parts.push(`【用户提示词】\n${result.userPrompt}`);
  }
  return parts.join("\n\n").trim();
}
