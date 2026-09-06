import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ExternalLink, LayoutTemplate, Loader2, Plus } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { appMessage } from "../../../lib/message";
import type { WorkflowRendererProps } from "@/low-code/actions/workflow-registry";
import { isVersionDraft } from "@/low-code/utils/form-schema";
import { request } from "../../../utils/apiClient";
import { appendDesignerReturnTo } from "../../template-designer/hooks/use-designer-back";
import {
  fetchTemplateDetail,
  listTemplateVersions,
  type TemplateDetailRecord,
} from "../../template-designer/designer-api";
import { findTaskTemplateId } from "../utils/import-template-draft";
import type { TemplateVersionItem } from "../../template-designer/types";

interface TemplateSummaryRecord extends TemplateDetailRecord {
  id?: string | number;
  templateCode?: string;
  sceneCode?: string;
  status?: string;
  latestVersionNo?: number;
}

function formatVersion(version?: TemplateVersionItem | null): string {
  if (!version) {
    return "—";
  }
  const label = version.versionNo != null ? `v${version.versionNo}` : String(version.id);
  return `${label} · ${version.status ?? "未知"}`;
}

function resolveDesignerVersion(
  versions: TemplateVersionItem[],
  currentTemplateVersionId?: string | number | null,
): TemplateVersionItem | null {
  if (currentTemplateVersionId != null) {
    const pinned = versions.find((item) => String(item.id) === String(currentTemplateVersionId));
    if (pinned) {
      return pinned;
    }
  }
  return versions.find((item) => isVersionDraft(item.status)) ?? versions[0] ?? null;
}

export function TaskTemplateManageWorkflowRenderer({
  record,
  close,
  refresh,
}: WorkflowRendererProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const taskId = record?.id == null ? "" : String(record.id);
  const taskCode = typeof record?.taskCode === "string" ? record.taskCode : `TASK-${taskId}`;
  const taskTitle = typeof record?.title === "string" ? record.title : "标注任务";
  const sceneCode = typeof record?.sceneCode === "string" ? record.sceneCode : "GENERAL";

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [template, setTemplate] = useState<TemplateSummaryRecord | null>(null);
  const [versions, setVersions] = useState<TemplateVersionItem[]>([]);

  const designerReturnTo = `${location.pathname}${location.search}`;

  const loadTemplateContext = useCallback(async () => {
    if (!taskId) {
      setTemplateId(null);
      setTemplate(null);
      setVersions([]);
      return;
    }
    const foundTemplateId = await findTaskTemplateId(taskId);
    if (!foundTemplateId) {
      setTemplateId(null);
      setTemplate(null);
      setVersions([]);
      return;
    }
    const [templateDetail, versionList] = await Promise.all([
      fetchTemplateDetail(foundTemplateId) as Promise<TemplateSummaryRecord>,
      listTemplateVersions(foundTemplateId),
    ]);
    setTemplateId(foundTemplateId);
    setTemplate({ ...templateDetail, id: foundTemplateId });
    setVersions(versionList);
  }, [taskId]);

  useEffect(() => {
    if (!taskId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    void loadTemplateContext()
      .catch(() => {
        if (active) {
          appMessage.error("加载任务模板失败");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [loadTemplateContext, taskId]);

  const currentVersion = useMemo(
    () => resolveDesignerVersion(versions, template?.currentTemplateVersionId),
    [template?.currentTemplateVersionId, versions],
  );

  function openDesigner(versionId?: string) {
    if (!templateId) {
      return;
    }
    const targetVersionId = versionId ?? currentVersion?.id;
    if (!targetVersionId) {
      appMessage.info("暂无可用模板版本");
      return;
    }
    close();
    navigate(
      appendDesignerReturnTo(
        `/system/template-designer?templateId=${encodeURIComponent(templateId)}&versionId=${encodeURIComponent(String(targetVersionId))}`,
        designerReturnTo,
      ),
    );
  }

  async function handleCreateTemplate() {
    if (!taskId) {
      return;
    }
    setCreating(true);
    try {
      await request("/api/v1/owner/templates", {
        method: "POST",
        body: JSON.stringify({
          taskId,
          templateCode: `${taskCode}-tpl`,
          templateName: `${taskTitle} · 标注模板`,
          sceneCode,
          descriptionText: null,
        }),
      });
      await loadTemplateContext();
      await refresh();
      appMessage.success("已创建模板并生成 v1 草稿");
    } catch (error) {
      appMessage.errorFrom(error, "创建模板失败");
    } finally {
      setCreating(false);
    }
  }

  if (!taskId) {
    return (
      <div className="px-1 py-6 text-center text-sm text-slate-500">
        缺少任务 ID
        <div className="mt-4">
          <Button type="button" variant="outline" onClick={close}>
            关闭
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 py-8 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        正在加载任务模板…
      </div>
    );
  }

  if (!templateId || !template) {
    return (
      <div className="space-y-4 px-1 py-2">
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
          <p className="font-medium text-slate-900 dark:text-slate-100">当前任务还没有标注模板</p>
          <p className="mt-2">
            每个任务仅对应 1 个模板主表。你可以在此直接新建模板（自动生成 v1 草稿），或通过「导入标注数据」首次导入时自动生成。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={creating} onClick={() => void handleCreateTemplate()}>
            <Plus className="h-4 w-4" />
            {creating ? "创建中…" : "新建模板"}
          </Button>
          <Button type="button" variant="outline" onClick={close}>
            关闭
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-1 py-1">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{template.templateName ?? "未命名模板"}</Badge>
            <Badge variant="secondary">{template.templateCode ?? "无编码"}</Badge>
            {template.status ? <Badge variant="outline">{template.status}</Badge> : null}
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-slate-500">标注场景</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{template.sceneCode ?? "—"}</p>
            </div>
            <div>
              <p className="text-slate-500">当前版本</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{formatVersion(currentVersion)}</p>
            </div>
            <div>
              <p className="text-slate-500">最新版本号</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {template.latestVersionNo != null ? `v${template.latestVersionNo}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-slate-500">版本数量</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{versions.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {versions.length > 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="border-b border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-800 dark:text-slate-200">
            版本历史
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {versions.map((version) => (
              <li
                key={String(version.id)}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{formatVersion(version)}</p>
                  {String(version.id) === String(template.currentTemplateVersionId) ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-300">当前使用</p>
                  ) : null}
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => openDesigner(String(version.id))}>
                  打开
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => openDesigner()}>
          <LayoutTemplate className="h-4 w-4" />
          打开设计器
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            window.open(
              appendDesignerReturnTo(
                `/system/template-designer?templateId=${encodeURIComponent(templateId)}${currentVersion?.id != null ? `&versionId=${encodeURIComponent(String(currentVersion.id))}` : ""}`,
                designerReturnTo,
              ),
              "_blank",
              "noreferrer",
            )
          }
        >
          新窗口打开
          <ExternalLink className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" onClick={close}>
          关闭
        </Button>
      </div>
    </div>
  );
}
