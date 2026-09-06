import { cn } from "@/lib/utils";
import { LabelerSlotFrame } from "../LabelerSlotFrame";
import { SurfaceByMode } from "../chrome/SurfaceByMode";
import type { LabelerSlotRenderEnv, LabelerWorkbenchBusinessContext } from "../types";
import { resolveSubmissionStatusLabel, shouldShowReviewPanel } from "../utils/submission-review";
import { SummaryMetricCard } from "./SummaryMetricCard";

export function SummarySlotContent({
  context,
  env,
}: {
  context: LabelerWorkbenchBusinessContext;
  env: LabelerSlotRenderEnv;
}) {
  const reviewStatusLabel = shouldShowReviewPanel(context.work)
    ? resolveSubmissionStatusLabel(context.work.submission.currentStatus)
    : "待提交";

  return (
    <LabelerSlotFrame slotId="summary" title="进度总览" description="支持紧凑 / 卡片 / JSON 三种视图。" env={env} controls={context}>
      <SurfaceByMode
        mode={context.slotModes.summary}
        jsonData={{
          queueOrdinalLabel: context.queueOrdinalLabel,
          queuePositionLabel: context.queuePositionLabel,
          queueCount: context.queueRows.length,
          saveHint: context.saveHint,
          reviewStatus: reviewStatusLabel,
        }}
      >
        <div className={cn("grid gap-2", context.slotModes.summary === "inline" ? "grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-4")}>
          <SummaryMetricCard label="当前题号" value={context.queueOrdinalLabel ?? "—"} />
          <SummaryMetricCard label="队列位置" value={context.queuePositionLabel ?? "—"} />
          <SummaryMetricCard label="保存状态" value={context.saveHint || "空闲"} />
          <SummaryMetricCard label="审核状态" value={reviewStatusLabel} />
        </div>
      </SurfaceByMode>
    </LabelerSlotFrame>
  );
}
