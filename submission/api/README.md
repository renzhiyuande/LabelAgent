# Submission API Artifacts

本目录用于存放提交包可直接附带的静态 API 契约文件。

## 约定产物

| 文件 | 说明 |
| --- | --- |
| `labelhub-openapi-public.json` | 业务 API（`/api/**`） |
| `labelhub-openapi-internal.json` | 内部 API（`/internal/**`） |
| `pyagent-ai-review.openapi.yaml` | Python Agent AI 预审契约 |
| `EXPORT_MANIFEST.md` | 导出时间、源地址、路径数、SHA256 |

## 导出方式

```bash
# 默认：交付栈 http://127.0.0.1:8080
pnpm delivery:openapi

# 隔离栈（与 pnpm smoke:browser 同端口）
LABELHUB_OPENAPI_BASE_URL=http://127.0.0.1:8082 pnpm delivery:openapi
```

`EXPORT_MANIFEST.md` 会记录导出时间、源地址、路径数量和 SHA256，供评审复核。

## 端口说明

| 场景 | 后端基址 | 用途 |
| --- | --- | --- |
| 交付栈 | `http://127.0.0.1:8080` | 答辩演示、`pnpm delivery:stack:up` |
| 隔离栈 | `http://127.0.0.1:8082` | Playwright smoke、历史 manifest 导出源 |

当前 manifest（2026-06-08）从 `8082` 导出；若接口有变更，请重新导出并更新 manifest。

## 评审入口

- 封包说明：[../API_DOCS.md](../API_DOCS.md)
- 文档站：[../../project-docs/docs/contest/submission/api-docs.md](../../project-docs/docs/contest/submission/api-docs.md)
