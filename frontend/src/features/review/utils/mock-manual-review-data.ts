import { buildMockAiInsight } from "@/components/workbench/shared/AiInsightPanel";
import type { ManualReviewDetail, ManualReviewRow } from "../types";
import { MOCK_TASKS } from "./audit-pool-queue-tree";
import {
  MOCK_MANUAL_REVIEW_ANNOTATE_SCHEMA,
  MOCK_MANUAL_REVIEW_PAYLOAD_SCHEMA,
} from "./mock-display-schemas";

const TITLES = [
  "户外便携折叠桌椅套装",
  "智能温控保温杯 500ml",
  "儿童益智拼图 100 片",
  "无线蓝牙耳机降噪版",
];

const LABELERS = [
  { id: "101", name: "标注员 A" },
  { id: "102", name: "标注员 B" },
  { id: "103", name: "标注员 C" },
  { id: "104", name: "标注员 D" },
] as const;

export function buildMockManualReviewRows(count = 24): ManualReviewRow[] {
  return Array.from({ length: count }, (_, index) => {
    const task = MOCK_TASKS[index % MOCK_TASKS.length];
    const labeler = LABELERS[index % LABELERS.length];
    const itemSeqNo = (index % 8) + 1;
    const payload = { cleaned_title: TITLES[index % TITLES.length], category: "户外/露营" };
    const aiInsight = buildMockAiInsight(`manual-review-${index}`, payload);
    return {
      id: String(7000 + index),
      submissionCode: `SUB-${task.id}-${String(900 + index).padStart(5, "0")}`,
      title: TITLES[index % TITLES.length],
      labeler: labeler.name,
      labelerId: labeler.id,
      taskId: task.id,
      taskName: task.name,
      itemId: String(8000 + index),
      itemSeqNo,
      submittedAt: new Date(Date.now() - index * 180_000).toISOString(),
      status: index % 4 === 0 ? "pending" : index % 4 === 1 ? "approved" : index % 4 === 2 ? "returned" : "rejected",
      aiScore: aiInsight.overallScore,
    };
  });
}

export function buildMockManualReviewDetail(row: ManualReviewRow): ManualReviewDetail {
  const index = Number(row.id) - 7000;
  const payload = {
    cleaned_title: row.title,
    category: "户外/露营",
    keywords: ["便携", "折叠"],
  };
  return {
    ...row,
    payload,
    payloadSchema: MOCK_MANUAL_REVIEW_PAYLOAD_SCHEMA,
    annotateData: {
      quality_score: 4,
      tags: ["已核对标题"],
      note: "标注员已完成字段补全",
    },
    annotateSchema: MOCK_MANUAL_REVIEW_ANNOTATE_SCHEMA,
    aiInsight: buildMockAiInsight(`manual-review-${index}`, payload),
    hasRealAiReview: false,
    lastReviewComment: row.status === "returned" ? "关键词字段过于稀疏，请补充至少 3 个有效关键词。" : undefined,
    submitDataDiff:
      row.status === "returned"
        ? [
            {
              field: "note",
              changeType: "CHANGED",
              oldValue: "初版备注",
              newValue: "标注员已完成字段补全",
            },
          ]
        : [],
    timeline: [
      {
        id: `mock-submit-${row.id}`,
        stage: "SUBMIT",
        label: "提交标注",
        detail: row.labeler,
        timestamp: row.submittedAt,
        tone: "default",
      },
      ...(row.status === "returned"
        ? [
            {
              id: `mock-return-${row.id}`,
              stage: "RETURN",
              label: "审核打回",
              detail: "关键词字段过于稀疏",
              timestamp: row.submittedAt,
              tone: "warning" as const,
            },
          ]
        : []),
    ],
  };
}
