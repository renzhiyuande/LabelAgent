# 后端架构

## 模块依赖

```
plugins-api  →  host-domain  →  host-core  →  host-infra  →  host-app
                                    ↑                              |
                                host-plugin  ←─────────────────────┘
```

---

## 分层详解

### host-app（启动层）

**位置**：`backend/host-app/`

只放启动类和表层逻辑：

- `LabelHubApplication.java` — Spring Boot 启动类
- `app/business/` — 全部业务 Controller（18+ 个）
- `app/auth/` — `AuthController` 登录/注销/刷新
- 入参 DTO、配置装配、OpenAPI 分组

> Controller 不做业务规则，只做鉴权入口 + 参数校验 + 调用应用服务。

### host-core（应用层）

**位置**：`backend/host-core/`

定义应用级抽象和接口：

| 包 | 关键类 | 说明 |
|----|--------|------|
| `api` | `ApiResponse<T>`, `PageResponse<T>` | 统一响应结构 |
| `error` | `ErrorCode` 枚举（85+码）, `BusinessException` | 全局错误码 + 业务异常 |
| `authz` | `AuthorizationFacade`, `@RequirePermission` | 鉴权抽象接口 + 注解定义 |
| `auth` | `AuthTokens`, `AuthenticatedUser` | 鉴权上下文 |
| `datapermission` | `DataScopeType`, `DataScopePolicy`, `@DataScope` | 数据权限抽象 |
| `statemachine` | `StateMachine<S,E>` 接口, `StateMachineEngine` | 状态机引擎契约 |
| `audit` | Audit 注解和日志抽象 | 审计接口定义 |
| `agent` | Agent REST 契约接口 | 与 Python Agent 通信契约 |

### host-domain（领域层）

**位置**：`backend/host-domain/`

纯领域模型，**无任何外部依赖**（无 Spring Web、无 MyBatis、无 Redis）：

| 包 | 内容 |
|----|------|
| `entity` | `BaseEntity`（id, createdAt, createdBy, updatedAt, updatedBy, deleted）, 领域实体 |
| `enums` | `SubmissionStatus`（14 状态）, `SubmissionEvent`（17 事件）, `AssignmentStatus`, `AssignmentEvent`, `UserRole`, `TaskStatus` 等 |
| `statemachine` | 状态机接口 |

### host-infra（基础设施层）

**位置**：`backend/host-infra/`

所有的技术实现：

| 领域 | 关键类 | 说明 |
|------|--------|------|
| **DB** | MyBatis-Plus Mapper + `Db*Service` 实现类 | 数据库访问 |
| **Redis** | Lettuce 客户端配置 | 缓存、Token 存储 |
| **安全** | `UserTokenAuthenticationFilter`, `InternalTokenFilter`, `AuthorizationAspect`, `SecurityAuthorizationFacade` | 认证 + 鉴权实现 |
| **状态机** | `SubmissionStateMachineFactory`, `SubmissionStateMachineService`, `SubmissionTransitionPolicy`, 生命周期服务 | 状态机引擎实现 |
| **审计** | `AuditAspect`, `TraceLoggingFilter` | 日志 + 审计切面 |
| **幂等** | `IdempotentAspect` | 防重复提交 |
| **低代码** | 低代码 Provider 注册机制 | 为前端低代码引擎提供运行时数据 |
| **异步** | `AsyncLogThreadPoolConfig` | 异步线程池配置 |

### plugins-api / host-plugin（预留扩展缝）

| 模块 | 说明 |
|------|------|
| `plugins-api` | 当前仅保留 `LabelHubPluginExtension` 这一最小扩展接口，用于锁定未来扩展边界 |
| `host-plugin` | 当前仅保留占位实现 `PluginHostPlaceholder`，尚未实现独立插件装载、隔离与生命周期管理 |

---

## 关键设计

### 状态机架构

```
Controller → 应用服务 → Lifecycle（编排器）
                           ↓
                StateMachineService.transition()
                    ├── StateMachineEngine.fire(event)
                    ├── SubmissionTransitionPolicy.check()
                    └── SubmissionStatusHistory.write()
```

- `Lifecycle` 类（`SubmissionSubmitLifecycle` 等）编排涉及多个状态机或异步任务的多步骤操作
- `Policy` 类校验业务规则（撤回次数、申诉窗口、审核记录是否存在）

### 认证请求流程

```
                    ┌─ /api/** ─→ UserTokenAuthenticationFilter
                    │              ├─ Bearer Token → AuthService.requireUser()
                    │              └─ SecurityContextHolder + MDC(userId, role)
Request → Dispatcher ┤
                    ├─ /internal/** ─→ InternalTokenFilter
                    │                   ├─ X-Internal-Token 校验
                    │                   └─ IP 白名单校验
                    │
                    └─ /auth/** ─→ 公开接口（登录等）
```

### 数据权限注入

```
@Controller
@RequirePermission("task:list")         ← 功能权限校验
@DataScope(resource=RESOURCE_TASK)      ← 数据权限标记
getTaskList(query) {
    // DataScopeAspect 自动注入 WHERE 条件
    // e.g. created_by = currentUserId    (SCOPE_CREATED_BY_ME)
    //      assigned_to = currentUserId   (SCOPE_ASSIGNED_TO_ME)
}
```

支持 8 种 `DataScopeType`：ALL, CREATED_BY_ME, ASSIGNED_TO_ME, TASK_MEMBER, TASK_OWNER, REVIEWER, CUSTOM, PUBLIC_OR_OWN
