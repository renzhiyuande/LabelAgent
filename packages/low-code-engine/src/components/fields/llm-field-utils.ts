import {
  DEFAULT_LLM_SUGGEST_BUTTON_LABEL,
  DEFAULT_LLM_SUGGEST_PROMPT_TEMPLATE,
  DEFAULT_LLM_SUGGEST_SYSTEM_PROMPT,
} from "../../constants/llm-suggest-defaults";
import type { LlmApplyMapping, LlmFieldMeta } from "../../schema/types";
import { isLlmAgentMode, resolveLlmApplyMappings, resolveLlmApplyTargetPaths } from "./llm-apply-utils";

export interface ResolvedLlmFieldConfig {
  providerCode?: string;
  modelKey?: string;
  mode: "chat" | "agent";
  applyTargets: string[];
  applyMappings: LlmApplyMapping[];
  systemPrompt: string;
  promptTemplate: string;
  contextFields: string[];
  buttonLabel: string;
  allowRegenerate: boolean;
  autoLoad: boolean;
}

/** 从提示词模板中提取 {{path}} 变量 */
export function extractLlmTemplateVariablePaths(...templates: Array<string | undefined>): string[] {
  const paths = new Set<string>();
  for (const template of templates) {
    if (!template) {
      continue;
    }
    for (const match of template.matchAll(/\{\{\s*([^{}\s]+)\s*\}\}/g)) {
      const path = match[1]?.trim();
      if (path) {
        paths.add(path);
      }
    }
  }
  return [...paths];
}

export function resolveLlmContextFields(llm?: LlmFieldMeta): string[] {
  const systemPrompt = llm?.systemPrompt?.trim() || DEFAULT_LLM_SUGGEST_SYSTEM_PROMPT;
  const promptTemplate = llm?.promptTemplate?.trim() || DEFAULT_LLM_SUGGEST_PROMPT_TEMPLATE;
  const fromTemplates = extractLlmTemplateVariablePaths(systemPrompt, promptTemplate);
  if (fromTemplates.length > 0) {
    return fromTemplates;
  }
  return llm?.contextFields ?? [];
}

export function resolveLlmFieldConfig(llm?: LlmFieldMeta): ResolvedLlmFieldConfig {
  const systemPrompt = llm?.systemPrompt?.trim() || DEFAULT_LLM_SUGGEST_SYSTEM_PROMPT;
  const promptTemplate = llm?.promptTemplate?.trim() || DEFAULT_LLM_SUGGEST_PROMPT_TEMPLATE;
  return {
    providerCode: llm?.providerCode,
    modelKey: llm?.modelKey,
    mode: isLlmAgentMode(llm) ? "agent" : "chat",
    applyTargets: resolveLlmApplyTargetPaths(llm),
    applyMappings: resolveLlmApplyMappings(llm),
    systemPrompt,
    promptTemplate,
    contextFields: resolveLlmContextFields(llm),
    buttonLabel: llm?.buttonLabel?.trim() || DEFAULT_LLM_SUGGEST_BUTTON_LABEL,
    allowRegenerate: llm?.allowRegenerate !== false,
    autoLoad: llm?.autoLoad === true,
  };
}

/** 将 promptTemplate 中的 {{path}} 替换为上下文值 */
export function renderLlmPromptTemplate(
  template: string,
  context: Record<string, unknown>,
): string {
  return template.replace(/\{\{\s*([^{}\s]+)\s*\}\}/g, (_, rawPath: string) => {
    const value = context[rawPath];
    if (value == null) {
      return "";
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  });
}
