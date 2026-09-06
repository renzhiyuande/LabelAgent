import type { ResourceRecord } from "@/low-code/types";
import type { ResourcePageSummaryTone } from "@/low-code/schema/types";
import { resolveAcceptanceStatusText } from "@/low-code-resources/acceptances";

export interface ResourceInsightValue {
  value: string;
  hint: string;
  tone?: ResourcePageSummaryTone;
}

export interface ResourceInsightSnapshot {
  badge?: string;
  metrics: Record<string, ResourceInsightValue>;
  tips: string[];
}

const moneyFormatter = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function sum(records: ResourceRecord[], field: string): number {
  return records.reduce((total, record) => total + asNumber(record[field]), 0);
}

function count(records: ResourceRecord[], predicate: (record: ResourceRecord) => boolean): number {
  return records.reduce((total, record) => total + (predicate(record) ? 1 : 0), 0);
}

function formatAmount(value: number): string {
  return value === 0 ? "0" : moneyFormatter.format(value);
}

function formatRatio(completed: number, total: number): string {
  if (total <= 0) {
    return "0%";
  }
  return `${Math.round((completed / total) * 100)}%`;
}

function buildRewardSettlementInsights(records: ResourceRecord[]): ResourceInsightSnapshot {
  const totalAmount = sum(records, "totalAmount");
  const effectiveCount = sum(records, "effectiveTotalCount");
  const draftCount = count(records, (record) => String(record.status ?? "") === "DRAFT");
  const confirmedCount = count(records, (record) => String(record.status ?? "") === "CONFIRMED");
  const paidCount = count(records, (record) => String(record.status ?? "") === "PAID");
  const reversedCount = count(records, (record) => String(record.status ?? "") === "REVERSED");

  return {
    badge: records.length ? "当前筛选摘要" : "等待数据",
    metrics: {
      totalAmount: {
        value: formatAmount(totalAmount),
        hint: `覆盖 ${effectiveCount} 条有效提交`,
        tone: totalAmount > 0 ? "success" : "default",
      },
      draftCount: {
        value: String(draftCount),
        hint: "确认后才能导出或打款",
        tone: draftCount > 0 ? "warning" : "success",
      },
      confirmedCount: {
        value: String(confirmedCount),
        hint: "已确认，等待打款",
        tone: confirmedCount > 0 ? "warning" : "success",
      },
      closedCount: {
        value: String(paidCount + reversedCount),
        hint: `${paidCount} 已打款 / ${reversedCount} 已冲正`,
        tone: reversedCount > 0 ? "destructive" : "success",
      },
    },
    tips: [
      "优先处理待确认批次，缩短结算等待时间。",
      "出现冲正批次时，建议回看审核和验收记录。",
    ],
  };
}

function buildExportInsights(records: ResourceRecord[]): ResourceInsightSnapshot {
  const runningCount = count(records, (record) => {
    const status = String(record.status ?? "");
    return status === "PENDING" || status === "RUNNING";
  });
  const successCount = count(records, (record) => String(record.status ?? "") === "SUCCESS");
  const failedCount = count(records, (record) => {
    const status = String(record.status ?? "");
    return status === "FAILED" || status === "CANCELLED";
  });
  const totalRecordCount = sum(records, "totalRecordCount");
  const progressTotal = sum(records, "progressPercent");
  const avgProgress = records.length ? Math.round(progressTotal / records.length) : 0;

  return {
    badge: records.length ? "导出运行摘要" : "等待数据",
    metrics: {
      runningCount: {
        value: String(runningCount),
        hint: `当前页平均进度 ${avgProgress}%`,
        tone: runningCount > 0 ? "warning" : "success",
      },
      successCount: {
        value: String(successCount),
        hint: "状态为已完成的导出任务",
        tone: successCount > 0 ? "success" : "default",
      },
      failedCount: {
        value: String(failedCount),
        hint: "失败或取消，需回看筛选与字段",
        tone: failedCount > 0 ? "destructive" : "success",
      },
      totalRecordCount: {
        value: String(totalRecordCount),
        hint: "当前筛选结果中的记录规模",
        tone: totalRecordCount > 0 ? "default" : "warning",
      },
    },
    tips: [
      "大批量导出建议缩小字段范围，缩短处理时间。",
      "已完成结果建议及时下载，避免链接过期。",
    ],
  };
}

function buildAcceptanceInsights(records: ResourceRecord[]): ResourceInsightSnapshot {
  const totalSamples = sum(records, "sampleTotalCount");
  const checkedSamples = sum(records, "sampledCount");
  const confirmedCount = count(records, (record) => String(record.status ?? "") === "CONFIRMED");
  const readyToConfirmCount = count(records, (record) => {
    const status = String(record.status ?? "");
    const total = asNumber(record.sampleTotalCount);
    const checked = asNumber(record.sampledCount);
    return (status === "SAMPLING" || status === "REOPENED") && total > 0 && checked >= total;
  });
  const inProgressCount = count(records, (record) => {
    const text = resolveAcceptanceStatusText(record);
    return text === "待抽检" || text === "抽检中";
  });
  const failedCount = sum(records, "failedCount");

  return {
    badge: records.length ? "抽样进度摘要" : "等待数据",
    metrics: {
      completion: {
        value: formatRatio(checkedSamples, totalSamples),
        hint: `${checkedSamples}/${totalSamples} 个样本已检查`,
        tone: checkedSamples >= totalSamples && totalSamples > 0 ? "success" : "warning",
      },
      readyToConfirmCount: {
        value: String(readyToConfirmCount),
        hint: "样本已检查完，可直接确认",
        tone: readyToConfirmCount > 0 ? "warning" : "success",
      },
      inProgressCount: {
        value: String(inProgressCount),
        hint: "仍需继续处理的验收单",
        tone: inProgressCount > 0 ? "warning" : "default",
      },
      confirmedVsFailed: {
        value: `${confirmedCount} / ${failedCount}`,
        hint: "已确认单量 / 打回样本数",
        tone: failedCount > 0 ? "destructive" : "success",
      },
    },
    tips: [
      "优先处理样本已检查完的验收单，缩短最终确认等待。",
      "打回样本偏多时，回看 Reviewer/Owner 审核口径。",
    ],
  };
}

function buildLabelerRewardInsights(records: ResourceRecord[]): ResourceInsightSnapshot {
  const totalAmount = sum(records, "amount");
  const pendingCount = count(records, (record) => String(record.status ?? "") === "PENDING");
  const confirmedCount = count(records, (record) => String(record.status ?? "") === "CONFIRMED");
  const paidCount = count(records, (record) => String(record.status ?? "") === "PAID");
  const reversedCount = count(records, (record) => String(record.status ?? "") === "REVERSED");

  return {
    badge: records.length ? "个人奖励摘要" : "等待数据",
    metrics: {
      totalAmount: {
        value: formatAmount(totalAmount),
        hint: `当前页共 ${records.length} 条奖励明细`,
        tone: totalAmount > 0 ? "success" : "default",
      },
      pendingCount: {
        value: String(pendingCount),
        hint: "批次仍在确认前阶段",
        tone: pendingCount > 0 ? "warning" : "success",
      },
      confirmedCount: {
        value: String(confirmedCount),
        hint: "奖励已确认，等待打款",
        tone: confirmedCount > 0 ? "warning" : "success",
      },
      settledVsReversed: {
        value: `${paidCount} / ${reversedCount}`,
        hint: "已完成到账 / 已冲正",
        tone: reversedCount > 0 ? "destructive" : "success",
      },
    },
    tips: [
      "优先关注待打款奖励，确认是否已进入付款批次。",
      "出现冲正时，建议核对对应提交记录与批次。",
    ],
  };
}

export function isNavigableMetricHref(href: string | undefined, pathname: string): href is string {
  if (!href) {
    return false;
  }
  const normalizedHref = href.split("?")[0]?.split("#")[0] ?? href;
  const normalizedPath = pathname.split("?")[0]?.split("#")[0] ?? pathname;
  return normalizedHref !== normalizedPath;
}

export function getResourceInsightSnapshot(resourceKey: string, records: ResourceRecord[]): ResourceInsightSnapshot | null {
  switch (resourceKey) {
    case "rewardSettlements":
      return buildRewardSettlementInsights(records);
    case "exports":
      return buildExportInsights(records);
    case "acceptances":
      return buildAcceptanceInsights(records);
    case "labelerMyRewards":
      return buildLabelerRewardInsights(records);
    default:
      return null;
  }
}
