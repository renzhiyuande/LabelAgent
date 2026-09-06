import { fetchDetail, fetchEngineList, runEngineAction } from "@/low-code/adapters/request";
import { applyPathParams } from "@/low-code/adapters/path";
import { templateVersionsResource, templatesResource } from "@/low-code-resources";
import type { EngineListQuery } from "@/low-code/types";
import { request } from "@/utils/apiClient";
import type { OptionSourceItem } from "@/low-code/schema/types";
import type { DimensionPackOption, ReviewDimensionItem } from "./types/review-dimension";
import type { TemplateVersionItem } from "./types";
import { mapVersionRecords } from "./utils/version-mappers";
import { normalizeReviewDimension } from "./utils/review-dimension-utils";

export interface SaveVersionDraftPayload {
  schemaJson: string;
  reviewPromptTemplate?: string;
  dimensions?: ReviewDimensionItem[];
}

interface OwnerVersionDetail {
  id: string | number;
  schemaJson?: string;
}

export interface TemplateDetailRecord {
  templateName?: string;
  currentTemplateVersionId?: string | number | null;
}

export async function fetchTemplateDetail(templateId: string): Promise<TemplateDetailRecord> {
  return fetchDetail<TemplateDetailRecord>(templatesResource, templateId);
}

export async function listTemplateVersions(templateId: string): Promise<TemplateVersionItem[]> {
  const query: EngineListQuery = {
    page: 1,
    pageSize: 100,
    filters: [{ field: "templateId", op: "eq", value: templateId }],
  };
  const result = await fetchEngineList(templateVersionsResource, query);
  return mapVersionRecords(result.data as unknown[]);
}

export async function fetchVersionSchema(versionId: string): Promise<string> {
  const record = await fetchDetail<OwnerVersionDetail>(templateVersionsResource, versionId);
  if (typeof record.schemaJson === "string") {
    return record.schemaJson;
  }
  return JSON.stringify(record.schemaJson ?? {});
}

export async function saveVersionDraft(
  versionId: string,
  payload: SaveVersionDraftPayload | string,
): Promise<void> {
  const body: SaveVersionDraftPayload =
    typeof payload === "string" ? { schemaJson: payload } : payload;
  await request<void>(applyPathParams("/api/v1/owner/template-versions/drafts/{id}", { id: versionId }), {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function createVersionDraft(templateId: string, baseVersionId?: string): Promise<string> {
  const created = await request<{ id: string | number }>("/api/v1/owner/template-versions/drafts", {
    method: "POST",
    body: JSON.stringify({ templateId, baseVersionId: baseVersionId ?? null }),
  });
  return String(created.id);
}

export async function publishTemplateVersion(versionId: string): Promise<void> {
  await runEngineAction(templateVersionsResource.resource, versionId, "publish");
}

export async function activateTemplateVersion(versionId: string): Promise<void> {
  await runEngineAction(templateVersionsResource.resource, versionId, "setAsCurrent");
}

export async function fetchReviewDimensions(versionId: string): Promise<ReviewDimensionItem[]> {
  const rows = await request<Record<string, unknown>[]>(
    `/api/v1/owner/template-versions/review-dimensions?templateVersionId=${encodeURIComponent(versionId)}`,
  );
  return (rows ?? []).map((row) => normalizeReviewDimension(row));
}

export async function batchUpdateReviewDimensions(
  versionId: string,
  dimensions: ReviewDimensionItem[],
): Promise<void> {
  await request<void>("/api/v1/owner/template-versions/review-dimensions/batch", {
    method: "PUT",
    body: JSON.stringify({ templateVersionId: Number(versionId), dimensions }),
  });
}

export async function fetchTemplateOptionSources(): Promise<OptionSourceItem[]> {
  return request<OptionSourceItem[]>("/api/v1/owner/template-options/sources");
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
  return (rows ?? []).map((row) => normalizeReviewDimension(row));
}
