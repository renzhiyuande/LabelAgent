import { create } from "zustand";
import { toast } from "sonner";
import { appMessage } from "@/lib/message";
import { validateSchemaRespectsImportContract } from "@/low-code/schema/import-field-meta";
import {
  buildResourceMeta,
  countFormFields,
  createEmptyFormSchema,
  exportFormSchemaJson,
  parseFormSchemaJson,
} from "@/low-code/utils/form-schema";
import { findEditableDraftVersion, isVersionDraft, isVersionPublished } from "@/low-code/utils/form-schema";
import { normalizeSnowflakeId } from "@/lib/id-utils";
import { loadImportContractForTemplate } from "@/features/business/utils/import-template-draft";
import {
  activateTemplateVersion,
  createVersionDraft,
  fetchTemplateDetail,
  fetchVersionSchema,
  listTemplateVersions,
  publishTemplateVersion,
  saveVersionDraft,
  type SaveVersionDraftPayload,
  type TemplateDetailRecord,
} from "../designer-api";
import type { TemplateVersionItem } from "../types";
import { useDesignerEditorStore } from "./designer-editor-store";
import { useDesignerReviewConfigStore } from "./designer-review-config-store";

interface BootstrapParams {
  templateId: string;
  versionId?: string | null;
  silent?: boolean;
}

interface DesignerSessionState {
  sessionReady: boolean;
  sessionLoading: boolean;
  sessionError: Error | null;
  loadGeneration: number;
  reset: () => void;
  bootstrapSession: (params: BootstrapParams) => Promise<void>;
  saveDraft: () => Promise<boolean>;
  publishDraft: () => Promise<boolean>;
  createVersionSnapshot: (description: string) => Promise<boolean>;
  rollbackToVersion: (versionId: string) => Promise<boolean>;
  switchDraftVersion: (versionId: string) => Promise<boolean>;
  exportResourceMeta: () => void;
}

function resolveTargetVersionId(
  versionId: string | null | undefined,
  templateDetail: TemplateDetailRecord,
  versions: TemplateVersionItem[],
): string | undefined {
  const fromQuery = normalizeSnowflakeId(versionId);
  if (fromQuery) {
    return fromQuery;
  }
  const draft = findEditableDraftVersion(versions);
  if (draft) {
    return draft.id;
  }
  const fromTemplate = normalizeSnowflakeId(templateDetail.currentTemplateVersionId);
  if (fromTemplate) {
    return fromTemplate;
  }
  const current = versions.find((version) => version.isCurrent);
  return current?.id ?? versions[0]?.id;
}

async function assertImportContract(templateId: string): Promise<boolean> {
  const contract = await loadImportContractForTemplate(templateId);
  if (!contract?.requiredKeys.length) {
    return true;
  }
  const schema = useDesignerEditorStore.getState().formSchema;
  const result = validateSchemaRespectsImportContract(schema, contract);
  if (!result.ok) {
    toast.error(result.message ?? "模板变更与任务导入契约冲突");
    return false;
  }
  return true;
}

async function hydrateVersion(versionId: string) {
  const schemaJson = await fetchVersionSchema(versionId);
  const schema = parseFormSchemaJson(schemaJson);
  const editor = useDesignerEditorStore.getState();
  editor.loadFormSchema(schema);
  editor.markVersionAsCurrent(versionId);
  return { fieldCount: countFormFields(schema), versionNo: editor.versionNo };
}

async function ensureDraftVersion(templateId: string): Promise<string | null> {
  const editor = useDesignerEditorStore.getState();
  if (editor.currentVersionId && editor.templateId === templateId) {
    await hydrateVersion(editor.currentVersionId);
    return editor.currentVersionId;
  }

  const existing = await listTemplateVersions(templateId);
  editor.setVersions(existing);

  if (existing.length > 0) {
    const draft = findEditableDraftVersion(existing);
    if (draft) {
      await hydrateVersion(draft.id);
      return draft.id;
    }
    const baseId = existing.find((version) => version.isCurrent)?.id ?? existing[0].id;
    const newVersionId = await createVersionDraft(templateId, baseId);
    await saveVersionDraft(newVersionId, exportFormSchemaJson(editor.formSchema));
    const refreshed = await listTemplateVersions(templateId);
    editor.setVersions(refreshed);
    await hydrateVersion(newVersionId);
    return newVersionId;
  }

  const newVersionId = await createVersionDraft(templateId);
  await saveVersionDraft(newVersionId, exportFormSchemaJson(createEmptyFormSchema()));
  const refreshed = await listTemplateVersions(templateId);
  editor.setVersions(refreshed);
  await hydrateVersion(newVersionId);
  return newVersionId;
}

function buildVersionDraftPayload(versionId: string, schemaJson: string): SaveVersionDraftPayload {
  const payload: SaveVersionDraftPayload = { schemaJson };
  const reviewStore = useDesignerReviewConfigStore.getState();
  const reviewPayload = reviewStore.buildPendingSavePayload(versionId);
  if (reviewPayload) {
    payload.reviewPromptTemplate = reviewPayload.reviewPromptTemplate;
    payload.dimensions = reviewPayload.dimensions;
  }
  return payload;
}

async function persistVersionDraft(versionId: string, schemaJson: string): Promise<void> {
  const reviewStore = useDesignerReviewConfigStore.getState();
  const validationError = reviewStore.validatePendingSavePayload(versionId);
  if (validationError) {
    throw new Error(validationError);
  }
  await saveVersionDraft(versionId, buildVersionDraftPayload(versionId, schemaJson));
  reviewStore.markClean(versionId);
}

export const useDesignerSessionStore = create<DesignerSessionState>((set, get) => ({
  sessionReady: false,
  sessionLoading: false,
  sessionError: null,
  loadGeneration: 0,

  reset: () => {
    useDesignerEditorStore.getState().resetEditor();
    useDesignerReviewConfigStore.setState({ bound: null });
    set({ sessionReady: false, sessionLoading: false, sessionError: null, loadGeneration: 0 });
  },

  bootstrapSession: async ({ templateId, versionId, silent }) => {
    const generation = get().loadGeneration + 1;
    set({ loadGeneration: generation, sessionLoading: true, sessionError: null });
    if (!silent) {
      set({ sessionReady: false });
    }

    const isStale = () => get().loadGeneration !== generation;

    try {
      const editor = useDesignerEditorStore.getState();
      editor.setTemplateId(templateId);

      const templateDetail = await fetchTemplateDetail(templateId);
      if (isStale()) {
        return;
      }
      if (templateDetail.templateName) {
        editor.setTemplateNameQuiet(templateDetail.templateName);
      }
      const importContract = await loadImportContractForTemplate(templateId);
      if (isStale()) {
        return;
      }
      editor.setImportContract(importContract);

      const versions = await listTemplateVersions(templateId);
      if (isStale()) {
        return;
      }
      editor.setVersions(versions);

      const targetVersionId = resolveTargetVersionId(versionId, templateDetail, versions);
      if (targetVersionId) {
        const result = await hydrateVersion(targetVersionId);
        if (!silent) {
          toast.success(
            result.fieldCount > 0
              ? `已加载草稿 v${result.versionNo}（${result.fieldCount} 个字段）`
              : `已加载草稿 v${result.versionNo}（空白画布）`,
          );
        }
      } else {
        await ensureDraftVersion(templateId);
        if (!silent) {
          toast.info("已创建空白草稿，可开始搭建");
        }
      }
    } catch (error) {
      if (!isStale()) {
        const err = error instanceof Error ? error : new Error("加载模板会话失败");
        set({ sessionError: err });
      }
    } finally {
      if (!isStale()) {
        set({ sessionLoading: false, sessionReady: true });
      }
    }
  },

  saveDraft: async () => {
    const editor = useDesignerEditorStore.getState();
    const templateId = editor.templateId;
    if (!templateId) {
      editor.setDirty(false);
      toast.success("模板草稿已保存");
      return true;
    }
    if (!(await assertImportContract(templateId))) {
      return false;
    }

    let versionId = editor.currentVersionId;
    if (!versionId) {
      try {
        versionId = await ensureDraftVersion(templateId);
      } catch (error) {
        appMessage.errorUnlessHandled("创建草稿版本失败", error);
        return false;
      }
    }
    if (!versionId) {
      toast.error("没有可保存的草稿版本");
      return false;
    }

    const activeVersion = editor.versions.find((version) => version.id === versionId);
    try {
      if (!isVersionDraft(activeVersion?.status)) {
        const newVersionId = await createVersionDraft(templateId, versionId);
        await persistVersionDraft(newVersionId, exportFormSchemaJson(editor.formSchema));
        await get().bootstrapSession({ templateId, versionId: newVersionId, silent: true });
        editor.setDirty(false);
        toast.success("已基于当前版本创建草稿并保存");
        return true;
      }
      const includedReview = Boolean(
        useDesignerReviewConfigStore.getState().buildPendingSavePayload(versionId),
      );
      await persistVersionDraft(versionId, exportFormSchemaJson(editor.formSchema));
      editor.setDirty(false);
      toast.success(includedReview ? "模板草稿与审核配置已保存" : "模板草稿已保存");
      return true;
    } catch (error) {
      appMessage.errorUnlessHandled("保存草稿失败", error);
      return false;
    }
  },

  publishDraft: async () => {
    const editor = useDesignerEditorStore.getState();
    const templateId = editor.templateId;
    if (!templateId) {
      toast.error("当前会话未绑定模板，无法发布");
      return false;
    }
    if (!(await assertImportContract(templateId))) {
      return false;
    }

    let versionId = editor.currentVersionId;
    if (!versionId) {
      versionId = await ensureDraftVersion(templateId);
    }
    if (!versionId) {
      toast.error("没有可发布的版本");
      return false;
    }

    const activeVersion = editor.versions.find((version) => version.id === versionId);
    if (!isVersionDraft(activeVersion?.status)) {
      toast.error("当前版本已发布，请新建草稿后再发布");
      return false;
    }

    try {
      await persistVersionDraft(versionId, exportFormSchemaJson(editor.formSchema));
      await publishTemplateVersion(versionId);
      await get().bootstrapSession({ templateId, versionId, silent: true });
      editor.setDirty(false);
      toast.success("版本已发布");
      return true;
    } catch (error) {
      appMessage.errorUnlessHandled("发布失败", error);
      return false;
    }
  },

  createVersionSnapshot: async (description) => {
    const editor = useDesignerEditorStore.getState();
    const templateId = editor.templateId;
    if (!templateId) {
      toast.success("新版本已创建");
      return true;
    }
    if (!(await assertImportContract(templateId))) {
      return false;
    }

    const schemaJson = exportFormSchemaJson(editor.formSchema);
    const activeId = editor.currentVersionId;
    const activeVersion = editor.versions.find((version) => version.id === activeId);

    try {
      if (activeId && isVersionDraft(activeVersion?.status)) {
        await persistVersionDraft(activeId, schemaJson);
      }
      const newVersionId = await createVersionDraft(templateId, activeId ?? undefined);
      await persistVersionDraft(newVersionId, schemaJson);
      await get().bootstrapSession({ templateId, versionId: newVersionId, silent: true });
      toast.success(description ? `${description} 已创建` : "新版本已创建");
      return true;
    } catch (error) {
      appMessage.errorUnlessHandled("创建版本失败", error);
      return false;
    }
  },

  rollbackToVersion: async (versionId) => {
    const editor = useDesignerEditorStore.getState();
    const templateId = editor.templateId;
    if (!templateId) {
      return false;
    }
    const target = editor.versions.find((version) => version.id === versionId);
    if (!isVersionPublished(target?.status)) {
      toast.error("仅已发布版本可回滚");
      return false;
    }
    try {
      await activateTemplateVersion(versionId);
      await hydrateVersion(versionId);
      await get().bootstrapSession({ templateId, versionId, silent: true });
      toast.success("已回滚到该发布版本");
      return true;
    } catch (error) {
      appMessage.errorUnlessHandled("回滚失败", error);
      return false;
    }
  },

  switchDraftVersion: async (versionId) => {
    const target = useDesignerEditorStore.getState().versions.find((version) => version.id === versionId);
    if (!isVersionDraft(target?.status)) {
      toast.error("仅草稿版本可切换");
      return false;
    }
    try {
      await hydrateVersion(versionId);
      useDesignerEditorStore.getState().setDirty(false);
      toast.success(`已切换到草稿 v${target?.versionNo ?? ""}`);
      return true;
    } catch (error) {
      appMessage.errorUnlessHandled("切换草稿失败", error);
      return false;
    }
  },

  exportResourceMeta: () => {
    const editor = useDesignerEditorStore.getState();
    const payload = buildResourceMeta(editor.formSchema, editor.templateName, editor.resourceKey);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${editor.templateName || "template"}-resource-meta.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("已导出 ResourceMeta JSON");
  },
}));
