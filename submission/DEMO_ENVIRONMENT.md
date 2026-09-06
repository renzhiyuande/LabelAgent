# LabelHub Demo Environment

本页对应赛题 **「可访问的演示环境说明文档（任意云平台部署）」**。

文档站：[project-docs/docs/contest/submission/demo-environment.md](../project-docs/docs/contest/submission/demo-environment.md)

**封包基线：2026-06-10**

## 云平台可访问演示（待部署）

> **当前尚未部署公网环境，以下字段留空；部署后回填，不影响封包其他材料就绪度。**

| 项 | 值 |
| --- | --- |
| 云平台 | _（待填）_ |
| 访问 URL | _（待填）_ |
| 前端入口 | _（待填，如 `https://<host>/admin/`）_ |
| API 基址 | _（待填）_ |
| Knife4j / Swagger | _（待填，如 `https://<host>/doc.html`）_ |
| 演示账号 | _（待填）_ |
| 部署方式 | 见根目录 `scripts/docker-deploy.sh`、`project-docs/docs/deployment/overview.md` |

## 本地 / 局域网演示（当前可用）

### 一键启动

```bash
pnpm delivery:stack:up
pnpm delivery:stack:status
pnpm delivery:stack:down   # 结束
```

macOS 下脚本会尝试自动拉起 Docker Desktop。

### 组件地址（交付栈）

| 组件 | 地址 |
| --- | --- |
| 前端 | `http://127.0.0.1:5174` |
| 后端 | `http://127.0.0.1:8080` |
| API 文档 | `http://127.0.0.1:8080/doc.html` |
| Python Agent | `http://127.0.0.1:8000` |
| 交付看板 | `http://127.0.0.1:3001` |

基础设施：根目录 `docker-compose.yml`（MySQL / Redis / MinIO）。

### 端口说明（避免混淆）

| 场景 | 前端 | 后端 | 启动方式 |
| --- | --- | --- | --- |
| **交付栈**（视频录制、业务 smoke、答辩演示） | `5174` | `8080` | `pnpm delivery:stack:up` |
| **隔离 smoke / OpenAPI 导出** | `5176` | `8082` | `pnpm smoke:browser`、`pnpm delivery:openapi` |

Playwright smoke 教程见 [BROWSER_AUTOMATION_TUTORIAL.md](./BROWSER_AUTOMATION_TUTORIAL.md)。

### 演示账号（seed）

| 用户 | 角色 |
| --- | --- |
| `seed_owner` | Owner |
| `seed_labeler_ben` | Labeler |
| `seed_reviewer_lin` | Reviewer（L1） |

密码：`admin123`

> 真实 AI 预审 smoke 样本使用 `admin` 多角色账号提交，见 [SMOKE_REPORT.md](./SMOKE_REPORT.md)。

## 已验证环境事实

- 真实 smoke：`8080` + Agent `8000` + Frontend `5174`（见 [SMOKE_REPORT.md](./SMOKE_REPORT.md)）
- Replay gate：`DeepseekAiReviewLiveIT` 本机 3/3 通过
- 演示视频：在 `5174` 录制（见 [DEMO_VIDEO.md](./DEMO_VIDEO.md)）

## AI 预审演示前检查

1. Provider / Model 为 `deepseek / deepseek-v4-flash`
2. `LABELHUB_AES_KEY` 可解密 DeepSeek API Key
3. Agent live 与 Backend replay gate 已通过
4. 业务演示优先引用 [SMOKE_REPORT.md](./SMOKE_REPORT.md) 中的真实 ID
