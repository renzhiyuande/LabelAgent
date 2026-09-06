---
title: 自动化测试与截图教程
---

# 自动化测试与截图教程

本页对应仓库里的浏览器 smoke 自动化流程，用于复跑关键页面、自动截图并刷新截图索引。

> 封包正文：[`submission/BROWSER_AUTOMATION_TUTORIAL.md`](../../../submission/BROWSER_AUTOMATION_TUTORIAL.md)

## 你应该先看什么

1. 需要最终提交材料时，先看 [`submission/BROWSER_AUTOMATION_TUTORIAL.md`](../../../submission/BROWSER_AUTOMATION_TUTORIAL.md)
2. 需要开发侧执行入口时，直接运行 `pnpm smoke:browser`
3. 需要已经生成的产物列表时，看 [`submission/SCREENSHOT_INDEX.md`](../../../submission/SCREENSHOT_INDEX.md)

## 端口说明

| 场景 | 前端 | 后端 |
| --- | --- | --- |
| **隔离 smoke**（本教程默认） | `5176` | `8082` |
| **交付栈**（视频录制、业务 smoke） | `5174` | `8080` |

详见 [`submission/DEMO_ENVIRONMENT.md`](../../../submission/DEMO_ENVIRONMENT.md)。

## 快速执行

```bash
pnpm smoke:browser
```

默认运行时：

- frontend：`http://127.0.0.1:5176`
- api：`http://127.0.0.1:8082`
- account：`SMOKE_USERNAME` 默认 `admin`，`SMOKE_PASSWORD` 需显式传入

## 运行结果会写到哪里

- 截图：`project-docs/static/img/generated/`（浏览器 smoke）
- 演示录屏截图：`submission/media/screenshots/`（见 [`SCREENSHOT_INDEX.md`](../../../submission/SCREENSHOT_INDEX.md)）
- 报告：`project-work/contest-delivery-ops/playwright/browser-smoke-report.md`
- 机器可读索引：`project-work/contest-delivery-ops/SCREENSHOT_INDEX.md`
- 封包评审索引：[`submission/SCREENSHOT_INDEX.md`](../../../submission/SCREENSHOT_INDEX.md)

## 当前覆盖页面

- Dashboard 首页
- Owner 详情看板
- Labeler 详情看板
- Reviewer 详情看板
- Reviewer AI 队列
- Owner 数据验收
- Owner 申诉记录
- Owner 数据导出
- Owner 奖励结算
- Labeler 我的奖励

## 产物在评审中的用途

- [`SMOKE_REPORT.md`](../../../submission/SMOKE_REPORT.md)：证明 AI 预审真实闭环
- [`SCREENSHOT_INDEX.md`](../../../submission/SCREENSHOT_INDEX.md)：证明截图资产已落盘
- 本教程：证明如何在本地重新生成页面级证据

## 注意

- 这套 smoke 目标是“关键路径可见性与截图留档”，不是完整回归测试。
- 页面文案变动后，优先更新 selector，不要直接把失败页面标记为通过。
