# Browser Automation Tutorial

本页说明如何在本地复跑 LabelHub 的浏览器 smoke、自动截图与截图索引刷新流程。目标不是替代完整 E2E 回归，而是稳定复核“关键页面能打开、认证态可进入、核心元素已渲染、截图已落盘”。

> **端口说明**：本教程默认使用隔离栈 `5176`/`8082`，与交付栈 `5174`/`8080`（视频录制、业务 smoke）不同。详见 [DEMO_ENVIRONMENT.md](./DEMO_ENVIRONMENT.md)。

## 入口命令

```bash
pnpm smoke:browser
```

脚本入口会：

1. 登录后台
2. 依次访问预设业务页面
3. 等待关键 selector 出现
4. 保存截图到 `project-docs/static/img/generated/`
5. 刷新 `project-work/contest-delivery-ops/SCREENSHOT_INDEX.md`
6. 生成 JSON / Markdown 报告

## 默认运行时

- Frontend：`http://127.0.0.1:5176`
- API：`http://127.0.0.1:8082`
- 用户名：默认读取 `SMOKE_USERNAME`，未设置时为 `admin`
- 密码：必须通过 `SMOKE_PASSWORD` 显式传入

如果你的本地栈跑在主端口，也可以覆盖：

```bash
FRONTEND_BASE_URL=http://127.0.0.1:5173 \
API_BASE_URL=http://127.0.0.1:8080 \
SMOKE_PASSWORD='your-password' \
pnpm smoke:browser
```

## 运行前提

运行前需要满足以下前提：

1. 后端可登录，且 `/api/v1/auth/login` 正常返回 token
2. 前端页面可访问
3. Playwright Chromium 已安装，或本机存在可复用浏览器
4. 本地账号具备 Admin / Owner / Reviewer / Labeler 入口权限

首次准备浏览器：

```bash
npx playwright install chromium
```

## 环境变量

常用覆盖参数：

- `FRONTEND_BASE_URL`
- `API_BASE_URL`
- `SMOKE_USERNAME`
- `SMOKE_PASSWORD`
- `SMOKE_TIMEOUT_MS`
- `SMOKE_WAIT_AFTER_LOAD_MS`
- `SMOKE_AUTH_MODE`
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`
- `REFRESH_SCREENSHOT_INDEX`

认证模式说明：

- `SMOKE_AUTH_MODE=api`
  - 先走登录接口，再把 token 注入浏览器本地存储
  - 适合前端依赖后端 token、但不想每次走登录页动画
- `SMOKE_AUTH_MODE=ui`
  - 直接打开 `/login` 做一次真实登录
  - 适合依赖前端代理、前端登录逻辑或本地存储结构发生变化时

## 产物位置

- 截图目录：`project-docs/static/img/generated/`
- Markdown 报告：`project-work/contest-delivery-ops/playwright/browser-smoke-report.md`
- JSON 报告：`project-work/contest-delivery-ops/playwright/browser-smoke-report.json`
- 本地索引：`project-work/contest-delivery-ops/SCREENSHOT_INDEX.md`
- Submission 索引：`submission/SCREENSHOT_INDEX.md`

## 默认覆盖页面

- `/`
- `/dashboard/owner`
- `/dashboard/labeler`
- `/dashboard/reviewer`
- `/reviewer/ai-queue`
- `/owner/acceptances`
- `/owner/appeals`
- `/owner/exports`
- `/owner/settlements`
- `/labeler/my-rewards`

## 如何新增一个 smoke 页面

1. 在 `project-work/contest-delivery-ops/playwright/browser-smoke.config.json` 增加路由项
2. 为该路由配置稳定 selector
3. 重新执行 `pnpm smoke:browser`
4. 确认新截图已写入 `project-docs/static/img/generated/`
5. 确认索引与 Markdown 报告已刷新

选择 selector 的原则：

- 优先选页面标题、breadcrumb、主按钮、关键卡片标题
- 避免选会频繁变化的统计数字
- 避免选只在 hover 或抽屉内出现的瞬时元素

## 常见问题

### 登录成功但页面跳回登录页

- 优先检查 `API_BASE_URL` 是否与当前前端代理一致
- 若使用代理模式，改用 `SMOKE_AUTH_MODE=ui`

### 页面能打开但 selector 一直等不到

- 大概率是页面文案或结构已改
- 先打开 `browser-smoke-report.md` 看失败页面
- 再更新该路由对应 selector，而不是盲目延长 timeout

### 截图生成了，但索引没刷新

- 检查是否设置了 `REFRESH_SCREENSHOT_INDEX=0`
- 若是手工调试截图，最后应再跑一次默认命令刷新索引

### 本机没有仓库内的 Playwright 依赖

- 脚本会优先复用本机缓存
- 若缓存不可用，再执行 `pnpm install` / `npx playwright install chromium`

## 与提交包的关系

- `SMOKE_REPORT.md` 记录真实 AI 预审业务闭环证据
- 本教程负责说明“如何重复生成页面级 smoke 与截图证据”
- `SCREENSHOT_INDEX.md` 负责列出已经落盘的截图产物

三者配合后，评审可以分别查看：

1. 业务闭环是否真实发生
2. 页面是否真实可见
3. 截图和报告是否可重复生成
