# 开发约定

## 架构分层

### 后端三层架构

| 层级 | 约束 |
|------|------|
| **core（核心层）** | 不可卸载，定义主数据模型、主状态机、统一契约、安全边界、核心数据流 |
| **extension seam（预留扩展缝）** | 只通过 `plugins-api` 暴露未来扩展边界；当前交付未实现独立插件装载/热插拔；不得改写核心状态机迁移图；不得直接依赖核心内部包 |
| **scenario（业务层）** | 编排核心 + Agent + 前端 + 基础设施能力为端到端业务闭环 |

### 后端模块职责

| 模块 | 可以放 | 不能放 |
|------|--------|--------|
| `host-app` | Controller、入参 DTO、配置装配 | 业务规则 |
| `host-core` | 应用服务、用例编排、统一契约 | 数据库 Mapper、HTTP 客户端 |
| `host-domain` | 领域模型、枚举、状态迁移 | Spring Web、MyBatis、Redis 依赖 |
| `host-infra` | DB/Redis/HTTP/安全/日志实现 | Controller |
| `plugins-api` | 预留扩展接口 | 宿主内部实现 |
| `host-plugin` | 预留宿主占位 | 主业务规则 |

### 前端目录约定

```
src/
├── app/             路由、布局、鉴权引导
├── features/        业务特性（按模块分组：labeler/review/template-designer/business/system/...）
├── low-code/        低代码引擎
├── components/
│   ├── ui/          Radix UI 基础组件
│   ├── workbench/   工作台 v1
│   └── workbench2/  工作台 v2
├── lib/             工具库
├── stores/          全局 Zustand 状态
├── providers/       Refine 框架 Provider
├── generated/       OpenAPI 自动生成类型
└── hooks/           通用 Hooks
```

---

## 关键约束

### 前端

- 低代码资源页的 ResourceMeta 在 `resources/` 下定义，在 `resource-registry.ts` 注册
- 菜单 `resourceKey` 必须与 `resource` 字段一致
- Controller 和前端不推断下一状态，必须调用后端统一动作接口

### 后端

- **状态机**：状态迁移图是核心层冻结资产，插件不得修改。每次迁移记录操作者、来源状态、目标状态、失败原因
- **异步**：事务内只写业务表 + outbox 表，不直接执行不可回滚的外部副作用。outbox 任务必须支持重试次数、下次重试时间、失败原因、关联业务 ID
- **API 响应**：所有 REST 接口统一返回 `ApiResponse<T>`（code/message/data/traceId），错误码使用 `ErrorCode` 枚举
- **鉴权**：默认需要鉴权，公开接口显式标记。优先使用注解鉴权（`@RequirePermission`/`@RequireRole`）
- **内部通信**：Java 后端与 Python Agent 通过 REST 通信，使用 X-Internal-Token 鉴权
- **密钥管理**：API 密钥、LLM Key、数据库密码不提交到仓库。LLM 密钥只存在于 Python Agent 环境

### 数据库

- 所有 Schema 变更必须有 Flyway 迁移脚本
- 表设计包含标准审计字段（BaseEntity：id, created_at, created_by, updated_at, updated_by, deleted）
- 需要幂等的业务写入必须有业务唯一键或幂等键

### Python Agent

- 日志不输出完整 prompt 中的敏感数据、api_key、authorization header
- 新增 LLM 厂商时，只改 Python Agent，不改 Java 主业务
- 首选 OpenAI 兼容协议，不兼容协议才实现专属 Provider

---

## 代码规范

### 命名

| 层 | 规范 |
|----|------|
| Java 类 | PascalCase |
| Java 方法/字段 | camelCase |
| REST 端点 | kebab-case `/api/v1/resource/{id}/action` |
| TypeScript | PascalCase(类型) + camelCase(变量/函数) |
| Python | snake_case |
| 数据库表/字段 | snake_case |

### 注释

- 核心业务逻辑（状态机迁移、策略判断）必须写注释说明**为什么**
- OpenAPI 接口 DTO 使用 `@Schema(description = "...")` 描述
- 前端 ResourceMeta 的复杂配置项写 JSDoc 说明

### 测试

- 后端：JUnit 5 + Testcontainers 集成测试
- 前端：Vitest 单元测试
- Agent：pytest + pytest-asyncio
- **状态机、鉴权、数据权限、审核策略**必须覆盖核心测试用例
