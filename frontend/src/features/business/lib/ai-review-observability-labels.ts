import type { AuditTimelineEntry } from "@/components/workbench/shared/AuditTimeline";
import { resolveSubmissionStatusLabel } from "@/features/labeler/workbench/utils/submission-review";
import {
  AI_REVIEW_STATUS_META,
  AI_REVIEW_VERDICT_META,
} from "@/features/business/owner-ai-review-shared";
import type {
  AiReviewLlmAttempt,
  AiReviewObservabilityRecordDetail,
  AiReviewObservabilityRecordSummary,
  AiReviewTimelineEntry,
} from "@/features/business/ai-review-observability-api";
import { formatEstimatedCost, formatLatency, formatTokenUsage, formatTraceability } from "@/features/business/ai-review-observability-api";

const ASYNC_TASK_STATUS_LABEL: Record<string, string> = {
  PENDING: "排队等待",
  RUNNING: "执行中",
  SUCCESS: "执行成功",
  FAILED: "执行失败",
  CANCELLED: "已取消",
};

const SUBMISSION_ACTION_LABEL: Record<string, string> = {
  SUBMIT: "提交作答",
  SAVE_DRAFT: "保存草稿",
  AUTO_SAVE_DRAFT: "自动保存草稿",
  WITHDRAW: "撤回提交",
  RETURN: "审核打回",
  RETURN_FOR_REVISION: "打回修改",
  APPROVE: "审核通过",
  REJECT: "审核驳回",
  AI_REVIEW_START: "进入 AI 审核",
  AI_REVIEW_COMPLETE: "AI 审核完成",
  AI_REVIEW_FAILED: "AI 审核失败",
  RETRY_AI_REVIEW: "重试 AI 审核",
  ESCALATE_HUMAN: "转人工审核",
};

const TIMELINE_PHASE_LABEL: Record<string, string> = {
  AI_REVIEW: "AI 预审",
  ASYNC_TASK: "AI 审核任务",
  ASYNC_TASK_FINISHED: "AI 审核任务结束",
  SUBMISSION: "提交流转",
  LLM_ATTEMPT: "模型调用",
};

export function resolveAiReviewStatusLabel(status?: string | null): string {
  if (!status) {
    return "未知状态";
  }
  return AI_REVIEW_STATUS_META[status]?.label ?? status;
}

export function resolveAsyncTaskStatusLabel(status?: string | null): string {
  if (!status) {
    return "未知状态";
  }
  return ASYNC_TASK_STATUS_LABEL[status] ?? status;
}

export function resolveSubmissionActionLabel(actionCode?: string | null): string {
  if (!actionCode) {
    return "状态变更";
  }
  return SUBMISSION_ACTION_LABEL[actionCode] ?? actionCode;
}

function resolveTimelineTone(
  phase: string,
  status?: string | null,
  success?: boolean,
): AuditTimelineEntry["tone"] {
  if (phase === "LLM_ATTEMPT") {
    if (success === false) {
      return "destructive";
    }
    if (success === true) {
      return "success";
    }
  }
  const normalized = (status ?? "").toUpperCase();
  if (["SUCCESS", "PASS", "AI_PASSED", "APPROVED"].includes(normalized)) {
    return "success";
  }
  if (["FAILED", "REJECT", "AI_REJECTED", "REJECTED", "ERROR"].includes(normalized)) {
    return "destructive";
  }
  if (["RUNNING", "PENDING", "AI_REVIEWING", "HUMAN_REVIEWING", "REQUIRE_HUMAN"].includes(normalized)) {
    return "warning";
  }
  return "default";
}

function formatTimelineTimestamp(value?: string | null): string {
  if (!value) {
    return "时间未知";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function buildTimelineEntryLabel(entry: AiReviewTimelineEntry): string {
  switch (entry.phase) {
    case "AI_REVIEW":
      return resolveAiReviewStatusLabel(entry.status);
    case "ASYNC_TASK":
      return `${TIMELINE_PHASE_LABEL.ASYNC_TASK} · ${resolveAsyncTaskStatusLabel(entry.status)}`;
    case "ASYNC_TASK_FINISHED":
      return entry.status === "FAILED"
        ? `${TIMELINE_PHASE_LABEL.ASYNC_TASK_FINISHED} · 失败`
        : `${TIMELINE_PHASE_LABEL.ASYNC_TASK_FINISHED} · ${resolveAsyncTaskStatusLabel(entry.status)}`;
    case "SUBMISSION": {
      const actionLabel = resolveSubmissionActionLabel(entry.detail);
      const statusLabel = resolveSubmissionStatusLabel(entry.status);
      return `${actionLabel} · 流转至「${statusLabel}」`;
    }
    default:
      return TIMELINE_PHASE_LABEL[entry.phase] ?? entry.phase;
  }
}

function buildTimelineEntryDetail(entry: AiReviewTimelineEntry, summary?: AiReviewObservabilityRecordSummary): string {
  const parts: string[] = [];

  if (entry.phase === "AI_REVIEW") {
    if (entry.detail) {
      parts.push(entry.detail);
    }
    if (summary?.verdict) {
      parts.push(`结论：${AI_REVIEW_VERDICT_META[summary.verdict]?.label ?? summary.verdict}`);
    }
    if (summary?.attemptCount != null) {
      parts.push(`共 ${summary.attemptCount} 次调用`);
    }
    if (summary?.totalLatencyMs != null) {
      parts.push(`总耗时 ${formatLatency(summary.totalLatencyMs)}`);
    }
  } else if (entry.phase === "ASYNC_TASK" || entry.phase === "ASYNC_TASK_FINISHED") {
    if (entry.detail) {
      parts.push(entry.detail);
    }
    if (entry.phase === "ASYNC_TASK_FINISHED" && entry.detail && entry.status === "FAILED") {
      parts.push(`失败原因：${entry.detail}`);
    }
  } else if (entry.phase === "SUBMISSION") {
    parts.push(`业务动作：${resolveSubmissionActionLabel(entry.detail)}`);
  } else if (entry.detail) {
    parts.push(entry.detail);
  }

  const traceability = formatTraceability(entry.traceabilityStatus);
  if (traceability && traceability !== "完整采集") {
    parts.push(`数据追溯：${traceability}`);
  }

  return parts.filter(Boolean).join(" · ");
}

function buildAttemptTimelineEntry(
  attempt: AiReviewLlmAttempt,
  showSensitive: boolean,
  index: number,
): AuditTimelineEntry {
  const label = attempt.success
    ? `第 ${attempt.attemptNo} 次模型调用 · 成功`
    : `第 ${attempt.attemptNo} 次模型调用 · 失败`;

  const parts: string[] = [formatLatency(attempt.latencyMs)];
  if (showSensitive && attempt.modelId) {
    parts.push(`模型 ${attempt.modelId}`);
  }
  if (showSensitive) {
    parts.push(formatTokenUsage(attempt.promptTokens, attempt.completionTokens, attempt.totalTokens));
    const cost = formatEstimatedCost(attempt.estimatedCost);
    if (cost) {
      parts.push(`预估成本 ${cost}`);
    }
  }
  const traceability = formatTraceability(attempt.traceabilityStatus);
  if (traceability && traceability !== "完整采集") {
    parts.push(`数据追溯：${traceability}`);
  }
  if (attempt.errorMessage) {
    parts.push(attempt.errorMessage);
  }

  return {
    id: `attempt-${attempt.attemptNo}-${index}`,
    stage: "LLM_ATTEMPT",
    label,
    detail: parts.filter(Boolean).join(" · "),
    timestamp: "—",
    tone: resolveTimelineTone("LLM_ATTEMPT", attempt.success ? "SUCCESS" : "FAILED", attempt.success),
  };
}

export function buildAiReviewDetailTimelineEntries(
  detail: AiReviewObservabilityRecordDetail,
  showSensitive: boolean,
): AuditTimelineEntry[] {
  const summary = detail.summary;
  const entries: AuditTimelineEntry[] = detail.timeline.map((entry, index) => ({
    id: `${entry.phase}-${index}-${entry.occurredAt ?? "unknown"}`,
    stage: entry.phase,
    label: buildTimelineEntryLabel(entry),
    detail: buildTimelineEntryDetail(entry, entry.phase === "AI_REVIEW" ? summary : undefined),
    timestamp: formatTimelineTimestamp(entry.occurredAt),
    tone: resolveTimelineTone(entry.phase, entry.status),
  }));

  const aiReviewIndex = detail.timeline.findIndex((entry) => entry.phase === "AI_REVIEW");
  const insertIndex = aiReviewIndex >= 0 ? aiReviewIndex + 1 : entries.length;
  const attemptEntries = detail.attempts.map((attempt, index) =>
    buildAttemptTimelineEntry(attempt, showSensitive, index),
  );
  entries.splice(insertIndex, 0, ...attemptEntries);

  return entries;
}

export function buildAiReviewExecutionTimelineEntries(
  detail: AiReviewObservabilityRecordDetail,
): AuditTimelineEntry[] {
  const summary = detail.summary;
  return detail.timeline.map((entry, index) => ({
    id: `${entry.phase}-${index}-${entry.occurredAt ?? "unknown"}`,
    stage: entry.phase,
    label: buildTimelineEntryLabel(entry),
    detail: buildTimelineEntryDetail(entry, entry.phase === "AI_REVIEW" ? summary : undefined),
    timestamp: formatTimelineTimestamp(entry.occurredAt),
    tone: resolveTimelineTone(entry.phase, entry.status),
  }));
}

export function buildAiReviewDetailHeaderMeta(summary: AiReviewObservabilityRecordSummary): string[] {
  const parts: string[] = [];
  const taskLabel = summary.taskTitle || summary.taskCode;
  if (taskLabel) {
    parts.push(`任务 ${taskLabel}`);
  }
  if (summary.verdict) {
    parts.push(AI_REVIEW_VERDICT_META[summary.verdict]?.label ?? summary.verdict);
  }
  parts.push(`提交 #${summary.submissionId}`);
  return parts;
}
