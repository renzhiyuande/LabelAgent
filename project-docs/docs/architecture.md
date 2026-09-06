# 整体架构

## 三类边界

LabelHub 当前交付遵循 **三类架构边界**：

1. **核心层 Core** — 不可卸载
   - 主数据模型、主状态机、统一契约
   - 安全边界与核心数据流
   - 后端：host-domain + host-core

2. **扩展缝 Extension Seam** — 为后续插件化预留
   - 当前仅保留 `plugins-api` 接口与 `host-plugin` 占位模块
   - 竞赛交付不依赖完整插件宿主、热插拔或独立插件生命周期
   - 扩展能力目前仍需随宿主代码一同交付

3. **业务层 Scenario** — 端到端业务闭环
   - 编排核心能力与 Agent / 前端 / 基础设施能力
   - 可演示、可验收

## 前后端通信

前端 ↔ 后端：REST API，统一 `ApiResponse<T>` 结构，OpenAPI 文档

后端 ↔ Agent：统一 REST 契约，X-Internal-Token 鉴权

## 关键设计决策

| 决策 | 方案 | 理由 |
|------|------|------|
| 状态机 | COLA StateMachine DSL | 声明式状态迁移，可审计 |
| 异步任务 | Outbox 表 + Spring @Async | 事务内只写业务表 + outbox，不直接执行不可回滚的副作用 |
| 鉴权 | Spring Security Filter Chain + 自定义 Bearer Token | `/api/**` 与 `/internal/**` 分开鉴权，统一返回 `ApiResponse` 错误 |
| 数据权限 | AOP 切面 + DataScope 抽象 | 统一的字段级/行级权限过滤 |
| LLM 接入 | Python Agent 统一封装 | Java 不感知具体厂商，密钥不落入后端 |
| 前端低代码 | Schema 驱动 ResourceMeta | 声明式 CRUD 页面，无需手写重复代码 |
| 前端工作台 | Widget-Slot Provider | 不同业务场景复用同一布局引擎 |
