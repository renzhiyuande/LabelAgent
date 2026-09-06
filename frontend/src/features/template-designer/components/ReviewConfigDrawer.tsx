"use client";

import { useEffect, useState } from "react";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isVersionDraft } from "@/low-code/utils/form-schema";
import { TemplateReviewConfigPanel } from "@/features/template-review-config/components/TemplateReviewConfigPanel";
import type { TemplateVersionItem } from "../types";
import { SideSlidePanel } from "./SideSlidePanel";

interface ReviewConfigDrawerProps {
  open: boolean;
  versionId: string | null;
  versions: TemplateVersionItem[];
  onClose: () => void;
}

export function ReviewConfigDrawer({ open, versionId, versions, onClose }: ReviewConfigDrawerProps) {
  const [loadSession, setLoadSession] = useState(0);

  useEffect(() => {
    if (open && versionId) {
      setLoadSession((current) => current + 1);
    }
  }, [open, versionId]);

  const activeVersion = versions.find((version) => String(version.id) === String(versionId));
  const editable = isVersionDraft(activeVersion?.status);

  return (
    <SideSlidePanel open={open} onClose={onClose} placement="left" className="w-full max-w-5xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <Layers className="h-4 w-4" />
            审核配置
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">标准模式配置维度；专业模式可编辑完整 Prompt 模板</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          关闭
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!versionId ? (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
            请先保存模板草稿，再配置审核规则
          </div>
        ) : (
          <TemplateReviewConfigPanel
            key={`${versionId}-${loadSession}`}
            versionId={versionId}
            editable={editable}
            onSaved={onClose}
            onCancel={onClose}
          />
        )}
      </div>
    </SideSlidePanel>
  );
}
