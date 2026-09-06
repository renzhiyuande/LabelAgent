---
title: API 文档
---

# API 文档

> 封包正文：[`submission/API_DOCS.md`](../../../../submission/API_DOCS.md)

## 在线 Swagger / Knife4j（Web 形式，待部署）

> **公网演示环境尚未部署，在线文档 URL 留空。部署后应指向 Knife4j 页面。**

| 环境 | Knife4j 入口 | OpenAPI JSON |
| --- | --- | --- |
| 公网演示 | _（待填，如 `https://demo.example.com/doc.html`）_ | _（待填 `/v3/api-docs/public`）_ |
| 本地开发 | `http://localhost:8080/doc.html` | `http://localhost:8080/v3/api-docs/public` |

Knife4j 配置：`backend/host-app/src/main/resources/application.yml` · 分组：`OpenApiConfiguration.java`（`public` / `internal`）。

## 已随封包导出的静态契约（离线可审）

| 文件 | 说明 |
| --- | --- |
| [`submission/api/labelhub-openapi-public.json`](../../../../submission/api/labelhub-openapi-public.json) | 业务 API（`/api/**`） |
| [`submission/api/labelhub-openapi-internal.json`](../../../../submission/api/labelhub-openapi-internal.json) | 内部 API（`/internal/**`） |
| [`submission/api/pyagent-ai-review.openapi.yaml`](../../../../submission/api/pyagent-ai-review.openapi.yaml) | Python Agent AI 预审契约 |
| [`submission/api/EXPORT_MANIFEST.md`](../../../../submission/api/EXPORT_MANIFEST.md) | 导出时间、路径数、SHA256 |

可将 public JSON 导入 **Postman / Apifox / Swagger Editor** 进行交互调试；无需在线环境即可审阅接口面。

## Python Agent

- 契约源文件：`backend/docs/contracts/pyagent-ai-review.openapi.yaml`
- 本地 Swagger UI（若启用）：启动 Agent 后访问其 `/docs`（以 Agent 实际配置为准）

## 重新导出（接口变更后）

```bash
# 默认：交付栈 8080
pnpm delivery:openapi

# 隔离栈 8082
LABELHUB_OPENAPI_BASE_URL=http://127.0.0.1:8082 pnpm delivery:openapi
```

更新 `submission/api/` 与 `EXPORT_MANIFEST.md`。
