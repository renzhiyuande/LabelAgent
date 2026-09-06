import { buildMockAiInsight } from "@/components/workbench/shared/AiInsightPanel";
import type { AuditTimelineEntry } from "@/components/workbench/shared/AuditTimeline";
import type { AiQueueDetail, AiQueueRow, AiQueueStatus } from "../types";
import {
  MOCK_AI_QUEUE_ANNOTATE_SCHEMA,
  MOCK_AI_QUEUE_PAYLOAD_SCHEMA,
} from "./mock-display-schemas";

const SAMPLE_TITLES = [
  "户外便携折叠桌椅套装",
  "智能温控保温杯 500ml",
  "儿童益智拼图 100 片",
  "无线蓝牙耳机降噪版",
  "厨房多功能切菜器",
];

const SAMPLE_SUBMITTERS = ["标注员 A", "标注员 B", "标注员 C", "标注员 D"];

function buildPayload(index: number): Record<string, unknown> {
  return {
    cleaned_title: SAMPLE_TITLES[index % SAMPLE_TITLES.length],
    category: index % 2 === 0 ? "户外/露营" : "家居/厨房",
    keywords: index % 3 === 0 ? ["便携", "折叠"] : ["智能", "保温", "不锈钢"],
    raw_text: "原始文本片段，用于 AI 预审维度评分与格式校验。",
    seq_no: index + 1,
  };
}

function buildAnnotateData(index: number): Record<string, unknown> {
  return {
    quality_score: 3 + (index % 3),
    tags: ["已核对标题", "已补全类目"],
    reviewer_note: "",
  };
}

function buildTimeline(index: number): AuditTimelineEntry[] {
  const base = Date.now() - index * 60_000;
  return [
    {
      id: `${index}-queue`,
      stage: "queue",
      label: "进入 BullMQ 队列",
      timestamp: new Date(base).toLocaleTimeString(),
      tone: "default",
    },
    {
      id: `${index}-llm`,
      stage: "llm",
      label: "调用模型 doubao-pro-32k",
      detail: `tokens: ${1200 + index * 17} · 耗时 ${(1.2 + (index % 5) * 0.1).toFixed(1)}s`,
      timestamp: new Date(base + 800).toLocaleTimeString(),
      tone: "warning",
    },
    {
      id: `${index}-verdict`,
      stage: "verdict",
      label: "结构化输出与综合分",
      detail: "写入 ai_review_records",
      timestamp: new Date(base + 1400).toLocaleTimeString(),
      tone: "success",
    },
  ];
}

const STATUSES: AiQueueStatus[] = ["pending", "passed", "returned", "manual", "failed"];

export function buildMockAiQueueRows(count = 24): AiQueueRow[] {
  return Array.from({ length: count }, (_, index) => {
    const payload = buildPayload(index);
    const status = STATUSES[index % STATUSES.length];
    const aiInsight = buildMockAiInsight(`ai-queue-${index}`, payload);
    return {
      id: String(6000 + index),
      submissionCode: `SUB-2041-${String(608 + index).padStart(5, "0")}`,
      title: String(payload.cleaned_title),
      submitter: SAMPLE_SUBMITTERS[index % SAMPLE_SUBMITTERS.length],
      submittedAt: new Date(Date.now() - index * 120_000).toISOString(),
      status,
      aiInsight,
      hasRealAiReview: false,
    };
  });
}

export function buildMockAiQueueDetail(row: AiQueueRow): AiQueueDetail {
  const index = Number(row.id) - 6000;
  const payload = buildPayload(index);
  return {
    ...row,
    payload,
    payloadSchema: MOCK_AI_QUEUE_PAYLOAD_SCHEMA,
    annotateData: buildAnnotateData(index),
    annotateSchema: MOCK_AI_QUEUE_ANNOTATE_SCHEMA,
    promptTemplate: `你是 LabelHub 审核 Agent。请根据以下维度对提交内容进行评分（0-100）：
1. 相关性 relevance
2. 准确性 accuracy
3. 格式规范 format
4. 安全合规 safety

输出 JSON：{ "overall": number, "dimensions": [...], "verdict": "pass|reject|manual" }`,
    timeline: buildTimeline(index),
    agentVersion: "Agent v2.3",
    ruleName: "电商标题清洗 · 默认预审规则",
    hasRealAiReview: false,
  };
}

export function countAiQueueByStatus(rows: AiQueueRow[]): Record<AiQueueStatus, number> {
  return rows.reduce(
    (acc, row) => {
      acc[row.status] += 1;
      return acc;
    },
    { pending: 0, passed: 0, returned: 0, manual: 0, failed: 0 } as Record<AiQueueStatus, number>,
  );
}
