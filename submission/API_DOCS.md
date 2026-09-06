# LabelHub API Docs

本页对应赛题 **「API 文档（Postman Collection / Swagger / Markdown 等）」**。

文档站：[project-docs/docs/contest/submission/api-docs.md](../project-docs/docs/contest/submission/api-docs.md)

**封包基线：2026-06-10**

## 在线 Swagger / Knife4j（Web，待部署）

> **公网演示未部署，URL 留空；部署后回填。本地 Knife4j 已可用。**

| 环境 | Knife4j | OpenAPI JSON |
| --- | --- | --- |
| 公网演示 | _（待填）_ | _（待填 `/v3/api-docs/public`）_ |
| 本地交付栈 | [http://localhost:8080/doc.html](http://localhost:8080/doc.html) | `/v3/api-docs/public`、`/v3/api-docs/internal` |
| 本地隔离栈 | `http://localhost:8082/doc.html`（若后端跑在 8082） | 同上 |

配置：`backend/host-app/src/main/resources/application.yml` · `OpenApiConfiguration.java`

## 已导出静态附件（离线可审）

| 文件 | 说明 |
| --- | --- |
| [api/labelhub-openapi-public.json](./api/labelhub-openapi-public.json) | 业务 API（230 paths） |
| [api/labelhub-openapi-internal.json](./api/labelhub-openapi-internal.json) | 内部 API |
| [api/pyagent-ai-review.openapi.yaml](./api/pyagent-ai-review.openapi.yaml) | Agent AI 预审 |
| [api/EXPORT_MANIFEST.md](./api/EXPORT_MANIFEST.md) | SHA256 与路径数 |

可导入 Postman / Apifox / Swagger Editor，**不依赖在线环境**。

## Python Agent

- 源契约：`backend/docs/contracts/pyagent-ai-review.openapi.yaml`
- 本地 `/docs`（FastAPI）以 Agent 运行时配置为准

## 重新导出

```bash
# 默认从交付栈 8080 导出
pnpm delivery:openapi

# 若后端跑在隔离端口 8082
LABELHUB_OPENAPI_BASE_URL=http://127.0.0.1:8082 pnpm delivery:openapi
```

更新 `submission/api/` 与 `EXPORT_MANIFEST.md`。

## 提交边界

| 项 | 状态 |
| --- | --- |
| 静态 OpenAPI 已导出 | ✅ |
| 本地 Knife4j 可用（交付栈 `8080`） | ✅ |
| 公网 Swagger URL | ⏳ 待部署回填 |
| Postman Collection 单独导出 | ❌ 未随包交付（可用 OpenAPI 导入替代） |
