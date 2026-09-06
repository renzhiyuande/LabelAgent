import {
  Boxes,
  FileCheck2,
  FolderKanban,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type {
  AdminDashboardOverview,
  LabelerDashboardOverview,
  OwnerDashboardOverview,
  ReviewerDashboardOverview,
} from "../dashboard-overview-api";

export type WorkspaceKey = "owner" | "reviewer" | "labeler" | "admin";

export interface WorkstreamLink {
  title: string;
  description: string;
  href: string;
  permission: string | string[];
}

export interface RoleWorkspace {
  key: WorkspaceKey;
  title: string;
  accent: string;
  icon: LucideIcon;
  badge: string;
  summary: string;
  detailPath: string;
  links: WorkstreamLink[];
  activeWhen: (permissions: Set<string>, roles: Set<string>) => boolean;
}

export interface WorkspaceMetric {
  label: string;
  value: string;
  hint: string;
  href: string;
  tone?: "default" | "success" | "warning" | "destructive";
}

export interface DashboardOverviewState {
  owner: OwnerDashboardOverview | null;
  reviewer: ReviewerDashboardOverview | null;
  labeler: LabelerDashboardOverview | null;
  admin: AdminDashboardOverview | null;
}

export function hasAnyPermission(owned: Set<string>, required: string | string[]) {
  const normalized = Array.isArray(required) ? required : [required];
  return normalized.some((item) => owned.has(item));
}

export const roleWorkspaces: RoleWorkspace[] = [
  {
    key: "owner",
    title: "Owner 交付看板",
    accent: "from-primary/16 via-primary/8 to-transparent",
    icon: FolderKanban,
    badge: "主交付角色",
    summary: "围绕任务发布、提交追踪、AI 预审结果查看与验收结算组织生产链路。",
    detailPath: "/dashboard/owner",
    links: [
      { title: "Owner 统计详情", description: "查看提交趋势、状态分布、AI 评分与标注员效率。", href: "/dashboard/owner", permission: ["system:admin", "business:submission:read"] },
      { title: "Owner AI 审核台", description: "集中查看提交队列、AI 结论与生命周期。", href: "/owner/ai-review", permission: ["system:admin", "business:submission:read"] },
      { title: "AI 预审质检大屏", description: "从任务模板列表切换查看 AI–人工一致率与提示词优化建议。", href: "/owner/ai-review-health", permission: ["system:admin", "business:submission:read"] },
      { title: "AI 审核大屏", description: "查看自己任务的 AI 审核队列、吞吐趋势与执行记录。", href: "/owner/ai-review-observability", permission: ["system:admin", "business:ai-review:observe:owner", "business:submission:read"] },
      { title: "任务管理", description: "维护任务状态、模板就绪与发布准备度。", href: "/owner/tasks", permission: ["system:admin", "business:task:read"] },
      { title: "提交记录", description: "查看提交流转、AI 预审状态并进入详情。", href: "/owner/submissions", permission: ["system:admin", "business:submission:read"] },
      { title: "数据验收", description: "跟进抽样、确认与重开流程。", href: "/owner/acceptances", permission: ["system:admin", "business:acceptance:manage"] },
      { title: "数据导出", description: "追踪导出任务和结果文件。", href: "/owner/exports", permission: ["system:admin", "business:export:manage"] },
      { title: "奖励结算", description: "管理审核通过后的报酬批次。", href: "/owner/settlements", permission: ["system:admin", "business:settlement:read"] },
    ],
    activeWhen: (permissions, roles) =>
      roles.has("SYSTEM_ADMIN") ||
      hasAnyPermission(permissions, ["business:task:read", "business:submission:read", "business:acceptance:manage"]),
  },
  {
    key: "reviewer",
    title: "Reviewer 质检看板",
    accent: "from-accent/85 via-primary/8 to-transparent",
    icon: ShieldCheck,
    badge: "审核链路",
    summary: "聚焦 AI 审核队列、人工审核池与结果回溯，掌握审核链路全貌。",
    detailPath: "/dashboard/reviewer",
    links: [
      { title: "Reviewer 统计详情", description: "查看队列压力、审核产能与结果概览。", href: "/dashboard/reviewer", permission: "business:reviewer:workbench" },
      { title: "AI 审核队列", description: "处理 AI 预审后的人工接力队列。", href: "/reviewer/ai-queue", permission: "business:reviewer:workbench" },
      { title: "人工审核池", description: "按等级接单并完成批量审核。", href: "/reviewer/audit-pool", permission: "business:reviewer:workbench" },
      { title: "审核结果", description: "查询历史审核记录与动作明细。", href: "/reviewer/review-results", permission: "business:reviewer:workbench" },
    ],
    activeWhen: (permissions) => hasAnyPermission(permissions, "business:reviewer:workbench"),
  },
  {
    key: "labeler",
    title: "Labeler 工作看板",
    accent: "from-secondary/90 via-accent/55 to-transparent",
    icon: UserRound,
    badge: "生产执行",
    summary: "汇总任务广场、我的任务、提交历史与奖励进度，一站式掌握工作状态。",
    detailPath: "/dashboard/labeler",
    links: [
      { title: "Labeler 统计详情", description: "查看个人任务、提交、奖励和处理状态。", href: "/dashboard/labeler", permission: "business:labeler:workbench" },
      { title: "任务广场", description: "领取新任务并查看题量与规则。", href: "/labeler/available", permission: "business:labeler:workbench" },
      { title: "我的任务", description: "回到当前进行中的分配和工作台。", href: "/labeler/my-tasks", permission: "business:labeler:workbench" },
      { title: "我的草稿", description: "查看未提交草稿并继续编辑。", href: "/labeler/my-drafts", permission: "business:labeler:workbench" },
      { title: "已提交历史", description: "检查 AI 审核、人工审核和退回状态。", href: "/labeler/my-submitted", permission: "business:labeler:workbench" },
      { title: "我的奖励", description: "查看奖励批次、金额和发放状态。", href: "/labeler/my-rewards", permission: "business:labeler:workbench" },
    ],
    activeWhen: (permissions) => hasAnyPermission(permissions, "business:labeler:workbench"),
  },
  {
    key: "admin",
    title: "Admin 平台看板",
    accent: "from-muted via-primary/10 to-transparent",
    icon: Boxes,
    badge: "平台治理",
    summary: "为系统管理员提供模板、平台资源与运营统计的治理入口。",
    detailPath: "/dashboard/admin",
    links: [
      { title: "Admin 统计详情", description: "查看平台任务、提交、AI 请求与人工接力总览。", href: "/dashboard/admin", permission: "system:admin" },
      { title: "平台 AI 审核大屏", description: "查看全平台 AI 审核线路、吞吐、TopK 与执行明细。", href: "/system/ai-review-observability", permission: ["system:admin", "business:ai-review:observe:admin"] },
      { title: "模板搭建器", description: "维护题目模板、评审维度和预览样本。", href: "/system/template-designer", permission: ["system:admin", "business:task:read"] },
    ],
    activeWhen: (permissions, roles) => roles.has("SYSTEM_ADMIN") || permissions.has("system:admin"),
  },
];

export function formatCount(value: number) {
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(value);
}

export function formatPercent(value: number) {
  return `${new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

export function formatAmount(value: number) {
  return `¥${new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

export function successRate(success: number, total: number) {
  if (total <= 0) {
    return "—";
  }
  return formatPercent((success / total) * 100);
}

export function metricsForWorkspace(
  workspaceKey: WorkspaceKey,
  overview: DashboardOverviewState,
): WorkspaceMetric[] {
  switch (workspaceKey) {
    case "owner": {
      const data = overview.owner;
      if (!data) {
        return [];
      }
      return [
        {
          label: "提交总量",
          value: formatCount(data.submissionTotal),
          hint: `已通过 ${formatCount(data.approvedTotal)}`,
          href: "/owner/submissions",
        },
        {
          label: "待 AI / 人工复核",
          value: formatCount(data.reviewInFlight),
          hint: "AI 预审与人工复核中",
          href: "/owner/ai-review",
          tone: data.reviewInFlight > 0 ? "warning" : "success",
        },
        {
          label: "待验收",
          value: formatCount(data.acceptanceOpen),
          hint: "待抽样、抽检中或已重开",
          href: "/owner/acceptances",
          tone: data.acceptanceOpen > 0 ? "warning" : "success",
        },
        {
          label: "待导出",
          value: formatCount(data.exportOpen),
          hint: "待处理或导出中",
          href: "/owner/exports",
          tone: data.exportOpen > 0 ? "warning" : "success",
        },
        {
          label: "待结算",
          value: formatCount(data.settlementOpen),
          hint: "待确认或已确认待打款",
          href: "/owner/settlements",
          tone: data.settlementOpen > 0 ? "warning" : "success",
        },
        {
          label: "AI 队列运行中",
          value: formatCount(data.aiObservability?.queueRunning ?? 0),
          hint: `待处理 ${formatCount(data.aiObservability?.queuePending ?? 0)} · 1h 吞吐 ${formatCount(data.aiObservability?.reviewsLastHour ?? 0)}`,
          href: "/owner/ai-review-observability",
          tone: (data.aiObservability?.queueRunning ?? 0) > 0 ? "warning" : "success",
        },
        {
          label: "AI 24h 失败率",
          value: formatPercent(data.aiObservability?.failureRateLast24Hours ?? 0),
          hint: `关注项 ${formatCount(data.aiObservability?.attentionCount ?? 0)}`,
          href: "/owner/ai-review-observability",
          tone: (data.aiObservability?.failedLast24Hours ?? 0) > 0 ? "warning" : "success",
        },
      ];
    }
    case "reviewer": {
      const data = overview.reviewer;
      if (!data) {
        return [];
      }
      return [
        {
          label: "AI 队列总量",
          value: formatCount(data.queueTotal),
          hint: `待处理 ${formatCount(data.pendingCount)}`,
          href: "/reviewer/ai-queue",
        },
        {
          label: "待人工接力",
          value: formatCount(data.manualCount),
          hint: `失败 / 死信 ${formatCount(data.failedCount)}`,
          href: "/reviewer/ai-queue",
          tone: data.manualCount > 0 ? "warning" : "success",
        },
        {
          label: "人工审核池积压",
          value: formatCount(data.auditPoolPendingCount),
          hint: "按审核等级聚合待处理量",
          href: "/reviewer/audit-pool",
          tone: data.auditPoolPendingCount > 0 ? "warning" : "success",
        },
        {
          label: "审核结果记录",
          value: formatCount(data.reviewRecordTotal),
          hint: "历史人工审核动作",
          href: "/reviewer/review-results",
        },
      ];
    }
    case "labeler": {
      const data = overview.labeler;
      if (!data) {
        return [];
      }
      return [
        {
          label: "待作答",
          value: formatCount(data.openCount),
          hint: `${formatCount(data.taskCount)} 个任务聚合`,
          href: "/labeler/my-tasks",
          tone: data.openCount > 0 ? "warning" : "success",
        },
        {
          label: "待审核",
          value: formatCount(data.pendingReviewCount),
          hint: `已提交 ${formatCount(data.submittedEverCount)}`,
          href: "/labeler/my-submitted",
          tone: data.pendingReviewCount > 0 ? "warning" : "default",
        },
        {
          label: "需修改",
          value: formatCount(data.needsRevisionCount),
          hint: `已通过 ${formatCount(data.approvedCount)}`,
          href: "/labeler/my-submitted",
          tone: data.needsRevisionCount > 0 ? "destructive" : "success",
        },
        {
          label: "我的草稿",
          value: formatCount(data.draftCount),
          hint: "可直接回到工作台继续编辑",
          href: "/labeler/my-drafts",
          tone: data.draftCount > 0 ? "default" : "success",
        },
        {
          label: "累计奖励",
          value: formatAmount(data.rewardAmountTotal),
          hint: `记录 ${formatCount(data.rewardCount)} 条，已打款 ${formatCount(data.paidRewardCount)} 条`,
          href: "/labeler/my-rewards",
          tone: "success",
        },
      ];
    }
    case "admin": {
      const data = overview.admin;
      if (!data) {
        return [];
      }
      return [
        {
          label: "平台任务",
          value: formatCount(data.platform.totalTasks),
          hint: `已发布 ${formatCount(data.platform.publishedTasks)} / 草稿 ${formatCount(data.platform.draftTasks)}`,
          href: "/owner/tasks",
        },
        {
          label: "提交总量",
          value: formatCount(data.platform.totalSubmissions),
          hint: `待复核 ${formatCount(data.platform.pendingReviewCount)}`,
          href: "/owner/submissions",
        },
        {
          label: "AI 请求成功率",
          value: successRate(data.aiTaskSuccess, data.aiTaskTotal),
          hint: `总量 ${formatCount(data.aiTaskTotal)} / 运行中 ${formatCount(data.aiTaskRunning)}`,
          href: "/system/async",
          tone: data.aiTaskFailed > 0 ? "warning" : "success",
        },
        {
          label: "人工接力",
          value: formatCount(data.reviewerManualCount),
          hint: `失败 / 死信 ${formatCount(data.aiTaskFailed)}，用户 ${formatCount(data.platform.totalUsers)}`,
          href: "/reviewer/ai-queue",
          tone: data.reviewerManualCount > 0 ? "warning" : "success",
        },
        {
          label: "AI 实时处理",
          value: formatCount(data.aiObservability?.queueRunning ?? 0),
          hint: `待处理 ${formatCount(data.aiObservability?.queuePending ?? 0)} · 平均耗时 ${formatCount(data.aiObservability?.avgLatencyMsLast24Hours ?? 0)}ms`,
          href: "/system/ai-review-observability",
          tone: (data.aiObservability?.queueRunning ?? 0) > 0 ? "warning" : "success",
        },
        {
          label: "AI 24h 吞吐",
          value: formatCount(data.aiObservability?.reviewsLast24Hours ?? 0),
          hint: `失败率 ${formatPercent(data.aiObservability?.failureRateLast24Hours ?? 0)}`,
          href: "/system/ai-review-observability",
        },
      ];
    }
    default:
      return [];
  }
}

export const detailPageNotes: Record<WorkspaceKey, Array<{ title: string; description: string }>> = {
  owner: [
    { title: "Owner 趋势分析", description: "以任务经营视角查看提交、通过、待修改、AI 评分和标注员效率。" },
    { title: "业务链路入口", description: "从统计页直接回到 AI 审核、提交、验收、导出和结算页面继续处理。" },
  ],
  reviewer: [
    { title: "队列与审核产能", description: "实时查看队列积压、接力总量与审核产能。" },
    { title: "结果回溯", description: "可从详情页直达审核结果与审核池，联动查看具体记录。" },
  ],
  labeler: [
    { title: "个人生产视图", description: "聚合待作答、待审核、需修改、草稿和奖励，统一掌握个人工作状态。" },
    { title: "产出与质量分析", description: "查看提交趋势、质量分走势与参与任务列表。" },
  ],
  admin: [
    { title: "平台治理总览", description: "聚合任务、提交、AI 请求与人工接力等核心平台指标。" },
    { title: "治理工具入口", description: "模板搭建器与系统资源入口就近放置，便于平台治理。" },
  ],
};

export const detailPageIcons: Record<WorkspaceKey, LucideIcon> = {
  owner: FolderKanban,
  reviewer: FileCheck2,
  labeler: UserRound,
  admin: Boxes,
};

export const detailPageHighlights: Record<WorkspaceKey, string[]> = {
  owner: ["提交趋势", "状态分布", "AI 评分", "标注员效率"],
  reviewer: ["AI 队列", "人工审核池", "审核结果", "审核趋势"],
  labeler: ["待作答", "待审核", "需修改", "奖励累计"],
  admin: ["平台任务", "提交总量", "AI 成功率", "人工接力"],
};

