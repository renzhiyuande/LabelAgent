# LabelHub 提交封包变更记录

本文件记录 **全仓库**（所有本地分支 + worktree）的答辩封包演进与贡献摘要，不仅限于 `master`。快照日期：**2026-06-10**。

- 全库 reachable commits：≈362（`master` 311 · `submission` 316 · `explore/base` 107）
- 开发周期：2026-05-20 → 2026-06-10（≈3 周）
- 本地分支：22 · 活跃 worktree：10（另有若干 detached / prunable）

---

## 贡献总结

### 项目定位

LabelHub 是一套 **Monorepo 数据标注 + AI 辅助审核平台**，覆盖 Owner 任务生产、Labeler 标注执行、Reviewer 多级审核与 Admin 系统治理，并以 **Java 后端 + React 低代码引擎 + Python Agent** 三层架构落地赛题要求。

### 核心贡献一览

| 维度 | 贡献摘要 | 关键证据 |
| --- | --- | --- |
| **三角色业务闭环** | Owner 建任务/模板/发布/验收/导出；Labeler 领任务/作答/草稿/提交；Reviewer AI 队列 + 人工审核池 + 结果查询 | `project-docs/docs/business/*`、演示视频 17 段分镜 |
| **AI 自动预审 Agent** | DeepSeek 驱动异步预审；Outbox → AsyncTask → Python Agent；结构化输出写回审核记录 | `SMOKE_REPORT.md`、`DeepseekAiReviewLiveIT`、`test_ai_review_deepseek_live.py` |
| **低代码 + 模板设计器** | Schema 驱动 CRUD；18 种表单组件；LLM Chat / Agent 标注辅助 | `packages/low-code-engine`、`template-designer` 文档 |
| **AI 质检可观测** | Owner 预审质检大屏、审核台、成本估算与健康聚合 | `AiReviewObservabilityBoard`、health dashboard 系列 commit |
| **工程与交付** | Docker 一键栈、OpenAPI 静态导出、Playwright smoke、文档站 Docusaurus | `submission/api/*`、`BROWSER_AUTOMATION_TUTORIAL.md` |
| **AI Coding 可审性** | Cursor session 清洗 → narrative 导出 → IDE 式三栏浏览器 | `project-docs/docs/contest/ai-coding-record.mdx`、`submission/ai-coding-records/` |

### 赛题提交物完成度（第 8 章 3–6 项）

| # | 要求 | 交付物 | 状态 |
| --- | --- | --- | --- |
| 3 | 演示视频 5–10 分钟，三角色完整链路 | `submission/media/labelhub-demo-final.mp4`（≈6min04s）+ 17 段分镜 + 32 张截图 | **已完成** |
| 4a | 架构图、关键技术、Demo 截图 | 文档站架构/开发指南 + `static/img/demo/` + `SCREENSHOT_INDEX.md` | **已完成** |
| 4b | AI Coding 过程记录 | IDE 浏览器 + `AI_CODING_RECORD.md` + `ai-coding-records/` 证据包 | **已完成** |
| 5 | 可访问演示环境说明 | `DEMO_ENVIRONMENT.md`（本地栈已写；**云平台 URL 待部署**） | **部分完成** |
| 6 | API 文档 | `submission/api/*.json|yaml` + Knife4j 说明（**在线 URL 待部署**） | **部分完成** |

### 已验证的关键能力（可答辩引用）

- 真实业务样本 `submissionId=2062558061695012865`，AI 预审最终 `AI_PASSED`（DeepSeek）
- Backend replay gate：`DeepseekAiReviewLiveIT` 本机 3/3 通过
- Python Agent live：`test_ai_review_deepseek_live.py` 已通过
- 文档站 `pnpm build` 通过；AI Coding Record 交互页可本地浏览

### 技术亮点（答辩可强调）

1. **契约先行**：数据库迁移、OpenAPI、Agent YAML、权限码先于 UI 铺主链
2. **异步 AI 预审**：提交与 Agent 调用解耦，失败可重试、状态可追溯
3. **低代码 + Agent 双轨**：管理后台 Schema 驱动；标注侧 LLM 结构化参考（手动应用到字段）
4. **过程可审**：AI Coding 非事后摘要，而是可交互浏览的 session 证据链
5. **交付工程化**：smoke 脚本、OpenAPI 导出 manifest、演示视频 Playwright 分段流水线

### 仍待部署后补齐

- 公网演示环境 URL → `DEMO_ENVIRONMENT.md`
- 在线 Swagger / Knife4j URL → `API_DOCS.md`

---

## Git 贡献统计

> 统计口径：`git log --no-merges`，快照 **2026-06-10**。代码行数不含 `ai-coding-record` JSON、截图、mp4、seed 大文件。

### 总体概览

| 指标 | 数值 |
| --- | --- |
| 全库 commits（去 merge） | **350** |
| `master` commits | **311** |
| `submission` commits | **316**（领先 master **5**） |
| `explore/base` commits | **107**（已全部合入 master） |
| 开发周期 | 2026-05-20 → 2026-06-10 |
| `master` 代码变更（估算） | **+366,464 / −97,618** 行（≈2,619 文件次） |

### 按月份（全分支）

| 月份 | Commits |
| --- | --- |
| 2026-05 | 82 |
| 2026-06 | 268 |

### 按作者（全分支，去 merge）

| 作者 | Commits | 主要参与 |
| --- | --- | --- |
| **wangqiyan** | **340**（97%） | 全栈：`master` 303 · `explore/base` 105 · 文档/答辩/AI Coding |
| 任哈哈 | 6 | `agent-service` 早期原型（Agent 推理、队列指标，未合入 master） |
| 竹晓 | 3 | 早期 `agent_1.0_lin` submodule 探索（未合入 master） |
| yanyanhenxian | 1 | 早期协作 commit |

### 按 commit 类型（`master`）

| 类型 | 数量 |
| --- | --- |
| feat | 144 |
| fix | 40 |
| refactor | 39 |
| docs | 23 |
| chore | 13 |
| test | 10 |
| 其他 | 42 |

### 按分支（commits 总量）

| 分支 | Commits | 相对 master | 说明 |
| --- | --- | --- | --- |
| `master` | 311 | — | 当前产品主线 |
| `submission` | 316 | +5 | 答辩封包（文档 / 媒体 / IDE） |
| `explore/base` | 107 | 已合入 | 平台基线（见专节） |
| `fix/deepseek-review-fixes` | 162 | 已合入 | 文档 + 低代码类型化 |
| `codex/runtime-deploy-merged` | 326 | +18 | Docker 部署 hardened |
| `agent/stateless-core` | 121 | 未合入 | 无状态 Agent 重构线 |

### 变更最集中的目录（`master` Top 10）

| 目录 | 变更文件次数 |
| --- | --- |
| `frontend/src/low-code/schema/resources` | 250 |
| `frontend/src/low-code-resources` | 218 |
| `frontend/src/low-code/utils` | 195 |
| `packages/low-code-engine/src/components/fields/controls` | 118 |
| `backend/host-infra/.../business` | 104 |
| `backend/host-core/.../business` | 109 |
| `backend/host-app/.../db/migration` | 89 |
| `frontend/src/features/template-designer` | 85+ |
| `frontend/src/features/review/workbench` | 75 |
| `project-work/contest-delivery-ops` | 84 |

### 复现命令

```bash
# 作者统计
git shortlog -sn --all --no-merges

# 分支 commit 数
git rev-list --count master
git rev-list --count refs/heads/submission
git rev-list --count explore/base

# master 领先/落后
git rev-list --count master..refs/heads/submission   # submission 独有
git rev-list --count refs/heads/submission..master   # master 独有

# 按作者（master）
git rev-list --count --no-merges master --author="wangqiyan"
```

---

## [封包 v1.1] — 2026-06-10

### 新增

- **赛题提交物文档站索引**：`project-docs/docs/contest/submission/`
  - index — 3–6 项导航
  - demo-video — 17 段分镜说明
  - related-docs — 架构 / 业务 / 截图
  - ai-coding-record — 索引 → IDE 页
  - demo-environment — 本地 / 云平台
  - api-docs — 静态 OpenAPI + Swagger 占位
- **AI Coding Record IDE 浏览器**：`/contest/ai-coding-record`
  - Cursor 编辑机样式：Sessions 树 · 对话流 · 阶段/模块/模型元数据
  - `AiCodingRecordDashboard.tsx` + `static/ai-coding-record/`（≈15MB narrative 数据）
  - 维护指引：`development/ai-coding-record-guide.md`
- **演示媒体封包**：`submission/media/`（≈39MB）
  - `labelhub-demo-final.mp4` — 成片 ≈6 分 04 秒
  - `segments/` — 19 段带配音分镜
  - `screenshots/` — 32 张三角色页面截图
  - `chapter-cards/` — 33 张章节过渡卡片
  - 文档站镜像：`project-docs/static/img/demo/`
- **文档站品牌资源**：`logo.svg` · `logo-dark.svg` · `favicon.svg`
- **业务指南统一排版**
  - Owner 01–08 分章；Labeler 01–03；Reviewer 01–03
  - 统一结构：场景概述 → 操作步骤 → 流程图 → 规则 → FAQ → 关联文档
  - 嵌入 `static/img/demo/screenshots/` 演示截图

### 变更

- `submission/README.md` — 按赛题 3–6 重排；链入 CHANGELOG
- `submission/AI_CODING_RECORD.md` — 答辩摘要 + 指向 IDE 页
- Owner `overview.md` — 由 400+ 行合集改为导航页
- `project-docs/sidebars.ts` — 「提交物（→ submission/）」+ AI Coding Record 顶栏入口

### 修复

- 文档站 navbar logo 404（配置引用但静态文件缺失）
- 合并 master：React Router 重复打包导致菜单崩溃；LLM Agent 映射与 UI

### 工程

- `.gitignore` 增加 `deploy/artifacts/`（本地构建产物不入 Git）

### 待办

- [ ] 云平台演示 URL
- [ ] 在线 Swagger URL
- [ ] 接口变更后 `pnpm delivery:openapi`

---

## [封包 v1.0] — 2026-06-09

### 新增

| 文件 / 目录 | 用途 |
| --- | --- |
| `REQUIREMENT_MATRIX.md` | 赛题第四章 / 第七章 / 第八章要求映射 |
| `VERIFICATION_STATUS.md` | 实现 vs 验证边界（避免过度宣称） |
| `SMOKE_REPORT.md` | 真实 AI 预审业务留档 |
| `BROWSER_AUTOMATION_TUTORIAL.md` | Playwright 浏览器 smoke |
| `DEMO_ENVIRONMENT.md` / `API_DOCS.md` | 环境与 API 说明 |
| `api/labelhub-openapi-public.json` | 公开 API 静态导出 |
| `api/pyagent-ai-review.openapi.yaml` | Agent 契约 |
| `api/EXPORT_MANIFEST.md` | OpenAPI 校验清单 |
| `project-docs/docs/contest/overview.md` | 文档站赛题专区 |

---

## 分支与 Worktree 全览

> 生成命令参考：`git worktree list`、`git branch -a`、`git rev-list --count master..<branch>`

### Worktree ↔ 分支对照

| Worktree 路径 | 分支 | 相对 master | 说明 |
| --- | --- | --- | --- |
| `~/Desktop/java/labelhub-deepseek-review` | **`submission`** | +5 | **答辩封包主线**（文档 / 媒体 / AI Coding IDE） |
| `~/Desktop/java/label-hub` | `fix/deepseek-review-fixes` | 已合入 | 低代码文档大修、LLM suggest、Docusaurus 搜索 |
| `~/.codex/worktrees/1683/...` | `codex/ai-record-filtering` | +1 | AI Coding narrative 导出 + IDE 仪表盘（e191b21e） |
| `~/.codex/worktrees/910f/...` | `codex/ai-prereview-e2e` | 已合入 | AI 预审 E2E 集成线（合并 dashboard + contest-docs） |
| `~/.codex/worktrees/910f/.../contest-docs-delivery` | `codex/contest-docs-delivery` | 已合入 | 初版 submission 封包 + smoke 留档 |
| `~/.codex/worktrees/910f/.../dashboard-and-qa` | `codex/dashboard-and-qa` | 已合入 | Dashboard 交付切片 + 本地交付看板 `:3001` |
| `~/.codex/worktrees/bba4/...` | `codex/runtime-deploy` | +6 | 运行时部署自动化 + 评委引导助手 |
| `~/.codex/worktrees/cbc1/label-hub` | `codex/low-code-fixes` | +1 | 低代码表单校验与抽屉滚动修复 |
| `~/.codex/worktrees/07a3/...` | `codex/labelhub-deepseek-review` | 已合入 | 后端契约 / 低代码 API 文档 / i18n 基建 |
| `/private/tmp/label-hub-base-merge` | `codex/base-merge-low-code-fixes` | 已合入 | 低代码 fixes 合并基线（prunable） |

其余 worktree 多为 **detached HEAD**（临时 checkout，无独立分支线）。

### 已合入 `master` 的分支线

| 分支 | 主题 | 代表贡献 |
| --- | --- | --- |
| `explore/base` | **平台基线（107 commits，已全部合入 master）** | 见下方 [explore/base 专节](#explorebase-平台基线分支) |
| `low-code-package` | 低代码引擎包 | `@labelhub/low-code-engine` 资产适配、构建修复 |
| `fix/merge-low-code-package` | 低代码合入 | Profile 页、Sonner toast z-index、低代码包 merge |
| `feature/reviewer-multi-level-audit` | 多级审核 | 审核记录详情、审核级别选项、Labeler 工作台文档 |
| `feature/reviewer-merge-low-code-package` | 审核 + 低代码 | 上述两线合并 |
| `fix/deepseek-review-fixes` | DeepSeek 评审修复 | 低代码类型 union 细化、业务错误码 i18n、文档站全文搜索 |
| `codex/labelhub-deepseek-review` | 文档契约 | 后端数据契约、低代码 API 定义、注册页快照文档 |
| `codex/dashboard-and-qa` | Dashboard QA | Owner AI Review 工作区、交付看板、Dashboard 切片验证 |
| `codex/contest-docs-delivery` | 赛题文档 | submission 初版、真实 AI 预审 smoke 记录 |
| `codex/ai-prereview-e2e` | E2E 集成 | 合并 dashboard + contest-docs + AI 预审 blocker 状态 |
| `codex/base-merge-low-code-fixes` | 低代码 merge | 表单校验、抽屉滚动（与 `codex/low-code-fixes` 同源） |

### 未合入 `master` 的分支线

| 分支 | 领先 master | 主题 | 备注 |
| --- | --- | --- | --- |
| **`submission`** | 5 | 答辩封包 v1.1 | 当前打包分支；含 v1.0 + 文档/media/IDE 恢复 |
| `codex/ai-record-filtering` | 1 | AI Coding IDE 原始提交 | 内容已 cherry-pick 进 `submission`（e7ff80e9） |
| `codex/runtime-deploy` | 6 | 运行时部署 | seed/fresh 模式、评委引导助手、部署脚本 |
| `codex/runtime-deploy-merged` | 18 | Docker 部署 hardened | Nginx / MySQL seed / docs Dockerfile / npm registry |
| `codex/low-code-fixes` | 1 | 低代码 UI fix | 表单校验 + 抽屉滚动（待 merge） |
| `agent-service` | 6 | 早期 Agent 服务 | 独立 agent-service 原型（后被 monorepo agent 替代） |
| `agent/stateless-core` | 11 | 无状态 Agent 核心 | `/v1/ai-review` 契约、ReviewEngine 抽取 |
| `explore/architecture` | 1 | 架构探索（**未合入**） | 仅 Initial commit + .gitignore；与 `explore/base` 无关 |

### 远程分支（`origin/*`，与本地 largely 对应）

`master`、`submission`、`explore/base`、`fix/deepseek-review-fixes`、`low-code-package`、`feature/reviewer-multi-level-audit`、`codex/runtime-deploy-merged`、`agent-service` 等 — 答辩以本地 **`submission`** 为准。

---

## explore/base — 平台基线分支

> **状态**：已全部合入 `master`（`git rev-list master..explore/base` = 0）  
> **Tip**：`5a4ccb25`（2026-06-04）· **Commits**：107 · **Worktree**：无（仅本地分支引用）

`explore/base` 是 LabelHub Monorepo 的 **主开发基线**，早于 `master` 上的大部分 feature 分支。当前 `master` 的三角色 CRUD、低代码引擎、Workbench 框架等主要能力均源自此线。

### 按能力域归纳

| 能力域 | 代表 commit / 主题 |
| --- | --- |
| **Owner 后台** | 任务 pause/resume/删除、批量分配 cancel/reopen、验收/导出/奖励资源、模板市场安装 |
| **Labeler 工作台** | 草稿/提交历史 API、申诉、任务管理增强、`submittedEverCount` 指标 |
| **Reviewer 审核** | 审核池分组列表（`5a4ccb25`）、审核池检索增强 |
| **内部 API** | 样本/奖励详情（`c001b929`）、远程 LLM 模型列表（`ccdfdcc0`） |
| **低代码引擎** | LHResourcePage、表单字段共享组件、remote tree select、字典/角色查询增强 |
| **模板设计器** | 迁移 template-designer、SchemaDataView / PayloadPanel 分区重构 |
| **Workbench** | workbench2 Labeler slots、布局区域简化、legacy workbench 移除 |
| **认证与权限** | AdminSafetyGuard、菜单/权限 SQL 迁移、角色 ID 一致性 |
| **工程基建** | crane4j 集成、Long ID 字符串序列化、插件功能、.gitignore 规范 |

### 与后续分支的关系

```
explore/base (107 commits, 平台基线)
    ├── → master（AI 预审 / 可观测性 / LLM Agent 等后续增量）
    ├── fix/deepseek-review-fixes（文档 + 低代码类型化，已合入）
    ├── low-code-package → feature/reviewer-*（低代码包 + 多级审核，已合入）
    └── codex/* / submission（交付 / 答辩 / 部署，部分未合入）
```

### 如何本地查看

```bash
git log explore/base --oneline --no-merges -20
git log master..explore/base          # 应为空（已全部合入）
git show 5a4ccb25                   # 审核池分组列表
git show ccdfdcc0                   # 远程 LLM 模型内部 API
```

**对比 `explore/architecture`**：后者仅 1 个 commit 超前于 master（仓库骨架 + .gitignore），是早期试探分支，**不是** `explore/base` 的前身；平台主体开发在 `explore/base` 完成。

---

## 全分支产品贡献时间线（按领域）

以下为 **所有分支** 上的主要能力演进归纳（含已合入与未合入分支）。

### Agent 服务线（`agent-service` → `agent/stateless-core` → monorepo `agent/`）

| 阶段 | 分支 | 贡献 |
| --- | --- | --- |
| 原型 | `agent-service` | 独立 FastAPI 服务、队列吞吐指标、LLM 测试接入 |
| 重构 | `agent/stateless-core` | 无状态 ReviewEngine、`/v1/ai-review` 与后端契约对齐 |
| 生产 | `master` | DeepSeek live、YAML 契约、`test_ai_review_deepseek_live.py` |

### 平台基线（`explore/base` → `master`）

| 贡献 | 说明 |
| --- | --- |
| Owner 任务/分配/验收/导出/模板市场 | 三角色后台 CRUD 主体 |
| Labeler 草稿/提交/申诉/工作台 | 标注主链 API 与 UI |
| Reviewer 审核池分组 | `5a4ccb25` |
| 低代码 + 模板设计器 + Workbench2 | Schema 驱动页面与工作台框架 |
| 权限 / 菜单 / 认证 | SQL seed + AdminSafetyGuard |

### 低代码 / 模板设计器线（`low-code-package`、`fix/*`、`codex/low-code-fixes`）

| 贡献 | 来源分支 |
| --- | --- |
| `@labelhub/low-code-engine` 包化与 asset adapter | `low-code-package` |
| ResourcePage workflow、record templates、JSON 编辑器高亮 | `master` / `fix/deepseek-review-fixes` |
| 表单校验、抽屉滚动、FilterOperator 类型 union | `codex/low-code-fixes`、`fix/deepseek-review-fixes` |
| 模板设计器预览抽屉、审核配置 session 稳定 | `master` |

### 审核 / AI 预审线（`feature/reviewer-*`、`codex/dashboard-and-qa`、`codex/ai-prereview-e2e`）

| 贡献 | 来源分支 |
| --- | --- |
| 多级审核、审核记录详情、审核级别选项 | `feature/reviewer-multi-level-audit` |
| Owner AI Review 工作区、质检大屏、可观测性 | `codex/dashboard-and-qa` → `master` |
| Prompt 健康、校准透明度、DeepSeek 默认 | `master` |
| AI 预审 E2E blocker 跟踪与 smoke 留档 | `codex/ai-prereview-e2e`、`codex/contest-docs-delivery` |

### 交付 / 部署线（`codex/runtime-deploy`、`codex/runtime-deploy-merged`）

| 贡献 | 分支 |
| --- | --- |
| seed / fresh 双运行时模式、评委引导助手 | `codex/runtime-deploy` |
| Docker 一键栈、双库 seed 重导入、Nginx 路由 | `codex/runtime-deploy-merged` |
| `deploy/artifacts/` 本地构建产物 | 运行时生成（已 `.gitignore`） |

### 文档 / 答辩线（`fix/deepseek-review-fixes`、`codex/contest-*`、`submission`）

| 贡献 | 分支 |
| --- | --- |
| Docusaurus 文档站重建、全文搜索、业务指南 | `fix/deepseek-review-fixes` |
| submission 初版、REQUIREMENT_MATRIX、SMOKE_REPORT | `codex/contest-docs-delivery` |
| AI Coding IDE 浏览器 + narrative 证据 | `codex/ai-record-filtering` → `submission` |
| 演示视频 / 截图封包、业务指南统一排版 | **`submission` v1.1** |

### 2026-06 近期（`master` + `submission`）

| 日期 | 分支 | 贡献 |
| --- | --- | --- |
| 06-10 | `submission` | 封包 v1.1：媒体、IDE 浏览器、业务截图、logo |
| 06-10 | `master` | LLM Agent UI；React Router dedupe |
| 06-09 | `codex/ai-record-filtering` | AI Coding narrative 管线 |
| 06-09 | `codex/runtime-deploy` | 部署自动化 + 引导助手 |
| 06-08 | `codex/*` | Dashboard QA、contest docs、AI prereview E2E |

---

## 封包文件清单（v1.1）

```
submission/
├── README.md                 # 提交总览
├── CHANGELOG.md              # 本文件
├── REQUIREMENT_MATRIX.md     # 要求映射
├── VERIFICATION_STATUS.md    # 验证状态
├── DEMO_VIDEO.md             # 演示视频说明
├── DEMO_ENVIRONMENT.md       # 演示环境
├── API_DOCS.md               # API 文档入口
├── AI_CODING_RECORD.md       # AI Coding 摘要
├── RELATED_DOCS.md           # 相关文档导航
├── SCREENSHOT_INDEX.md       # 截图索引
├── SMOKE_REPORT.md           # AI 预审 smoke
├── BROWSER_AUTOMATION_TUTORIAL.md
├── media/                    # 视频 + 截图 + 分镜
├── api/                      # OpenAPI 静态件
└── ai-coding-records/        # Session 证据包
```

---

## 版本对照

| 封包 / 基线 | Git | 分支 | 说明 |
| --- | --- | --- | --- |
| **封包 v1.1** | `19403fc0` | `submission` | 文档 / 媒体 / AI Coding IDE 完整交付 |
| 封包 v1.0 | `463c4899` | `codex/runtime-deploy` 等 | 初版 submission 与 OpenAPI 导出 |
| 产品基线 | `93d57147` | `master` | LLM Agent + 路由修复最新 |
| **平台基线** | `5a4ccb25` | `explore/base` | 107 commits，已全部合入 master |
| AI Coding IDE 源 | `e191b21e` | `codex/ai-record-filtering` | narrative 管线原始提交 |
| 部署 hardened | `48c37509` | `codex/runtime-deploy-merged` | Docker 部署 18 commits 领先 master |

---

## 评审建议路径

1. [REQUIREMENT_MATRIX.md](./REQUIREMENT_MATRIX.md) — 功能是否覆盖赛题
2. [VERIFICATION_STATUS.md](./VERIFICATION_STATUS.md) — 哪些已验证、哪些未宣称
3. `media/labelhub-demo-final.mp4` — 三角色演示视频
4. 文档站 `/contest/ai-coding-record` — AI Coding 过程浏览器
5. [SMOKE_REPORT.md](./SMOKE_REPORT.md) — AI 预审真实样本
