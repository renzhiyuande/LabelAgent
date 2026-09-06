import { ArrowLeft, ArrowRight, Focus, Save, Send } from "lucide-react";
import type { NavigateFunction } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LabelerSlotFrame } from "../LabelerSlotFrame";
import { SurfaceByMode } from "../chrome/SurfaceByMode";
import type { LabelerSlotRenderEnv, LabelerWorkbenchBusinessContext } from "../types";

export function ToolbarSlotContent({
  context,
  env,
  navigate,
}: {
  context: LabelerWorkbenchBusinessContext;
  env: LabelerSlotRenderEnv;
  navigate: NavigateFunction;
}) {
  return (
    <LabelerSlotFrame slotId="toolbar" title="全局工具" description="编辑态显示布局控制，浏览态保留核心操作。" env={env} controls={context}>
      <SurfaceByMode
        mode={context.slotModes.toolbar}
        jsonData={{
          mode: context.slotModes.toolbar,
          saving: context.saving,
          submitting: context.submitting,
          focusMode: context.focusMode,
          canGoPrev: context.canGoPrev,
          canGoNext: context.canGoNext,
        }}
      >
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <Button type="button" variant="outline" size="sm" className="justify-start rounded-xl" onClick={() => navigate("/labeler/my-tasks")}>
            返回我的任务
          </Button>
          <Button type="button" variant="outline" size="sm" className="justify-start rounded-xl" disabled={!context.canGoPrev} onClick={context.onPrevAssignment}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            上一题
          </Button>
          <Button type="button" variant="outline" size="sm" className="justify-start rounded-xl" disabled={!context.canGoNext} onClick={context.onNextAssignment}>
            下一题
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
          <Button type="button" variant={context.focusMode ? "default" : "outline"} size="sm" className="justify-start rounded-xl" onClick={context.onToggleFocusMode}>
            <Focus className="mr-1.5 h-4 w-4" />
            {context.focusMode ? "退出禅模式" : "禅模式"}
          </Button>
          <Button type="button" variant="outline" size="sm" className="justify-start rounded-xl" disabled={context.saving || context.contentPendingOnly} onClick={context.onSaveDraft}>
            <Save className="mr-1.5 h-4 w-4" />
            保存草稿
          </Button>
          {context.canSubmit ? (
            <Button type="button" size="sm" className="justify-start rounded-xl" disabled={context.submitting || context.contentPendingOnly} onClick={() => void context.onSubmit()}>
              <Send className="mr-1.5 h-4 w-4" />
              {context.submitting ? "提交中…" : "正式提交"}
            </Button>
          ) : null}
        </div>
      </SurfaceByMode>
    </LabelerSlotFrame>
  );
}
