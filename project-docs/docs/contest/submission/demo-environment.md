---
title: 演示环境说明
---

# 演示环境说明

> 封包正文：[`submission/DEMO_ENVIRONMENT.md`](../../../../submission/DEMO_ENVIRONMENT.md)

## 云平台可访问演示（待部署）

> **当前尚未部署公网演示环境，以下字段留空，部署后回填。**

| 项 | 值 |
| --- | --- |
| 云平台 | _（待填，如阿里云 / 腾讯云 / AWS / 自建 K8s）_ |
| 访问地址 | _（待填）_ |
| 前端入口 | _（待填，如 `https://demo.example.com/admin/`）_ |
| API 基址 | _（待填）_ |
| Agent 基址 | _（待填，内网可不暴露）_ |
| 演示账号 | _（待填；勿提交真实生产密钥）_ |
| 部署文档 | [deployment/overview](../../deployment/overview.md) · [`scripts/docker-deploy.sh`](../../../../scripts/docker-deploy.sh) |

## 本地 / 局域网演示（当前可用）

详见 [`submission/DEMO_ENVIRONMENT.md`](../../../../submission/DEMO_ENVIRONMENT.md)，摘要如下：

```bash
# 推荐：一键交付栈
pnpm delivery:stack:up
pnpm delivery:stack:status
```

| 组件 | 默认地址 |
| --- | --- |
| 前端 | `http://127.0.0.1:5174` |
| 后端 API | `http://127.0.0.1:8080` |
| API 文档（Knife4j） | `http://127.0.0.1:8080/doc.html` |
| Python Agent | `http://127.0.0.1:8000` |
| 交付看板 | `http://127.0.0.1:3001` |

演示账号（seed）：`seed_owner` / `seed_labeler_ben` / `seed_reviewer_lin`，密码 `admin123`。

## 端口说明

| 场景 | 前端 | 后端 |
| --- | --- | --- |
| **交付栈**（视频录制、业务 smoke） | `5174` | `8080` |
| **隔离 smoke / OpenAPI 导出** | `5176` | `8082` |

## 视频录制环境

演示视频在 `http://127.0.0.1:5174` 上录制，与上表一致；分镜脚本见 [演示视频](./demo-video.md)。
