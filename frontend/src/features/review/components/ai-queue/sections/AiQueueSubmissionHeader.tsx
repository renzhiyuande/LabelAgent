import { Badge } from "@/components/ui/badge";
import { AI_INSIGHT_STATUS_META } from "@/components/workbench";
import type { AiQueueDetail } from "../../../types";
import { AI_QUEUE_STATUS_META } from "../../../types";

interface AiQueueSubmissionHeaderProps {
  detail: AiQueueDetail;
}

export function AiQueueSubmissionHeader({ detail }: AiQueueSubmissionHeaderProps) {
  const aiMeta = AI_INSIGHT_STATUS_META[detail.aiInsight.status];
  const statusMeta = AI_QUEUE_STATUS_META[detail.status];

  return (
    <div className="shrink-0 border-b border-border/80 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">提交内容</p>
          <h2 className="mt-0.5 truncate text-base font-semibold text-foreground">{detail.title}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant="secondary">{detail.submissionCode}</Badge>
            <span>{detail.submitter}</span>
            <span>{new Date(detail.submittedAt).toLocaleString()}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={statusMeta.badge}>{statusMeta.label}</Badge>
          <Badge variant={aiMeta.badge}>
            {aiMeta.label} ({detail.aiInsight.overallScore})
          </Badge>
        </div>
      </div>
    </div>
  );
}
