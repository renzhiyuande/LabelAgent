import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  projectSidebar: [
    // 项目概览
    { type: "doc", id: "intro", label: "项目概览" },
    { type: "doc", id: "architecture", label: "整体架构" },
    { type: "doc", id: "quick-start", label: "快速启动" },
    {
      type: "category",
      label: "🏁 赛题交付",
      collapsed: true,
      items: [
        "contest/overview",
        "contest/ai-coding-record",
        {
          type: "category",
          label: "提交物（→ submission/）",
          collapsed: true,
          link: { type: "doc", id: "contest/submission/index" },
          items: [
            "contest/submission/demo-video",
            "contest/submission/related-docs",
            "contest/submission/ai-coding-record",
            "contest/submission/demo-environment",
            "contest/submission/api-docs",
          ],
        },
        "contest/requirement-matrix",
        "contest/verification-status",
        "contest/submission-package",
        "contest/browser-automation-tutorial",
      ],
    },

    // ── 业务指南 ──
    {
      type: "category",
      label: "📋 业务指南",
      collapsed: true,
      link: { type: "generated-index", title: "业务指南" },
      items: [
        {
          type: "category",
          label: "任务负责人（Owner）",
          collapsed: true,
          link: { type: "doc", id: "business/owner/overview" },
          items: [
            "business/owner/task-management",
            "business/owner/template-design",
            "business/owner/task-create",
            "business/owner/task-assignment",
            "business/owner/submission-appeal",
            "business/owner/data-acceptance",
            "business/owner/data-export",
            "business/owner/reward-settlement",
          ],
        },
        {
          type: "category",
          label: "标注员（Labeler）",
          collapsed: true,
          link: { type: "doc", id: "business/labeler/overview" },
          items: [
            "business/labeler/market",
            "business/labeler/claim",
            "business/labeler/annotation",
          ],
        },
        {
          type: "category",
          label: "审核员（Reviewer）",
          collapsed: true,
          link: { type: "doc", id: "business/reviewer/overview" },
          items: [
            "business/reviewer/ai-queue",
            "business/reviewer/audit-pool",
            "business/reviewer/review-results",
          ],
        },
        {
          type: "category",
          label: "系统管理员（Admin）",
          collapsed: true,
          link: { type: "doc", id: "business/admin/overview" },
          items: [
            "business/admin/user-management",
            "business/admin/role-permission",
            "business/admin/system-config",
          ],
        },
      ],
    },

    // ── 开发指南 ──
    {
      type: "category",
      label: "🔧 开发指南",
      collapsed: true,
      link: { type: "generated-index", title: "开发指南" },
      items: [
        "development/setup",
        "development/conventions",
        "development/ai-coding-record-guide",
        {
          type: "category",
          label: "后端服务",
          collapsed: true,
          items: [
            "development/backend/overview",
            "development/backend/architecture",
            "development/backend/database",
          ],
        },
        "development/agent/overview",
        {
          type: "category",
          label: "低代码引擎",
          collapsed: true,
          link: { type: "doc", id: "development/lowcode/intro" },
          items: [
            "development/lowcode/quick-start",
            "development/lowcode/guide/index",
            {
              type: "category",
              label: "核心配置",
              collapsed: true,
              link: { type: "doc", id: "development/lowcode/guide/resource-meta" },
              items: [
                "development/lowcode/guide/resource-meta",
                "development/lowcode/guide/api-definition",
                "development/lowcode/guide/data-transform",
              ],
            },
            {
              type: "category",
              label: "页面组件",
              collapsed: true,
              items: [
                "development/lowcode/guide/filters",
                "development/lowcode/guide/table",
                "development/lowcode/guide/form",
                "development/lowcode/guide/detail",
                "development/lowcode/guide/actions",
              ],
            },
            {
              type: "category",
              label: "进阶功能",
              collapsed: true,
              items: [
                "development/lowcode/guide/remote",
                "development/lowcode/guide/upload",
                "development/lowcode/guide/permissions",
                "development/lowcode/guide/page-layouts",
                "development/lowcode/guide/advanced",
              ],
            },
            "development/lowcode/guide/registration",
            "development/lowcode/guide/backend-contracts",
            "development/lowcode/guide/mock-preview",
            "development/lowcode/guide/best-practices",
            {
              type: "category",
              label: "参考",
              collapsed: true,
              items: [
                "development/lowcode/references/component-list",
                "development/lowcode/references/full-example",
              ],
            },
          ],
        },
        {
          type: "category",
          label: "模块架构概述",
          collapsed: true,
          items: [
            "development/architecture-modules/workbench",
            "development/architecture-modules/template-designer",
            "development/architecture-modules/labeler",
            "development/architecture-modules/reviewer",
            "development/architecture-modules/owner",
            "development/architecture-modules/admin",
          ],
        },
      ],
    },

    // ── 部署指南 ──
    {
      type: "category",
      label: "🚀 部署指南",
      collapsed: true,
      link: { type: "generated-index", title: "部署指南" },
      items: ["deployment/overview"],
    },
  ],
};

export default sidebars;
