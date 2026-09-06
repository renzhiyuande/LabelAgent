import { Bot, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DimensionScoreGrid } from "./DimensionScoreGrid";

export interface AiDimensionScore {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  comment?: string;
}

export interface AiScoreCalibration {
  dimensionKey: string;
  dimensionName?: string;
  rawScore: number;
  calibratedScore: number;
  anchor?: number;
  tolerance?: number;
}

export interface AiInsight {
  status: "suggest_pass" | "suggest_reject" | "manual_review";
  overallScore: number;
  dimensions: AiDimensionScore[];
  summary: string;
  modelName: string;
  analyzedAt: string;
  scoreCalibrations?: AiScoreCalibration[];
}

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** v1 mock：按 seed 稳定生成，后续可替换为真实 AI 预检接口 */
export function buildMockAiInsight(seedKey: string, payload: Record<string, unknown>): AiInsight {
  const seed = hashSeed(`${seedKey}:${JSON.stringify(Object.keys(payload).sort())}`);
  const overall = 52 + (seed % 41);
  const dimensions: AiDimensionScore[] = [
    { key: "relevance", label: "相关性", score: 60 + (seed % 35), maxScore: 100 },
    { key: "accuracy", label: "准确性", score: 55 + ((seed >> 3) % 40), maxScore: 100 },
    { key: "format", label: "格式规范", score: 70 + ((seed >> 5) % 28), maxScore: 100 },
    { key: "safety", label: "安全合规", score: 80 + ((seed >> 7) % 18), maxScore: 100 },
  ];
  const avg = Math.round(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length);
  const status = avg >= 78 ? "suggest_pass" : avg >= 62 ? "manual_review" : "suggest_reject";

  const summaries: Record<AiInsight["status"], string> = {
    suggest_pass: "AI 认为内容与模板字段匹配良好，可按常规流程处理；重点关注格式规范即可。",
    suggest_reject: "AI 检测到部分字段信息稀疏或与场景不匹配，请先核对原文与业务规则。",
    manual_review: "AI 给出中等置信度建议，建议进入人工复核队列。",
  };

  return {
    status,
    overallScore: overall,
    dimensions,
    summary: summaries[status],
    modelName: "labelhub-mock-v1",
    analyzedAt: new Date(Date.now() - (seed % 3600) * 1000).toISOString(),
  };
}

export function buildUnavailableAiInsight(options?: {
  analyzedAt?: string;
  summary?: string;
  modelName?: string;
}): AiInsight {
  return {
    status: "manual_review",
    overallScore: 0,
    dimensions: [],
    summary: options?.summary ?? "当前提交尚未产出可展示的 AI 预审评分。",
    modelName: options?.modelName ?? "AI 结果待产出",
    analyzedAt: options?.analyzedAt ?? new Date().toISOString(),
  };
}

export function isMockAiInsight(insight: AiInsight): boolean {
  return insight.modelName === "labelhub-mock-v1";
}

export const AI_INSIGHT_STATUS_META: Record<
  AiInsight["status"],
  { label: string; badge: "success" | "warning" | "destructive" }
> = {
  suggest_pass: { label: "AI 建议：通过", badge: "success" },
  suggest_reject: { label: "AI 建议：驳回", badge: "destructive" },
  manual_review: { label: "AI 建议：人工复核", badge: "warning" },
};

interface AiInsightPanelProps {
  insight: AiInsight;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  storageKey?: string;
  title?: string;
  showMockBadge?: boolean;
}

function readCollapsedPreference(storageKey: string, defaultCollapsed: boolean): boolean {
  if (typeof window === "undefined") {
    return defaultCollapsed;
  }
  const stored = localStorage.getItem(storageKey);
  if (stored === "true") {
    return true;
  }
  if (stored === "false") {
    return false;
  }
  return defaultCollapsed;
}

export function AiInsightPanel({
  insight,
  className,
  collapsible = false,
  defaultCollapsed = false,
  storageKey = "workbench.aiPanel.collapsed",
  title = "AI 预检分析",
  showMockBadge = true,
}: AiInsightPanelProps) {
  const meta = AI_INSIGHT_STATUS_META[insight.status];
  const [collapsed, setCollapsed] = useState(() =>
    collapsible ? readCollapsedPreference(storageKey, defaultCollapsed) : false,
  );

  useEffect(() => {
    if (collapsible) {
      localStorage.setItem(storageKey, String(collapsed));
    }
  }, [collapsed, collapsible, storageKey]);

  return (
    <section className={cn(collapsed ? "p-3" : "p-3.5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
            <Bot className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</p>
              {showMockBadge ? (
                <Badge variant="secondary" className="gap-1 text-[10px] font-normal">
                  <Sparkles className="h-3 w-3" />
                  Mock
                </Badge>
              ) : null}
            </div>
            {!collapsed ? (
              <p className="mt-0.5 text-xs text-slate-500">
                {insight.modelName} · {new Date(insight.analyzedAt).toLocaleString()}
              </p>
            ) : (
              <p className="mt-0.5 truncate text-xs text-slate-500">{meta.label}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!collapsed ? <Badge variant={meta.badge}>{meta.label}</Badge> : null}
          {collapsible ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-slate-500"
              onClick={() => setCollapsed((current) => !current)}
            >
              {collapsed ? (
                <>
                  展开
                  <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  收起
                  <ChevronUp className="ml-1 h-3.5 w-3.5" />
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>

      {!collapsed ? (
        <>
          <DimensionScoreGrid dimensions={insight.dimensions} className="mt-3" />
          <div className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
            {insight.summary}
          </div>
        </>
      ) : null}
    </section>
  );
}
