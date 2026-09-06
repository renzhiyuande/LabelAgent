import { LabelerWorkPage } from "@/features/labeler";
import { NotificationsPage } from "../../features/notifications";
import { ProfilePage } from "../../features/profile/ProfilePage";
import { ReviewAiQueuePage, ReviewAuditPoolPage } from "../../features/review";
import { SystemResourcePage } from "../../features/system/SystemResourcePage";
import { DashboardPage } from "../../features/dashboard/DashboardPage";
import { OwnerAiReviewPage } from "../../features/business/pages/OwnerAiReviewPage";
import { OwnerAiReviewHealthPage } from "../../features/business/pages/OwnerAiReviewHealthPage";
import { AdminAiReviewObservabilityPage } from "../../features/business/pages/AdminAiReviewObservabilityPage";
import { OwnerAiReviewObservabilityPage } from "../../features/business/pages/OwnerAiReviewObservabilityPage";
import { LabelerDashboardDetailPage } from "../../features/dashboard/pages/LabelerDashboardDetailPage";
import { AdminDashboardDetailPage } from "../../features/dashboard/pages/AdminDashboardDetailPage";
import { OwnerDashboardDetailPage } from "../../features/dashboard/pages/OwnerDashboardDetailPage";
import { ReviewerDashboardDetailPage } from "../../features/dashboard/pages/ReviewerDashboardDetailPage";
import { SystemLowCodeLabPage } from "../../features/system/SystemLowCodeLabPage";
import { TemplateDesignerPage } from "../../features/template-designer/TemplateDesignerPage";
import type { AppRouteDefinition } from "./types";

const devWorkspaceRoutes: AppRouteDefinition[] = import.meta.env.DEV
  ? [
      {
        meta: {
          name: "system-low-code-lab",
          path: "/system/low-code-lab",
          title: "低代码实验场",
          permission: "system:admin",
          keepAlive: true,
          closable: true,
          hideInMenu: true,
        },
        render: () => <SystemLowCodeLabPage />,
      },
    ]
  : [];

export const localWorkspaceRoutes: AppRouteDefinition[] = [
  {
    meta: {
      name: "profile",
      path: "/profile",
      title: "个人中心",
      keepAlive: true,
      closable: true,
      hideInMenu: true,
    },
    render: () => <ProfilePage />,
  },
  {
    meta: {
      name: "notifications",
      path: "/notifications",
      title: "通知中心",
      keepAlive: true,
      closable: true,
      hideInMenu: true,
    },
    render: () => <NotificationsPage />,
  },
  {
    meta: {
      name: "dashboard",
      path: "/",
      title: "工作台",
      affix: true,
      closable: false,
      keepAlive: true,
    },
    render: () => <DashboardPage />,
  },
  {
    meta: {
      name: "owner-ai-review",
      path: "/owner/ai-review",
      title: "Owner AI 审核台",
      permission: ["system:admin", "business:submission:read"],
      keepAlive: true,
      closable: true,
      hideInMenu: true,
    },
    render: () => <OwnerAiReviewPage />,
  },
  {
    meta: {
      name: "owner-ai-review-health",
      path: "/owner/ai-review-health/:templateId?",
      title: "AI 预审质检大屏",
      permission: ["system:admin", "business:submission:read"],
      keepAlive: true,
      closable: true,
      cacheKey: "/owner/ai-review-health",
      activeMenu: "/owner/ai-review-health",
    },
    render: () => <OwnerAiReviewHealthPage />,
  },
  {
    meta: {
      name: "admin-ai-review-observability",
      path: "/system/ai-review-observability",
      title: "AI 审核大屏",
      permission: ["system:admin", "business:ai-review:observe:admin"],
      keepAlive: true,
      closable: true,
    },
    render: () => <AdminAiReviewObservabilityPage />,
  },
  {
    meta: {
      name: "owner-ai-review-observability",
      path: "/owner/ai-review-observability",
      title: "AI 审核大屏",
      permission: ["system:admin", "business:ai-review:observe:owner", "business:submission:read"],
      keepAlive: true,
      closable: true,
    },
    render: () => <OwnerAiReviewObservabilityPage />,
  },
  {
    meta: {
      name: "dashboard-owner",
      path: "/dashboard/owner",
      title: "Owner 统计详情",
      keepAlive: true,
      closable: true,
      hideInMenu: true,
    },
    render: () => <OwnerDashboardDetailPage />,
  },
  {
    meta: {
      name: "dashboard-reviewer",
      path: "/dashboard/reviewer",
      title: "Reviewer 统计详情",
      keepAlive: true,
      closable: true,
      hideInMenu: true,
    },
    render: () => <ReviewerDashboardDetailPage />,
  },
  {
    meta: {
      name: "dashboard-labeler",
      path: "/dashboard/labeler",
      title: "Labeler 统计详情",
      keepAlive: true,
      closable: true,
      hideInMenu: true,
    },
    render: () => <LabelerDashboardDetailPage />,
  },
  {
    meta: {
      name: "dashboard-admin",
      path: "/dashboard/admin",
      title: "Admin 统计详情",
      keepAlive: true,
      closable: true,
      hideInMenu: true,
    },
    render: () => <AdminDashboardDetailPage />,
  },
  {
    meta: {
      name: "template-designer",
      path: "/system/template-designer",
      title: "模板搭建器",
      keepAlive: true,
      closable: true,
    },
    render: () => <TemplateDesignerPage />,
  },
  {
    meta: {
      name: "labeler-work",
      path: "/labeler/work/:assignmentId",
      title: "标注工作台",
      permission: "business:labeler:workbench",
      keepAlive: true,
      cacheKey: "/labeler/work/:assignmentId",
      closable: true,
      hideInMenu: true,
    },
    render: () => <LabelerWorkPage />,
  },
  ...devWorkspaceRoutes,
  {
    meta: {
      name: "reviewer-ai-queue",
      path: "/reviewer/ai-queue",
      title: "AI 审核队列",
      keepAlive: true,
      closable: true,
    },
    render: () => <ReviewAiQueuePage />,
  },
  {
    meta: {
      name: "reviewer-audit-pool",
      path: "/reviewer/audit-pool",
      title: "人工审核池",
      keepAlive: true,
      closable: true,
    },
    render: () => <ReviewAuditPoolPage />,
  },
  {
    meta: {
      name: "reviewer-review-results",
      path: "/reviewer/review-results",
      title: "审核结果",
      resourceKey: "reviewerReviewRecords",
      keepAlive: true,
      closable: true,
    },
    render: () => <SystemResourcePage resourceKey="reviewerReviewRecords" />,
  },
  {
    meta: {
      name: "reviewer-ai-queue-work",
      path: "/reviewer/ai-queue/:submissionId?",
      title: "AI 审核队列",
      permission: "business:reviewer:workbench",
      keepAlive: true,
      cacheKey: "/reviewer/ai-queue/:submissionId?",
      activeMenu: "/reviewer/ai-queue",
      closable: true,
      hideInMenu: true,
    },
    render: () => <ReviewAiQueuePage />,
  },
  {
    meta: {
      name: "reviewer-audit-pool-work",
      path: "/reviewer/audit-pool/:reviewId?",
      title: "人工审核池",
      permission: "business:reviewer:workbench",
      keepAlive: true,
      cacheKey: "/reviewer/audit-pool/:reviewId?",
      activeMenu: "/reviewer/audit-pool",
      closable: true,
      hideInMenu: true,
    },
    render: () => <ReviewAuditPoolPage />,
  },
];
