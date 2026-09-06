import type { AuditTimelineEntry } from "../AuditTimeline";
import { AuditTimeline } from "../AuditTimeline";
import type { AiInsight } from "../AiInsightPanel";
import { AI_INSIGHT_STATUS_META } from "../AiInsightPanel";
import { createDisplayFormSchema } from "../schema-data/create-display-schema";
import type { WorkbenchPanelSectionDefinition } from "../panel-sections/types";
import { AiDimensionScoresBody, AiRawResponseBody, AiVerdictBody } from "./AiInsightSectionBodies";

export interface AiInsightPanelSectionSource {
  insight: AiInsight;
  agentVersion?: string;
  promptTemplate?: string;
  rawResponseText?: string;
  timeline?: AuditTimelineEntry[];
  showMockBadge?: boolean;
  hasRealAiReview?: boolean;
}

function buildDimensionSchema(insight: AiInsight) {
  return createDisplayFormSchema("dimensions", "维度评分", [
    { key: "overall_score", label: "综合分", component: "number" },
    ...insight.dimensions.map((dimension) => ({
      key: dimension.key,
      label: dimension.label,
      component: "text" as const,
    })),
  ]);
}

function buildDimensionData(insight: AiInsight): Record<string, unknown> {
  const data: Record<string, unknown> = {
    overall_score: insight.overallScore,
  };
  for (const dimension of insight.dimensions) {
    data[dimension.key] = `${dimension.score} / ${dimension.maxScore}`;
  }
  return data;
}

function buildVerdictSchema(showOverallScore: boolean) {
  return createDisplayFormSchema("verdict", "AI 结论", [
    { key: "status_label", label: "建议", component: "text" },
    ...(showOverallScore ? [{ key: "overall_score", label: "综合分", component: "number" as const }] : []),
    { key: "summary", label: "分析说明", component: "textarea" },
  ]);
}

function buildVerdictData(insight: AiInsight, showOverallScore: boolean): Record<string, unknown> {
  const meta = AI_INSIGHT_STATUS_META[insight.status];
  return {
    status_label: meta.label,
    ...(showOverallScore ? { overall_score: insight.overallScore } : {}),
    summary: insight.summary,
  };
}

function buildPromptSchema() {
  return createDisplayFormSchema("prompt", "审核 Prompt", [
    { key: "prompt_template", label: "Prompt 模板", component: "textarea" },
  ]);
}

function buildRawResponseSchema() {
  return createDisplayFormSchema("raw_response", "原始响应", [
    { key: "raw_response_text", label: "LLM 原始 JSON", component: "textarea" },
  ]);
}

function buildTimelineSchema() {
  return createDisplayFormSchema("timeline", "处理日志", [
    { key: "entries", label: "事件列表", component: "textarea" },
  ]);
}

function buildTimelineData(timeline: AuditTimelineEntry[]): Record<string, unknown> {
  return {
    entries: timeline.map((entry) => ({
      stage: entry.stage,
      label: entry.label,
      detail: entry.detail,
      timestamp: entry.timestamp,
    })),
  };
}

/** 将 AI 预审结果拆成可排序、可切换视图的 workbench 区块定义 */
export function buildAiInsightPanelSections(source: AiInsightPanelSectionSource): WorkbenchPanelSectionDefinition[] {
  const {
    insight,
    agentVersion,
    promptTemplate,
    rawResponseText,
    timeline = [],
    hasRealAiReview = true,
  } = source;
  const sections: WorkbenchPanelSectionDefinition[] = [
    {
      id: "dimensions",
      title: "维度评分",
      data: hasRealAiReview ? buildDimensionData(insight) : {},
      schema: buildDimensionSchema(insight),
      emptyMessage: "当前提交尚未产出可展示的 AI 维度评分。",
      renderBody: ({ viewMode }) =>
        viewMode === "cards" ? (
          <AiDimensionScoresBody
            insight={insight}
            agentVersion={agentVersion}
            emptyMessage="当前提交尚未产出可展示的 AI 维度评分。"
          />
        ) : null,
    },
    {
      id: "verdict",
      title: "AI 结论",
      data: buildVerdictData(insight, hasRealAiReview),
      schema: buildVerdictSchema(hasRealAiReview),
      renderBody: ({ viewMode }) => (viewMode === "cards" ? <AiVerdictBody insight={insight} /> : null),
    },
  ];

  if (promptTemplate) {
    sections.push({
      id: "prompt",
      title: "审核 Prompt",
      data: { prompt_template: promptTemplate },
      schema: buildPromptSchema(),
    });
  }

  if (rawResponseText) {
    sections.push({
      id: "raw_response",
      title: "原始响应",
      data: { raw_response_text: rawResponseText },
      schema: buildRawResponseSchema(),
      renderBody: ({ viewMode }) =>
        viewMode === "cards" ? <AiRawResponseBody rawResponseText={rawResponseText} /> : null,
    });
  }

  if (timeline.length > 0) {
    sections.push({
      id: "timeline",
      title: "处理日志",
      data: buildTimelineData(timeline),
      schema: buildTimelineSchema(),
      renderBody: ({ viewMode }) =>
        viewMode === "json" ? null : (
          <AuditTimeline
            entries={timeline}
            title=""
            className="border-0 bg-transparent p-0 shadow-none dark:bg-transparent"
          />
        ),
    });
  }

  return sections;
}
