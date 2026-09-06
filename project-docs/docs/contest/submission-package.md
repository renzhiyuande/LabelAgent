---
title: 提交包说明
---

# 提交包说明

> **封包正文目录**：仓库根目录 [`submission/`](../../submission/README.md)  
> **文档站指引**：[`contest/submission/`](./submission/index.md)

本页仅说明「文档站 ↔ 封包目录」关系；具体附件状态以 [`submission/README.md`](../../submission/README.md) 为准。

**封包基线：2026-06-10**

## 两层结构

| 层级 | 路径 | 作用 |
| --- | --- | --- |
| 文档站指引 | `project-docs/docs/contest/submission/*` | 答辩阅读、站内导航、留空字段说明 |
| 封包正文 | `submission/*` | 评审直接打开的 Markdown + `api/` 静态件 |

## 赛题 3–6 快速链接

| 要求 | 文档站 | 封包 | 状态 |
| --- | --- | --- | --- |
| 演示视频 | [demo-video](./submission/demo-video.md) | [DEMO_VIDEO.md](../../submission/DEMO_VIDEO.md) | ✅ 已纳入 `media/` |
| 相关文档 | [related-docs](./submission/related-docs.md) | [RELATED_DOCS.md](../../submission/RELATED_DOCS.md) | ✅ |
| AI Coding | [ai-coding-record](./submission/ai-coding-record.md) | [AI_CODING_RECORD.md](../../submission/AI_CODING_RECORD.md) | ✅ |
| 演示环境 | [demo-environment](./submission/demo-environment.md) | [DEMO_ENVIRONMENT.md](../../submission/DEMO_ENVIRONMENT.md) | ⚠️ 公网 URL 待填 |
| API 文档 | [api-docs](./submission/api-docs.md) | [API_DOCS.md](../../submission/API_DOCS.md) | ⚠️ 在线 URL 待填 |

## 当前封包状态摘要

| 类别 | 状态 |
| --- | --- |
| 文字 / 截图 / OpenAPI 静态件 | 可直接封包 |
| 演示视频 mp4 | ✅ 已拷贝至 `submission/media/` |
| 公网演示 + 在线 Swagger | ⏳ 未部署，URL 字段留空待回填 |
