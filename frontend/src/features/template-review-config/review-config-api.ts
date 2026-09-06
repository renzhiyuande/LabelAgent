import { applyPathParams } from "@/low-code/adapters/path";
import { request } from "@/utils/apiClient";
import { normalizeReviewDimension } from "@/features/template-designer/utils/review-dimension-utils";
import type { DimensionPackOption, ReviewDimensionItem } from "@/features/template-designer/types/review-dimension";
import { parseReviewWorkflowLevelsFromDetail } from "./review-workflow-utils";
import type { ReviewWorkflowLevelItem } from "./review-workflow-types";

export interface LlmCatalogModelOption {
  id: number;
  modelCode: string;
  modelName: string;
  modelType: string;
  status: string;
}

export interface LlmCatalogProviderOption {
  id: number;
  providerCode: string;
  providerName: string;
  status: string;
  models: LlmCatalogModelOption[];
}

export interface TemplateReviewConfigDetail {
  templateVersionId: number | string;
  versionNo?: number;
  status?: string;
  reviewPromptTemplate?: string | null;
  providerPlatformKey?: string | null;
  modelId?: string | null;
  reviewWorkflowLevels: ReviewWorkflowLevelItem[];
  dimensions: ReviewDimensionItem[];
}

export type ReviewPromptAssistMode = "INITIAL_DRAFT" | "OPTIMIZE_FROM_HISTORY";

export interface ReviewPromptAssistResult {
  mode: ReviewPromptAssistMode;
  suggestedPromptTemplate: string;
  summary: string;
  focusPoints: string[];
  historyCaseCount: number;
  usedHistory: boolean;
}

function parseDimensionRows(raw: unknown): ReviewDimensionItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((row) => normalizeReviewDimension(row as Record<string, unknown>));
}

function extractDimensions(detail: Record<string, unknown>): ReviewDimensionItem[] {
  const fromDimensions = parseDimensionRows(detail.dimensions);
  if (fromDimensions.length > 0) {
    return fromDimensions;
  }
  return parseDimensionRows(detail.reviewDimensions);
}

function extractReviewPromptTemplate(detail: Record<string, unknown>): string | null {
  const value = detail.reviewPromptTemplate ?? detail.review_prompt_template;
  if (value == null) {
    return null;
  }
  const text = String(value).trim();
  return text || null;
}

async function fetchReviewDimensionsOnly(versionId: string): Promise<ReviewDimensionItem[]> {
  const rows = await request<Record<string, unknown>[]>(
    `/api/v1/owner/template-versions/review-dimensions?templateVersionId=${encodeURIComponent(versionId)}`,
  );
  return parseDimensionRows(rows);
}

function mapReviewConfigDetail(
  versionId: string,
  detail: Record<string, unknown>,
  dimensions: ReviewDimensionItem[],
): TemplateReviewConfigDetail {
  const providerPlatformKey = detail.providerPlatformKey ?? detail.provider_platform_key;
  const modelId = detail.modelId ?? detail.model_id;
  return {
    templateVersionId: (detail.templateVersionId ?? detail.id ?? versionId) as string | number,
    versionNo: detail.versionNo != null ? Number(detail.versionNo) : undefined,
    status: detail.status != null ? String(detail.status) : undefined,
    reviewPromptTemplate: extractReviewPromptTemplate(detail),
    providerPlatformKey: providerPlatformKey != null ? String(providerPlatformKey) : null,
    modelId: modelId != null ? String(modelId) : null,
    reviewWorkflowLevels: parseReviewWorkflowLevelsFromDetail(detail),
    dimensions,
  };
}

/** 加载审核配置；review-config 无维度时回退 review-dimensions 接口 */
export async function loadReviewConfigForVersion(versionId: string): Promise<TemplateReviewConfigDetail> {
  const trimmedVersionId = versionId.trim();
  if (!trimmedVersionId) {
    return {
      templateVersionId: versionId,
      reviewWorkflowLevels: parseReviewWorkflowLevelsFromDetail({}),
      dimensions: [],
      reviewPromptTemplate: null,
    };
  }

  try {
    const detail = await request<Record<string, unknown>>(
      applyPathParams("/api/v1/owner/template-versions/{id}/review-config", {
        id: trimmedVersionId,
      }),
    );
    let dimensions = extractDimensions(detail);
    if (dimensions.length === 0) {
      dimensions = await fetchReviewDimensionsOnly(trimmedVersionId);
    }
    return mapReviewConfigDetail(trimmedVersionId, detail, dimensions);
  } catch {
    const dimensions = await fetchReviewDimensionsOnly(trimmedVersionId);
    return {
      templateVersionId: trimmedVersionId,
      dimensions,
      reviewWorkflowLevels: [],
      reviewPromptTemplate: null,
    };
  }
}

export async function fetchReviewConfig(versionId: string): Promise<TemplateReviewConfigDetail> {
  return loadReviewConfigForVersion(versionId);
}

export async function saveReviewConfig(
  versionId: string,
  reviewPromptTemplate: string,
  dimensions: ReviewDimensionItem[],
  options?: {
    providerPlatformKey?: string | null;
    modelId?: string | null;
    reviewWorkflowLevels?: ReviewWorkflowLevelItem[];
  },
): Promise<TemplateReviewConfigDetail> {
  const detail = await request<Record<string, unknown>>(
    applyPathParams("/api/v1/owner/template-versions/{id}/review-config", { id: versionId }),
    {
      method: "PUT",
      body: JSON.stringify({
        templateVersionId: Number(versionId),
        reviewPromptTemplate,
        providerPlatformKey: options?.providerPlatformKey ?? null,
        modelId: options?.modelId ?? null,
        reviewWorkflowLevels: options?.reviewWorkflowLevels,
        dimensions,
      }),
    },
  );
  const savedDimensions = extractDimensions(detail);
  return mapReviewConfigDetail(
    versionId,
    detail,
    savedDimensions.length > 0 ? savedDimensions : dimensions,
  );
}

export async function generateReviewPromptAssist(
  versionId: string,
  payload: {
    mode: ReviewPromptAssistMode;
    providerPlatformKey: string;
    modelId: string;
    currentPromptTemplate: string;
    dimensions: ReviewDimensionItem[];
  },
): Promise<ReviewPromptAssistResult> {
  return request<ReviewPromptAssistResult>(
    applyPathParams("/api/v1/owner/template-versions/{id}/review-config/assist", { id: versionId }),
    {
      method: "POST",
      body: JSON.stringify({
        templateVersionId: Number(versionId),
        mode: payload.mode,
        providerPlatformKey: payload.providerPlatformKey,
        modelId: payload.modelId,
        currentPromptTemplate: payload.currentPromptTemplate,
        dimensions: payload.dimensions,
      }),
    },
  );
}

export async function fetchLlmCatalog(scenario = "REVIEW"): Promise<LlmCatalogProviderOption[]> {
  return request<LlmCatalogProviderOption[]>(
    `/api/v1/owner/llm-catalog?scenario=${encodeURIComponent(scenario)}`,
  );
}

export async function listDimensionPackOptions(): Promise<DimensionPackOption[]> {
  return request<DimensionPackOption[]>("/api/v1/owner/template-versions/dimension-pack-options");
}

export async function applyDimensionPack(
  versionId: string,
  packId: number,
): Promise<ReviewDimensionItem[]> {
  const rows = await request<Record<string, unknown>[]>(
    applyPathParams("/api/v1/owner/template-versions/{id}/apply-dimension-pack", { id: versionId }),
    {
      method: "POST",
      body: JSON.stringify({ packId }),
    },
  );
  return parseDimensionRows(rows);
}
