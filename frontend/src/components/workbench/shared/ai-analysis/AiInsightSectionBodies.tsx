import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AiInsight } from "../AiInsightPanel";
import { AI_INSIGHT_STATUS_META } from "../AiInsightPanel";
import { DimensionScoreGrid } from "../DimensionScoreGrid";

interface AiDimensionScoresBodyProps {
  insight: AiInsight;
  agentVersion?: string;
  className?: string;
  emptyMessage?: string;
}

function ScoreCalibrationNotice({ calibrations }: { calibrations: NonNullable<AiInsight["scoreCalibrations"]> }) {
  return (
    <div className="mb-3 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs leading-5 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
      <p className="font-semibold">部分维度分数经锚点校准</p>
      <ul className="mt-1 space-y-1">
        {calibrations.map((item) => (
          <li key={item.dimensionKey}>
            {item.dimensionName ?? item.dimensionKey}：LLM 原始 {item.rawScore} → 展示 {item.calibratedScore}
            {item.anchor != null && item.tolerance != null
              ? `（锚点 ${item.anchor}±${item.tolerance}）`
              : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AiDimensionScoresBody({
  insight,
  agentVersion,
  className,
  emptyMessage = "暂无维度评分",
}: AiDimensionScoresBodyProps) {
  return (
    <div className={cn(className)}>
      {agentVersion ? (
        <div className="mb-2 flex justify-end">
          <Badge variant="secondary">{agentVersion}</Badge>
        </div>
      ) : null}
      {insight.scoreCalibrations && insight.scoreCalibrations.length > 0 ? (
        <ScoreCalibrationNotice calibrations={insight.scoreCalibrations} />
      ) : null}
      {insight.dimensions.length > 0 ? (
        <DimensionScoreGrid dimensions={insight.dimensions} columns={1} />
      ) : (
        <p className="rounded-lg border border-dashed border-border/80 bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      )}
    </div>
  );
}

interface AiVerdictBodyProps {
  insight: AiInsight;
  className?: string;
}

function formatRawResponseText(rawResponseText: string): string {
  const trimmed = rawResponseText.trim();
  if (!trimmed) {
    return "";
  }
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return rawResponseText;
  }
}

interface AiRawResponseBodyProps {
  rawResponseText: string;
  className?: string;
}

export function AiRawResponseBody({ rawResponseText, className }: AiRawResponseBodyProps) {
  const formatted = formatRawResponseText(rawResponseText);
  if (!formatted) {
    return (
      <p className="rounded-lg border border-dashed border-border/80 bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
        暂无原始响应
      </p>
    );
  }

  return (
    <details className={cn("lh-detail-json-block rounded-lg border border-border/80 bg-muted/30 p-3", className)}>
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        展开原始 JSON 响应
      </summary>
      <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-foreground">
        {formatted}
      </pre>
    </details>
  );
}

export function AiVerdictBody({ insight, className }: AiVerdictBodyProps) {
  const meta = AI_INSIGHT_STATUS_META[insight.status];
  return (
    <div
      className={cn(
        "rounded-lg border border-rose-200/70 bg-rose-50/60 p-2.5 dark:border-rose-900/40 dark:bg-rose-950/20",
        className,
      )}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <p className="text-xs font-semibold text-rose-800 dark:text-rose-200">AI 结论</p>
        <Badge variant={meta.badge}>{meta.label}</Badge>
      </div>
      <p className="text-sm leading-6 text-rose-950 dark:text-rose-50">{insight.summary}</p>
    </div>
  );
}
