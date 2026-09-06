import { fetchDetail, fetchEngineList } from "@/low-code/adapters/request";
import { applyPathParams } from "@/low-code/adapters/path";
import { tasksResource, taskItemsResource, templatesResource } from "@/low-code-resources";
import { parseFormSchemaJson } from "@/low-code/utils/form-schema";
import { normalizeSnowflakeId } from "@/lib/id-utils";
import { request } from "@/utils/apiClient";
import {
  findTaskTemplateId,
  loadTaskImportTemplateContext,
} from "@/features/business/utils/import-template-draft";
import { fetchVersionSchema } from "./designer-api";

export interface PreviewTaskOption {
  id: string;
  title: string;
  taskCode?: string;
}

export interface PreviewTaskItemOption {
  id: string;
  seqNo: number;
  sourceItemKey?: string;
  payloadPreview?: string;
}

export interface PreviewTaskDetail {
  id: string;
  title: string;
  taskCode?: string;
  currentTemplateVersionId?: string;
}

/** 当前编辑模板关联的任务（若有） */
export async function findLinkedTaskForTemplate(templateId: string): Promise<string | null> {
  const row = await fetchDetail<Record<string, unknown>>(templatesResource, templateId);
  return normalizeSnowflakeId(row.taskId) ?? null;
}

export async function listPreviewTasks(keyword?: string): Promise<PreviewTaskOption[]> {
  const result = await fetchEngineList(tasksResource, {
    page: 1,
    pageSize: 50,
    keyword: keyword?.trim() || undefined,
    filters: [],
  });
  return (result.data as Record<string, unknown>[]).map((row) => ({
    id: String(normalizeSnowflakeId(row.id) ?? row.id),
    title: String(row.title ?? row.taskCode ?? row.id),
    taskCode: row.taskCode != null ? String(row.taskCode) : undefined,
  }));
}

export async function fetchPreviewTaskDetail(taskId: string): Promise<PreviewTaskDetail> {
  const row = await fetchDetail<Record<string, unknown>>(tasksResource, taskId);
  return {
    id: String(normalizeSnowflakeId(row.id) ?? taskId),
    title: String(row.title ?? row.taskCode ?? taskId),
    taskCode: row.taskCode != null ? String(row.taskCode) : undefined,
    currentTemplateVersionId: normalizeSnowflakeId(row.currentTemplateVersionId) ?? undefined,
  };
}

export async function listPreviewTaskItems(taskId: string): Promise<PreviewTaskItemOption[]> {
  const result = await fetchEngineList(taskItemsResource, {
    page: 1,
    pageSize: 100,
    filters: [{ field: "taskId", op: "eq", value: taskId }],
  });
  return (result.data as Record<string, unknown>[]).map((row) => ({
    id: String(normalizeSnowflakeId(row.id) ?? row.id),
    seqNo: Number(row.seqNo ?? 0),
    sourceItemKey: row.sourceItemKey != null ? String(row.sourceItemKey) : undefined,
    payloadPreview: row.payloadPreview != null ? String(row.payloadPreview) : undefined,
  }));
}

function parseTaskItemPayload(record: Record<string, unknown>): Record<string, unknown> {
  const payload = record.payload;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  const raw = record.payloadJson;
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

export async function fetchPreviewTaskItemPayload(
  taskId: string,
  itemId: string,
): Promise<Record<string, unknown>> {
  const detailApi = taskItemsResource.api.detail;
  if (!detailApi) {
    return {};
  }
  const path = applyPathParams(detailApi, { taskId, id: itemId });
  const record = await request<Record<string, unknown>>(path);
  return parseTaskItemPayload(record);
}

export interface PreviewTemplateSyncResult {
  templateId: string | null;
  versionId: string | null;
  schemaJson: string;
}

/** 按任务同步当前模板版本 schema（预览抽样用） */
export async function resolvePreviewTemplateForTask(taskId: string): Promise<PreviewTemplateSyncResult | null> {
  const templateId = await findTaskTemplateId(taskId);
  if (!templateId) {
    const ctx = await loadTaskImportTemplateContext(taskId);
    if (!ctx.hasTemplate || !ctx.formSchema) {
      return null;
    }
    return {
      templateId: ctx.templateId ?? null,
      versionId: null,
      schemaJson: JSON.stringify(ctx.formSchema),
    };
  }

  const task = await fetchPreviewTaskDetail(taskId);
  const versionId = task.currentTemplateVersionId ?? null;
  if (versionId) {
    return {
      templateId,
      versionId,
      schemaJson: await fetchVersionSchema(versionId),
    };
  }

  const ctx = await loadTaskImportTemplateContext(taskId);
  if (!ctx.formSchema) {
    return null;
  }
  return {
    templateId,
    versionId: null,
    schemaJson: JSON.stringify(ctx.formSchema),
  };
}

export function parsePreviewTemplateSchema(schemaJson: string) {
  return parseFormSchemaJson(schemaJson);
}
