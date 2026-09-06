# 数据库设计

## 概述

主数据库使用 **MySQL 8.4**，通过 **Flyway** 管理 Schema 迁移（当前版本 V1 → V46）。

**迁移目录**：
- `backend/host-app/src/main/resources/db/migration/`
- 项目根 `db/migration/`（双位置同步）

---

## 核心表结构

### 用户与权限

| 表 | 说明 |
|----|------|
| `sys_user` | 系统用户（登录名、密码、状态、个人设置） |
| `sys_role` | 角色定义 |
| `sys_user_role` | 用户-角色关联 |
| `sys_permission` | 权限资源定义 |
| `sys_role_permission` | 角色-权限关联 |
| `sys_menu` | 菜单树 + resourceKey 关联 |

### 业务核心

| 表 | 说明 |
|----|------|
| `task` | 标注任务（状态、类型、模板、配置） |
| `task_member` | 任务成员（标注员/审核员关联） |
| `template` | 标注模板定义 |
| `template_version` | 模板版本管理（草稿/发布/快照） |
| `assignment` | 任务分配记录（标注员 → 标注项） |
| `submission` | 标注提交记录（状态、审核链路） |
| `submission_status_history` | 状态迁移审计日志 |

### 低代码引擎

| 表 | 说明 |
|----|------|
| `lowcode_resource_meta` | 低代码资源配置（存 JSON） |
| `lowcode_dict` | 数据字典 |
| `lowcode_dict_item` | 字典项 |
| `lowcode_system_client` | 系统客户端（内部 Token 管理） |

### 审核与奖励

| 表 | 说明 |
|----|------|
| `review_config` | 审核配置（等级、审核人） |
| `review_record` | 审核记录 |
| `reward_settlement` | 奖励结算 |
| `appeal` | 申诉记录 |

### 异步与日志

| 表 | 说明 |
|----|------|
| `async_outbox` | 异步任务 Outbox 表 |
| `audit_log` | 审计日志 |
| `claim_token` | 领取令牌（幂等控制） |

---

## 迁移策略

- 所有 Schema 变更通过 Flyway 迁移脚本管理，命名规范 `V{版本号}__{描述}.sql`
- 迁移脚本同时维护在两个位置（`host-app` 内和项目根 `db/migration/`）
- BaseEntity 统一审计字段：`created_at`, `created_by`, `updated_at`, `updated_by`, `deleted`（逻辑删除）
- 需要幂等的业务写入必须有**业务唯一键**或**幂等键**

## 审计字段规范

所有业务实体继承 `BaseEntity`，包含以下标准审计字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | BIGINT | 自增主键 |
| `created_at` | DATETIME | 创建时间 |
| `created_by` | VARCHAR(64) | 创建人 |
| `updated_at` | DATETIME | 更新时间 |
| `updated_by` | VARCHAR(64) | 更新人 |
| `deleted` | TINYINT(1) | 逻辑删除标志 |
