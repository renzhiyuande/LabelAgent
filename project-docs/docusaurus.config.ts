import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import type { Options as RedirectsOptions } from "@docusaurus/plugin-client-redirects";

const config: Config = {
  title: "LabelHub 项目文档",
  tagline: "数据标注与 AI 辅助审核平台",
  favicon: "img/favicon.svg",

  url: "https://labelhub.example.com",
  baseUrl: "/",

  organizationName: "labelhub",
  projectName: "labelhub-docs",

  onBrokenLinks: "warn",
  onBrokenMarkdownLinks: "warn",

  i18n: {
    defaultLocale: "zh-CN",
    locales: ["zh-CN"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl: undefined,
          routeBasePath: "/",
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      "@easyops-cn/docusaurus-search-local",
      {
        indexPages: false,
        indexBlog: false,
        searchBarPosition: "right",
        language: "zh",
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: false,
        searchResultLimits: 12,
      },
    ],
    [
      "@docusaurus/plugin-client-redirects",
      {
        createRedirects: function (existingPath: string) {
          // /lowcode/* → /development/lowcode/*
          if (existingPath.startsWith("/development/lowcode/")) {
            return [existingPath.replace("/development/lowcode/", "/lowcode/")];
          }
          return [];
        },
        redirects: [
          // 旧顶层路径 → 新 development/ 路径
          { from: "/backend/overview", to: "/development/backend/overview" },
          { from: "/agent/overview", to: "/development/agent/overview" },
          { from: "/workbench/overview", to: "/development/architecture-modules/workbench" },
          { from: "/template-designer/overview", to: "/development/architecture-modules/template-designer" },
          // 旧业务路径 → 新 business/ 路径
          { from: "/labeler/overview", to: "/business/labeler/overview" },
          { from: "/reviewer/overview", to: "/business/reviewer/overview" },
          { from: "/admin/overview", to: "/business/admin/overview" },
          { from: "/owner/overview", to: "/business/owner/overview" },
        ],
      } satisfies RedirectsOptions,
    ],
  ],

  themeConfig: {
    image: "img/logo.svg",
    navbar: {
      title: "LabelHub 项目文档",
      logo: {
        alt: "LabelHub",
        src: "img/logo.svg",
        srcDark: "img/logo-dark.svg",
        href: "/intro",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "projectSidebar",
          position: "left",
          label: "文档",
        },
        {
          href: "https://github.com/labelhub/labelhub",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "项目",
          items: [
            { label: "项目概览", to: "/intro" },
            { label: "整体架构", to: "/architecture" },
            { label: "快速启动", to: "/quick-start" },
          ],
        },
        {
          title: "业务指南",
          items: [
            { label: "任务负责人（Owner）", to: "/business/owner/overview" },
            { label: "标注员（Labeler）", to: "/business/labeler/overview" },
            { label: "审核员（Reviewer）", to: "/business/reviewer/overview" },
            { label: "系统管理员（Admin）", to: "/business/admin/overview" },
          ],
        },
        {
          title: "开发指南",
          items: [
            { label: "环境搭建", to: "/development/setup" },
            { label: "开发规范", to: "/development/conventions" },
            { label: "后端服务", to: "/development/backend/overview" },
            { label: "Python Agent", to: "/development/agent/overview" },
            { label: "低代码引擎", to: "/development/lowcode/intro" },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} LabelHub. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["typescript", "json", "bash"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
