# 后端服务

## 概述

LabelHub 后端采用 **Java 21 + Spring Boot 3.4.6** 分层多模块架构，通过 Maven 多模块组织。当前仓库同时保留一条预留扩展缝，但竞赛交付主链并不依赖完整插件宿主。

---

## 模块划分

```text
plugins-api  →  host-domain  →  host-core  →  host-infra  →  host-app
                                    ↑                              |
                                host-plugin  ←─────────────────────┘
```

| 模块 | 职责 | 关键依赖 |
|------|------|----------|
| **host-app** | Spring Boot 启动 + Controller + DTO + 配置装配 | host-core, host-infra |
| **host-core** | 应用服务、用例编排、统一契约(ApiResponse/ErrorCode)、鉴权接口 | host-domain |
| **host-domain** | 领域模型、枚举、状态迁移语义 — 无外部依赖 | — |
| **host-infra** | DB / Redis / HTTP / 安全 / 日志 / 状态机实现 | host-core |
| **plugins-api** | 预留扩展接口（当前仅 `LabelHubPluginExtension`） | — |
| **host-plugin** | 预留宿主占位（当前仅 `PluginHostPlaceholder`） | plugins-api |

## 核心能力

### 1. 状态机系统

基于 COLA StateMachine DSL，实现两套状态机：

| 状态机 | 状态数 | 迁移数 | 用途 |
|--------|--------|--------|------|
| **SubmissionStateMachine** | 14+ | 23 | 标注提交全生命周期：草稿 → 提交 → AI审核 → 人工审核 → 通过/打回 → 申诉 |
| **AssignmentStateMachine** | 5 | 9 | 标注任务分配：未领取 → 已领取 → 已提交 → 过期/取消 |

每次状态迁移通过 `SubmissionStateMachineService.transition()` 执行，自动记录 `SubmissionStatusHistory` 操作日志。

### 2. 认证与授权

自定义鉴权体系，不依赖 Sa-Token：

| 层 | 组件 | 说明 |
|----|------|------|
| **认证过滤** | `UserTokenAuthenticationFilter` | 拦截 `/api/**`，解析 Bearer Token → `AuthService.requireUser()` → 填充 SecurityContext + MDC |
| **内部鉴权** | `InternalTokenFilter` | 拦截 `/internal/**`，校验 `X-Internal-Token` + IP 白名单 |
| **权限注解** | `@RequirePermission` / `@RequireRole` / `@RequireAnyPermission` | AOP 切面实现，委托 `AuthorizationFacade` 校验 |
| **数据权限** | `@DataScope` + `DataScopeAspect` | 方法级数据权限注入，支持 8 种 Scope 类型（ALL/CREATED_BY_ME/ASSIGNED_TO_ME 等） |

### 3. 统一响应

| 类型 | 字段 | 说明 |
|------|------|------|
| `ApiResponse<T>` | `code, message, data, traceId` | 所有 REST 接口统一返回格式 |
| `PageResponse<T>` | `total, page, pageSize, list` | 分页响应 |
| `ErrorCode` 枚举 | 85+ 错误码 | 按业务域分组（AUTH_*、TASK_*、SUBMISSION_* 等），每码附带 HTTP status |

### 4. 异步与 Outbox

- 业务事务内只写业务表 + outbox 表，不直接执行不可回滚的副作用
- `AsyncLogThreadPoolConfig` 配置自定义异步线程池，负责审计日志异步写入
- outbox 任务支持重试次数、下次重试时间、失败原因、关联业务 ID

### 5. 审计日志

- `TraceLoggingFilter` 统一注入 TraceId / RequestId / UserId 到 MDC
- `AuditAspect` 方法级审计注解，记录操作者、操作方法、参数、耗时
- `IdempotentAspect` 幂等保护，防止重复提交

---

## 外部集成

| 系统 | 通信方式 | 说明 |
|------|----------|------|
| **Python Agent** | REST（内部 Token 鉴权） | LLM 调用、Prompt 渲染 |
| **MySQL 8.4** | MyBatis-Plus + Flyway | 主数据库，当前迁移版本到 `V46` |
| **Redis 7** | Lettuce | 缓存、Token 存储 |
| **MinIO** | S3 兼容 SDK | 文件/图片/素材存储 |
