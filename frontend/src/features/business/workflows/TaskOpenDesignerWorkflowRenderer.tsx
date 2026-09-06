import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import type { WorkflowRendererProps } from "@/low-code/actions/workflow-registry";
import { isVersionDraft } from "@/low-code/utils/form-schema";
import { appendDesignerReturnTo, isDesignerLocation } from "../../template-designer/hooks/use-designer-back";
import { listTemplateVersions } from "../../template-designer/designer-api";
import { findTaskTemplateId } from "../utils/import-template-draft";

export function TaskOpenDesignerWorkflowRenderer({ record, close }: WorkflowRendererProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const returnToRef = useRef<string | null>(null);
  const navigatedRef = useRef(false);

  if (returnToRef.current == null && !isDesignerLocation(location.pathname)) {
    returnToRef.current = `${location.pathname}${location.search}`;
  }

  useEffect(() => {
    if (navigatedRef.current) {
      return;
    }

    const taskId = record?.id == null ? "" : String(record.id);
    const returnTo = returnToRef.current ?? "/owner/tasks";
    if (!taskId) {
      setError("缺少任务 ID");
      return;
    }

    let active = true;
    void (async () => {
      try {
        const templateId = await findTaskTemplateId(taskId);
        if (!templateId) {
          if (active) {
            setError(
              "当前任务还没有标注模板。请任选其一：① 任务行 →「模板管理」→「新建模板」；②「导入标注数据」首次导入并生成模板；③ 新建任务时选择「标注模板版本」克隆已有模板。",
            );
          }
          return;
        }

        const versions = await listTemplateVersions(templateId);
        const pinnedVersionId =
          record?.currentTemplateVersionId != null ? String(record.currentTemplateVersionId) : null;
        const pinned = pinnedVersionId
          ? versions.find((version) => version.id === pinnedVersionId)
          : undefined;
        const draft = versions.find((version) => isVersionDraft(version.status));
        const target = pinned ?? draft ?? versions[0];

        if (!target?.id) {
          if (active) {
            setError("模板下暂无版本，请先导入数据或新建版本。");
          }
          return;
        }

        if (!active || navigatedRef.current) {
          return;
        }

        navigatedRef.current = true;
        close();
        navigate(
          appendDesignerReturnTo(
            `/system/template-designer?templateId=${encodeURIComponent(templateId)}&versionId=${encodeURIComponent(target.id)}`,
            returnTo,
          ),
        );
      } catch {
        if (active) {
          setError("打开模板设计器失败，请稍后重试。");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [close, navigate, record]);

  if (error) {
    return (
      <div className="space-y-4 px-1 py-6 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
        <Button type="button" variant="outline" onClick={close}>
          关闭
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 py-8 text-sm text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" />
      正在打开模板设计器…
    </div>
  );
}
