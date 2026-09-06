import { buildLegacyListPathFromTemplate, fetchDetail } from "@/low-code/adapters/request";
import { templatesResource } from "../../../low-code-resources/templates";
import {
  exportFormSchemaJson,
  parseFormSchemaJson,
} from "@/low-code/utils/form-schema";
import type { FormSchema } from "@/low-code/schema/types";
import {
  createVersionDraft,
  fetchVersionSchema,
  listTemplateVersions,
  saveVersionDraft,
} from "../../template-designer/designer-api";
import { request } from "../../../utils/apiClient";
import type { ResourcePageResponse } from "@/low-code/types";
import { inferImportContractFromFormSchema } from "@/low-code/schema/import-field-meta";
import { collectPayloadKeysFromFormSchema } from "./import-schema-validation";
import {
  allowedImportKeys,
  parseImportContract,
  type TaskImportPayloadContract,
} from "./import-payload-contract";

interface TemplateSummary {
  id: string | number;
  templateCode?: string;
  templateName?: string;
}

interface TaskRecordLike {
  title?: string;
  taskCode?: string;
  sceneCode?: string;
}

interface TemplateDetailWithTask {
  taskId?: string | number | null;
}

export interface TaskImportTemplateContext {
  hasTemplate: boolean;
  templateId?: string;
  versionNo?: number;
  /** @deprecated 使用 importContract */
  payloadKeys: string[];
  importContract: TaskImportPayloadContract | null;
  formSchema?: FormSchema;
}

interface TaskLatestTemplateVersionResponse {
  id: string | number;
  versionNo?: number;
  schemaJson?: string | Record<string, unknown>;
  importContract?: unknown;
}

function schemaJsonToFormSchema(schemaJson: string | Record<string, unknown> | undefined): FormSchema {
  if (schemaJson == null) {
    return parseFormSchemaJson(undefined);
  }
  if (typeof schemaJson === "string") {
    return parseFormSchemaJson(schemaJson);
  }
  return parseFormSchemaJson(JSON.stringify(schemaJson));
}

export async function findTaskTemplateId(taskId: string): Promise<string | null> {
  const listApi = templatesResource.api.query;
  if (!listApi) {
    return null;
  }
  const listPath = buildLegacyListPathFromTemplate(
    listApi,
    { taskId },
    { page: 1, pageSize: 20, filters: [] },
  );
  const page = await request<ResourcePageResponse<TemplateSummary>>(listPath);
  const existing = page.list?.[0];
  return existing?.id != null ? String(existing.id) : null;
}

/** 加载任务是否已有可用模板（有则后续导入须校验字段，且不再自动生成模板） */
function buildTemplateContext(
  formSchema: FormSchema,
  importContract: TaskImportPayloadContract | null,
  extra: Omit<TaskImportTemplateContext, "payloadKeys" | "importContract" | "hasTemplate" | "formSchema">,
): TaskImportTemplateContext {
  const contract =
    importContract ?? (formSchema.sections.length > 0 ? inferImportContractFromFormSchema(formSchema) : null);
  const payloadKeys = contract ? allowedImportKeys(contract) : collectPayloadKeysFromFormSchema(formSchema);
  if (payloadKeys.length === 0 && !contract) {
    return { hasTemplate: false, payloadKeys: [], importContract: null, formSchema, ...extra };
  }
  return {
    hasTemplate: true,
    payloadKeys,
    importContract: contract,
    formSchema,
    ...extra,
  };
}

export async function loadTaskImportTemplateContext(taskId: string): Promise<TaskImportTemplateContext> {
  try {
    const detail = await request<TaskLatestTemplateVersionResponse>(
      `/api/v1/owner/tasks/${encodeURIComponent(taskId)}/template/latest`,
      {},
      { notifyOnError: false },
    );
    const formSchema = schemaJsonToFormSchema(detail.schemaJson);
    const importContract = parseImportContract(detail.importContract);
    return buildTemplateContext(formSchema, importContract, { versionNo: detail.versionNo });
  } catch {
    const templateId = await findTaskTemplateId(taskId);
    if (!templateId) {
      return { hasTemplate: false, payloadKeys: [], importContract: null };
    }
    const versions = await listTemplateVersions(templateId);
    if (versions.length === 0) {
      return { hasTemplate: false, payloadKeys: [], importContract: null, templateId };
    }
    const latest = versions[0];
    const schemaJson = await fetchVersionSchema(latest.id);
    const formSchema = parseFormSchemaJson(schemaJson);
    const versionNo = latest.versionNo ? Number(latest.versionNo) : undefined;
    return buildTemplateContext(formSchema, null, { templateId, versionNo });
  }
}

export async function resolveTaskTemplateId(
  taskId: string,
  taskRecord?: TaskRecordLike | null,
): Promise<string> {
  const existingId = await findTaskTemplateId(taskId);
  if (existingId) {
    return existingId;
  }

  const taskCode = taskRecord?.taskCode ?? `TASK-${taskId}`;
  const created = await request<TemplateSummary>("/api/v1/owner/templates", {
    method: "POST",
    body: JSON.stringify({
      taskId: taskId,
      templateCode: `${taskCode}-tpl`,
      templateName: `${taskRecord?.title ?? taskCode} · 标注模板`,
      sceneCode: taskRecord?.sceneCode ?? "GENERAL",
      descriptionText: "由导入数据自动生成",
    }),
  });
  return String(created.id);
}

/** 设计器保存前：按模板主表 taskId 加载任务导入契约 */
export async function loadImportContractForTemplate(
  templateId: string,
): Promise<TaskImportPayloadContract | null> {
  try {
    const template = await fetchDetail<TemplateDetailWithTask>(templatesResource, templateId);
    const taskId = template.taskId;
    if (taskId == null || taskId === "") {
      return null;
    }
    const detail = await request<TaskLatestTemplateVersionResponse>(
      `/api/v1/owner/tasks/${encodeURIComponent(String(taskId))}/template/latest`,
      {},
      { notifyOnError: false },
    );
    return parseImportContract(detail.importContract);
  } catch {
    return null;
  }
}

export async function saveImportGeneratedTemplateDraft(
  templateId: string,
  formSchema: FormSchema,
): Promise<string> {
  const versions = await listTemplateVersions(templateId);
  const baseVersionId = versions[0]?.id;
  const versionId = await createVersionDraft(templateId, baseVersionId);
  await saveVersionDraft(versionId, exportFormSchemaJson(formSchema));
  return versionId;
}
