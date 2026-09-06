import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { appMessage } from "../../../lib/message";
import type { WorkflowRendererProps } from "@/low-code/actions/workflow-registry";
import { request } from "../../../utils/apiClient";
import { fetchTemplateDetail, listTemplateVersions } from "../../template-designer/designer-api";
import { findTaskTemplateId } from "../utils/import-template-draft";

interface TemplateVersionItem {
  id: string | number;
  versionNo?: string | number;
  status?: string;
}

interface TemplateDetailRecord {
  templateName?: string;
  templateCode?: string;
  currentTemplateVersionId?: string | number | null;
}

function formatVersion(version?: TemplateVersionItem | null): string {
  if (!version) {
    return "未找到";
  }
  const name = version.versionNo != null ? `v${version.versionNo}` : String(version.id);
  return `${name} · ${version.status ?? "未知状态"}`;
}

export function TaskPublishPreparationWorkflowRenderer({
  resource,
  record,
  close,
  refresh,
}: WorkflowRendererProps) {
  const taskId = record?.id == null ? "" : String(record.id);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [template, setTemplate] = useState<TemplateDetailRecord | null>(null);
  const [versions, setVersions] = useState<TemplateVersionItem[]>([]);

  useEffect(() => {
    if (!taskId) {
      setError("缺少任务 ID");
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const foundTemplateId = await findTaskTemplateId(taskId);
        if (!foundTemplateId) {
          if (active) {
            setError("当前任务还没有模板，请进入「模板管理」点击「新建模板」，或先导入数据生成模板。");
          }
          return;
        }

        const [templateDetail, versionList] = await Promise.all([
          fetchTemplateDetail(foundTemplateId),
          listTemplateVersions(foundTemplateId),
        ]);

        if (!active) {
          return;
        }

        setTemplateId(foundTemplateId);
        setTemplate(templateDetail);
        setVersions(versionList);
      } catch {
        if (active) {
          setError("加载发布准备信息失败，请稍后重试。");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [taskId]);

  const currentVersion = useMemo(() => {
    if (!template?.currentTemplateVersionId) {
      return versions.find((version) => String(version.status) === "PUBLISHED") ?? versions[0] ?? null;
    }
    return versions.find((version) => String(version.id) === String(template.currentTemplateVersionId)) ?? null;
  }, [template?.currentTemplateVersionId, versions]);

  const latestVersion = versions[0] ?? null;
  const hasDraftVersion = versions.some((version) => String(version.status) === "DRAFT");
  const designerUrl = templateId
    ? `/system/template-designer?templateId=${encodeURIComponent(templateId)}${currentVersion?.id != null ? `&versionId=${encodeURIComponent(String(currentVersion.id))}` : ""}`
    : null;

  async function handlePublish() {
    if (!taskId || !resource.api.actions?.publish) {
      return;
    }
    setPublishing(true);
    try {
      await request<void>(resource.api.actions.publish.replace("{id}", encodeURIComponent(taskId)), {
        method: "POST",
      });
      await refresh();
      close();
    } catch (error) {
      appMessage.errorFrom(error, "发布任务失败");
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 py-8 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        正在整理发布准备信息...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 px-1 py-6">
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-sm leading-6">{error}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={close}>
            关闭
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-1 py-1">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-cyan-50 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-600" />
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">发布前准备</span>
        </div>
        <div className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
          <p>任务发布会同步处理当前模板版本。</p>
          <p>如果当前版本还是草稿，这里会先完成模板版本发布，再执行任务发布。</p>
          <p>发布前可先到模板的审核配置中生成 AI 提示词初稿；上线后再基于真实复核数据持续优化。</p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{template?.templateName ?? "未命名模板"}</Badge>
            <Badge variant="secondary">{template?.templateCode ?? "无编码"}</Badge>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-slate-500">当前版本</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{formatVersion(currentVersion)}</p>
            </div>
            <div>
              <p className="text-slate-500">最新版本</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{formatVersion(latestVersion)}</p>
            </div>
            <div>
              <p className="text-slate-500">发布策略</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">发布任务时使用当前模板版本</p>
            </div>
            <div>
              <p className="text-slate-500">版本状态</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {hasDraftVersion ? "存在草稿版本，建议先检查" : "没有未发布草稿"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {designerUrl ? (
          <Button type="button" variant="outline" onClick={() => window.open(designerUrl, "_blank", "noreferrer")}>
            打开模板设计器
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={close}>
          返回
        </Button>
        <Button type="button" onClick={() => void handlePublish()} disabled={publishing}>
          {publishing ? "正在发布..." : "确认发布任务"}
        </Button>
      </div>
    </div>
  );
}
