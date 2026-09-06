"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  extractLlmTemplateVariablePaths,
  resolveLlmContextFields,
} from "@/low-code/components/fields/llm-field-utils";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { TextFieldControl } from "@/low-code/components/fields/controls/TextFieldControl";
import { SwitchFieldControl } from "@/low-code/components/fields/controls/SwitchFieldControl";
import { LlmPromptTextarea, type LlmPromptInsertTarget, type LlmPromptTextareaHandle } from "./LlmPromptTextarea";
import { LlmVariableInsertBar } from "./LlmVariableInsertBar";
import {
  DEFAULT_LLM_SUGGEST_BUTTON_LABEL,
  DEFAULT_LLM_SUGGEST_PROMPT_TEMPLATE,
  DEFAULT_LLM_SUGGEST_SYSTEM_PROMPT,
} from "@/low-code/constants/llm-suggest-defaults";
import { isLlmAgentMode, resolveLlmApplyTargetPaths } from "@/low-code/components/fields/llm-apply-utils";
import type { LlmAgentConfigMode, LlmFieldMeta, LlmSuggestMode } from "@/low-code/schema/types";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { LlmApplyTargetsEditor } from "./LlmApplyTargetsEditor";
import { LlmPromptHighlightPreview } from "./LlmPromptHighlightPreview";
import {
  fetchLlmCatalog,
  type LlmCatalogProviderOption,
} from "@/features/template-review-config/review-config-api";
import type { FieldOption } from "../../utils/field-options";
import {
  displayUserPromptToStored,
  displayVariableTokenForPath,
  storedUserPromptToDisplay,
} from "../../utils/llm-prompt-display";
import { LlmProviderWeightEditor } from "./LlmProviderWeightEditor";
import { LlmPromptPreviewPanel } from "./LlmPromptPreviewPanel";

interface LlmMetaEditorProps {
  llm?: LlmFieldMeta;
  fieldCode: string;
  templateVersionId?: string | null;
  /** 提示词可插入的题目展示字段 */
  fieldOptions: FieldOption[];
  /** Agent 模式可写入的标注作答字段 */
  applyFieldOptions?: FieldOption[];
  onChange: (next: LlmFieldMeta | undefined) => void;
}

const USE_TEMPLATE_DEFAULT_OPTION: ComboboxOption = {
  value: "",
  label: "使用模板版本默认",
};

function ensureProviderOption(
  options: ComboboxOption[],
  providerCode: string | undefined,
  catalog: LlmCatalogProviderOption[],
): ComboboxOption[] {
  if (!providerCode || options.some((item) => item.value === providerCode)) {
    return options;
  }
  const match = catalog.find((item) => item.providerCode === providerCode);
  return [
    { value: providerCode, label: match ? `${match.providerName}（${providerCode}）` : `${providerCode}（当前值）` },
    ...options,
  ];
}

function ensureModelOption(
  options: ComboboxOption[],
  modelKey: string | undefined,
  catalog: LlmCatalogProviderOption[],
  providerCode: string | undefined,
): ComboboxOption[] {
  if (!modelKey || options.some((item) => item.value === modelKey)) {
    return options;
  }
  const provider = catalog.find((item) => item.providerCode === providerCode);
  const match = provider?.models.find((model) => model.modelCode === modelKey);
  return [
    {
      value: modelKey,
      label: match ? `${match.modelName} (${modelKey})` : `${modelKey}（当前值）`,
    },
    ...options,
  ];
}

export function LlmMetaEditor({
  llm,
  fieldCode,
  templateVersionId,
  fieldOptions,
  applyFieldOptions = [],
  onChange,
}: LlmMetaEditorProps) {
  const [llmCatalog, setLlmCatalog] = useState<LlmCatalogProviderOption[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [activePromptTarget, setActivePromptTarget] = useState<LlmPromptInsertTarget>("user");
  const [showMultiProvider, setShowMultiProvider] = useState(
    () => (llm?.providers?.length ?? 0) > 1,
  );
  const systemPromptRef = useRef<LlmPromptTextareaHandle>(null);
  const userPromptRef = useRef<LlmPromptTextareaHandle>(null);

  useEffect(() => {
    let active = true;
    setLoadingCatalog(true);
    void fetchLlmCatalog("ALL")
      .then((catalog) => {
        if (active) {
          setLlmCatalog(catalog);
        }
      })
      .catch(() => {
        if (active) {
          setLlmCatalog([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingCatalog(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const config = llm ?? {};
  const providerCode = config.providerCode ?? "";
  const modelKey = config.modelKey ?? "";
  const agentMode = isLlmAgentMode(config);
  const mode: LlmSuggestMode = config.mode ?? (agentMode ? "agent" : "chat");
  const configMode: LlmAgentConfigMode = config.configMode ?? "standard";
  const applyTargets = resolveLlmApplyTargetPaths(config);

  function normalizePromptValue(value: string, defaultValue: string): string | undefined {
    const trimmed = value.trim();
    return trimmed === defaultValue.trim() ? undefined : trimmed || undefined;
  }

  const systemPromptDisplay = config.systemPrompt ?? DEFAULT_LLM_SUGGEST_SYSTEM_PROMPT;
  const promptTemplateStored = config.promptTemplate ?? DEFAULT_LLM_SUGGEST_PROMPT_TEMPLATE;

  const userPromptEditorValue = useMemo(
    () => storedUserPromptToDisplay(promptTemplateStored, fieldOptions),
    [fieldOptions, promptTemplateStored],
  );

  const userPromptPlaceholder = useMemo(
    () => storedUserPromptToDisplay(DEFAULT_LLM_SUGGEST_PROMPT_TEMPLATE, fieldOptions),
    [fieldOptions],
  );

  const usedVariablePaths = useMemo(
    () => extractLlmTemplateVariablePaths(systemPromptDisplay, promptTemplateStored),
    [promptTemplateStored, systemPromptDisplay],
  );

  const previewRevision = useMemo(
    () =>
      JSON.stringify({
        mode,
        configMode,
        applyTargets,
        systemPrompt: config.systemPrompt,
        promptTemplate: config.promptTemplate,
        agentPromptSuffix: config.agentPromptSuffix,
      }),
    [
      applyTargets,
      config.agentPromptSuffix,
      config.promptTemplate,
      config.systemPrompt,
      configMode,
      mode,
    ],
  );

  function patch(next: Partial<LlmFieldMeta>) {
    let merged = { ...config, ...next };

    // 同步 providers ↔ providerCode/modelKey
    if ("providerCode" in next || "modelKey" in next) {
      // 来自单提供商下拉：同步到 providers[0]
      const pc = merged.providerCode || "";
      const mk = merged.modelKey || "";
      const existing = merged.providers ?? [];
      if (pc && mk) {
        const newProviders = [{ code: pc, model: mk, weight: 1 }];
        // 保留已有的额外提供商（第2个以后）
        for (let i = 1; i < existing.length; i++) {
          newProviders.push(existing[i]);
        }
        merged.providers = newProviders;
      }
    }
    if ("providers" in next && merged.providers && merged.providers.length > 0) {
      // 来自多提供商编辑器：同步第一个到 providerCode/modelKey
      merged.providerCode = merged.providers[0].code;
      merged.modelKey = merged.providers[0].model;
    }

    const systemText = merged.systemPrompt?.trim()
      ? merged.systemPrompt.trim()
      : DEFAULT_LLM_SUGGEST_SYSTEM_PROMPT;
    const userText = merged.promptTemplate?.trim()
      ? merged.promptTemplate.trim()
      : DEFAULT_LLM_SUGGEST_PROMPT_TEMPLATE;
    const contextFields = resolveLlmContextFields({
      ...merged,
      systemPrompt: systemText,
      promptTemplate: userText,
    });
    onChange({
      ...merged,
      contextFields: contextFields.length > 0 ? contextFields : undefined,
    });
  }

  function insertVariable(path: string) {
    const targetRef = activePromptTarget === "system" ? systemPromptRef : userPromptRef;
    targetRef.current?.insertVariable(path);
  }

  const providerOptions = useMemo(
    () =>
      ensureProviderOption(
        llmCatalog.map((provider) => ({
          value: provider.providerCode,
          label: `${provider.providerName} (${provider.providerCode})`,
        })),
        providerCode || undefined,
        llmCatalog,
      ),
    [llmCatalog, providerCode],
  );

  const modelOptions = useMemo(() => {
    const provider = llmCatalog.find((item) => item.providerCode === providerCode);
    const base = (provider?.models ?? []).map((model) => ({
      value: model.modelCode,
      label: `${model.modelName} (${model.modelCode})`,
    }));
    return ensureModelOption(base, modelKey || undefined, llmCatalog, providerCode || undefined);
  }, [llmCatalog, modelKey, providerCode]);

  return (
    <section className="space-y-3">
      <div>
        <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100">LLM 配置</h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          可编辑下方任务指令片段；完整 Prompt 由服务端从 schema 与题面数据组装，标注端不可篡改。
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-muted/80 p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">模型提供商</span>
            <Combobox
              value={providerCode}
              options={providerOptions}
              prefixOptions={[USE_TEMPLATE_DEFAULT_OPTION]}
              disabled={loadingCatalog}
              placeholder={loadingCatalog ? "加载目录…" : "选择提供商"}
              emptyText="暂无已发布的提供商"
              onValueChange={(nextProvider) => {
                patch({
                  providerCode: nextProvider || undefined,
                  modelKey: undefined,
                });
              }}
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">模型</span>
            <Combobox
              value={modelKey}
              options={modelOptions}
              prefixOptions={[USE_TEMPLATE_DEFAULT_OPTION]}
              disabled={loadingCatalog || !providerCode}
              placeholder={
                loadingCatalog
                  ? "加载目录…"
                  : providerCode
                    ? "选择模型"
                    : "请先选择提供商，或留空用模板默认"
              }
              emptyText={providerCode ? "该提供商下暂无已发布模型" : "请先选择提供商"}
              onValueChange={(nextModel) => patch({ modelKey: nextModel || undefined })}
            />
          </div>
        </div>

        {/* 多提供商路由配置 */}
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white/80 p-2.5 dark:border-slate-700 dark:bg-slate-950/40">
          <button
            type="button"
            className="flex w-full items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-200"
            onClick={() => setShowMultiProvider(!showMultiProvider)}
          >
            <span>多提供商路由（{config.providers?.length ?? 0} 个）</span>
            <span className="text-slate-400">{showMultiProvider ? "收起 ▲" : "展开 ▼"}</span>
          </button>
          {showMultiProvider && (
            <div className="pt-1">
              <p className="mb-2 text-[11px] leading-4 text-slate-500">
                配置多个 LLM 提供商。按列表顺序优先级调用，#1 最优先，不可用时自动切换到下一个。
              </p>
              <LlmProviderWeightEditor
                providers={(config.providers?.length ?? 0) > 0
                  ? config.providers!
                  : providerCode && modelKey
                    ? [{ code: providerCode, model: modelKey, weight: 1 }]
                    : []
                }
                catalog={llmCatalog}
                loadingCatalog={loadingCatalog}
                onChange={(nextProviders) => {
                  patch({ providers: nextProviders.length > 0 ? nextProviders : undefined });
                }}
              />
            </div>
          )}
        </div>

        <LlmPromptTextarea
          ref={systemPromptRef}
          label="系统提示词"
          target="system"
          activeTarget={activePromptTarget}
          value={systemPromptDisplay}
          rows={3}
          placeholder={DEFAULT_LLM_SUGGEST_SYSTEM_PROMPT}
          formatInsertToken={(path) => displayVariableTokenForPath(path, fieldOptions)}
          onFocusTarget={setActivePromptTarget}
          onChange={(systemPrompt) => patch({ systemPrompt: normalizePromptValue(systemPrompt, DEFAULT_LLM_SUGGEST_SYSTEM_PROMPT) })}
        />

        <LlmPromptTextarea
          ref={userPromptRef}
          label="用户提示词模板"
          target="user"
          activeTarget={activePromptTarget}
          value={userPromptEditorValue}
          rows={5}
          placeholder={userPromptPlaceholder}
          formatInsertToken={(path) => displayVariableTokenForPath(path, fieldOptions)}
          onFocusTarget={setActivePromptTarget}
          onChange={(displayValue) => {
            const stored = displayUserPromptToStored(displayValue, fieldOptions);
            patch({
              promptTemplate: normalizePromptValue(stored, DEFAULT_LLM_SUGGEST_PROMPT_TEMPLATE),
            });
          }}
        />
        <LlmPromptHighlightPreview value={userPromptEditorValue} className="-mt-1" />
        <p className="text-[11px] leading-4 text-slate-500">
          编辑区以「字段名」展示并高亮预览；保存为 {`{{path}}`}，运行时自动替换为题面真实值。未插入变量时，将自动附加【题面数据】块。
        </p>

        <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white/80 p-2.5 dark:border-slate-700 dark:bg-slate-950/40">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">插入题目字段</span>
          <LlmVariableInsertBar
            fieldOptions={fieldOptions}
            usedPaths={usedVariablePaths}
            onInsert={insertVariable}
          />
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">按钮文案</span>
          <TextFieldControl
            value={config.buttonLabel ?? DEFAULT_LLM_SUGGEST_BUTTON_LABEL}
            placeholder={DEFAULT_LLM_SUGGEST_BUTTON_LABEL}
            onChange={(buttonLabel) => {
              const trimmed = buttonLabel.trim();
              patch({
                buttonLabel:
                  trimmed === DEFAULT_LLM_SUGGEST_BUTTON_LABEL ? undefined : trimmed || undefined,
              });
            }}
          />
        </div>

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-700 dark:text-slate-200">允许重复生成</span>
          <SwitchFieldControl
            value={config.allowRegenerate !== false}
            onChange={(checked) => patch({ allowRegenerate: checked })}
          />
        </label>

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-700 dark:text-slate-200">
            自动加载
            <span className="ml-1 text-xs text-slate-400">进入工作台时自动获取建议</span>
          </span>
          <SwitchFieldControl
            value={config.autoLoad === true}
            onChange={(checked) => patch({ autoLoad: checked })}
          />
        </label>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">输出模式</span>
          <Combobox
            value={mode}
            options={[
              { value: "chat", label: "对话建议（仅展示）" },
              { value: "agent", label: "Agent（结构化 JSON，可应用到标注）" },
            ]}
            onValueChange={(nextMode) => {
              if (nextMode === "chat") {
                patch({ mode: "chat", applyTargets: undefined, applyMappings: undefined });
                return;
              }
              patch({
                mode: "agent",
                applyTargets: applyTargets.length > 0 ? applyTargets : [],
                applyMappings: undefined,
              });
            }}
          />
        </div>

        {mode === "agent" ? (
          <>
            <div className="space-y-2 rounded-lg border border-slate-200 bg-white/60 p-2.5 dark:border-slate-700 dark:bg-slate-950/30">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Agent 配置模式</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                    标准模式自动注入 JSON Schema 与输出约束；专业模式可自定义约束片段。
                  </p>
                </div>
                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
                  <button
                    type="button"
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[11px] font-medium transition",
                      configMode === "standard"
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400",
                    )}
                    onClick={() => patch({ configMode: "standard", agentPromptSuffix: undefined })}
                  >
                    标准配置
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[11px] font-medium transition",
                      configMode === "pro"
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400",
                    )}
                    onClick={() => patch({ configMode: "pro" })}
                  >
                    专业模式
                  </button>
                </div>
              </div>
            </div>

            <LlmApplyTargetsEditor
              targets={applyTargets}
              fieldOptions={applyFieldOptions}
              onChange={(nextTargets) =>
                patch({
                  mode: "agent",
                  applyTargets: nextTargets.filter(Boolean),
                  applyMappings: undefined,
                })
              }
            />

            {configMode === "pro" ? (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  输出约束（专业模式，追加到系统提示词）
                </span>
                <Textarea
                  value={config.agentPromptSuffix ?? ""}
                  rows={4}
                  placeholder="留空则使用系统默认 JSON 输出约束；填写后将覆盖标准模式的自动注入段。"
                  onChange={(event) =>
                    patch({
                      agentPromptSuffix: event.target.value.trim() || undefined,
                    })
                  }
                />
              </div>
            ) : (
              <p className="text-[11px] leading-4 text-slate-500">
                标准模式将根据上方所选字段自动生成 response_format JSON Schema，无需配置 JSON 键。
              </p>
            )}
          </>
        ) : null}

        <LlmPromptPreviewPanel
          fieldCode={fieldCode}
          templateVersionId={templateVersionId}
          configRevision={previewRevision}
        />
      </div>
    </section>
  );
}
