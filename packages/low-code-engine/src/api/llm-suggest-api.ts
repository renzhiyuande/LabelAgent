import { normalizeSnowflakeId } from "../lib/id-utils";
import { request } from "../adapters/lowcode-utils";
import type { LlmApplyMapping } from "../schema/types";

export interface LlmSuggestRequest {
  fieldCode?: string;
  templateVersionId?: string;
  assignmentId?: string;
  submissionId?: string;
  taskId?: string;
  /** 后端是否允许重复生成；false 时若已有成功记录则直接复用 */
  allowRegenerate?: boolean;
}

export interface LlmSuggestPreviewRequest {
  fieldCode: string;
  templateVersionId: string;
  taskItemId?: string;
  assignmentId?: string;
  submissionId?: string;
  taskId?: string;
}

export interface LlmSuggestResponse {
  text: string;
  parsedOutput?: Record<string, unknown> | null;
  recordId?: number | null;
  applyMappings?: LlmApplyMapping[];
}

export interface LlmSuggestPreviewResponse {
  systemPrompt: string;
  userPrompt: string;
  mode: "chat" | "agent" | string;
  applyMappings?: LlmApplyMapping[];
  contextFieldCount?: number;
  outputJsonSchema?: Record<string, unknown> | null;
}

/** 雪花 ID 以 string 提交，避免 JSON Number 精度丢失导致后端查不到版本 */
function withSnowflakeIds(body: LlmSuggestRequest | LlmSuggestPreviewRequest) {
  const { templateVersionId, assignmentId, submissionId, taskId, taskItemId, ...rest } = body as LlmSuggestPreviewRequest;
  return {
    ...rest,
    ...(normalizeSnowflakeId(templateVersionId) ? { templateVersionId: normalizeSnowflakeId(templateVersionId) } : {}),
    ...(normalizeSnowflakeId(assignmentId) ? { assignmentId: normalizeSnowflakeId(assignmentId) } : {}),
    ...(normalizeSnowflakeId(submissionId) ? { submissionId: normalizeSnowflakeId(submissionId) } : {}),
    ...(normalizeSnowflakeId(taskId) ? { taskId: normalizeSnowflakeId(taskId) } : {}),
    ...(normalizeSnowflakeId(taskItemId) ? { taskItemId: normalizeSnowflakeId(taskItemId) } : {}),
  };
}

export async function invokeLlmSuggest(body: LlmSuggestRequest): Promise<LlmSuggestResponse> {
  const result = await request<LlmSuggestResponse>("/api/v1/engine/llm-suggest", {
    method: "POST",
    body: JSON.stringify(withSnowflakeIds(body)),
  });
  return {
    text: result.text?.trim() ?? "",
    parsedOutput: result.parsedOutput ?? null,
    recordId: result.recordId ?? null,
    applyMappings: result.applyMappings ?? [],
  };
}

export async function previewLlmSuggest(body: LlmSuggestPreviewRequest): Promise<LlmSuggestPreviewResponse> {
  const result = await request<LlmSuggestPreviewResponse>("/api/v1/engine/llm-suggest/preview", {
    method: "POST",
    body: JSON.stringify(withSnowflakeIds(body)),
  });
  return {
    systemPrompt: result.systemPrompt?.trim() ?? "",
    userPrompt: result.userPrompt?.trim() ?? "",
    mode: result.mode ?? "chat",
    applyMappings: result.applyMappings ?? [],
    contextFieldCount: result.contextFieldCount ?? 0,
    outputJsonSchema: result.outputJsonSchema ?? null,
  };
}
