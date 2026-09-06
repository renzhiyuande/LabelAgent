# LabelHub 全量 Seed

## 一键生成（推荐）

```bash
# 全部模块 → 单个 SQL
python3 scripts/generate_all_seeds.py

# 同时写出各模块独立 SQL + 合并 SQL
python3 scripts/generate_all_seeds.py --split

# 只生成指定模块
python3 scripts/generate_all_seeds.py --only preference_compare
python3 scripts/generate_all_seeds.py --only qa_quality
python3 scripts/generate_all_seeds.py --only preference_compare,qa_quality
```

| 输出文件 | 说明 |
|----------|------|
| `backend/host-app/src/test/resources/labelhub_full_seed.sql` | 全量合并（默认） |
| `backend/host-app/src/test/resources/preference_compare_full_flow_seed.sql` | 偏好对比 + AI 质检 |
| `backend/host-app/src/test/resources/qa_quality_full_flow_seed.sql` | 问答质量多媒体 |

`qa_quality` 不含用户表，单独导入前需先有 `preference_compare` 或已有 seed 用户。

LLM 模型统一使用真实 DeepSeek 目录（与 Flyway V45/V46 一致）：
- Provider / platform：`deepseek`
- AI 预审 / LLM 辅助默认模型：`deepseek-v4-flash`
- 偏好对比样本中的 `model_a` / `model_b` 会映射为 `deepseek-v4-flash` / `deepseek-chat` / `deepseek-reasoner`（不再使用 doubao、seed-model 等假名）

---

# Preference Compare 全链路 Seed

## 前置条件

1. 数据库已执行 Flyway 迁移（至少含 `V2` 平台角色、`V37`/`V55` 审核分级权限 `10022–10026`，对应 `business:reviewer:level:L1`–`L5`；与 `host-core` 的 `ReviewerLevelPermissionCodes` 及权限扫描导出一致）。
2. 再导入本脚本生成的 SQL（或先迁移后 seed）。

`roles` / `role_permissions` 使用 `INSERT IGNORE`，与迁移重复时不会报错。

## 生成

```bash
cd scripts
python3 generate_preference_compare_seed.py
# 或指定数据集
python3 generate_preference_compare_seed.py \
  --dataset /path/to/preference_compare.json \
  --output ../backend/host-app/src/test/resources/preference_compare_full_flow_seed.sql
```

默认数据集查找顺序：

1. `testdata/preference_compare/preference_compare.json`（仓库内，若存在）
2. `~/Downloads/datasets/preference_compare/json/preference_compare.json`

## 账号（租户 1，密码均为同一 bcrypt demo 哈希）

| 用户名 | 角色说明 |
|--------|----------|
| `seed_owner` | 任务 Owner |
| `seed_labeler_anna` / `ben` / `cici` | 标注员 |
| `seed_reviewer_lin` | 仅 L1（`SEED_REVIEWER_L1`，含 workbench + `10022`） |
| `seed_reviewer_qiao` | L2/L3（`SEED_REVIEWER_L2L3`，含 workbench + `10023`/`10024`） |
| `seed_reviewer_ming` | 全级（平台 `REVIEWER`，仅 workbench `10009`，无 level 权限即全级别） |

## 任务码速查

| 任务码 | 用途 |
|--------|------|
| `TASK_PREF_COMPARE_DEMO` | 主流程：12 真实样本、三级审核、CONFIRMED 验收、PAID 奖励 |
| `TASK_SM_DRAFT` / `PAUSED` / `ARCHIVED` / `FINISHED` | 任务状态 + 1~2 条样本 |
| `TASK_SM_ACCEPT` | 验收 PENDING / SAMPLING / REOPENED + 抽样样本行 |
| `TASK_SM_REWARD` | 奖励批次 DRAFT→REVERSED + 明细 |
| `TASK_SM_SUBMISSION` | 合成提交态（含申诉、撤回后 DRAFT） |
| `TASK_SM_ASSIGN` | UNCLAIMED / EXPIRED / CANCELLED |
| `TASK_SM_OPS` | 异步、导出、导入 RUNNING/PROCESSING/FAILED、批量审核 |
| `TASK_SM_REVIEW_L1` | 单级审核对照（仅 L1 workflow） |

## 主任务样本（`TASK_PREF_COMPARE_DEMO`）

| 样本 | 提交态要点 |
|------|------------|
| P0001/P0002/P0009 | 三级终审 APPROVED |
| P0003 | 停在 L2，待 L3 |
| P0004 | L2 REJECTED |
| P0005 | NEEDS_REVISION + assignment CLAIMED |
| P0006/P0007 | HUMAN_REVIEWING 待 L1/L3 |
| P0008 | AI_REJECTED |
| P0010 | AI_PASSED |
| P0011 | DRAFT |
| P0012 | UNCLAIMED（无 submission） |

## AI 预审质检演示任务

| 任务码 | 聚合状态 |
|--------|----------|
| `TASK_PREF_COMPARE_DEMO` | 已聚合（趋势、误判、优化建议） |
| `TASK_HEALTH_READY` | 可聚合（42 条 AI 审核，真实题面） |
| `TASK_HEALTH_OPTIMIZE` | 优化燃料专任务（50 条 AI 审核 + 22 误判 case） |
| `TASK_HEALTH_SPARSE` | 未聚合（8 条样本） |

## seed_owner 权限

`seed_owner` 绑定 Owner 业务权限（含 `business:submission:read`、`business:ai-review:observe:owner`）及 Owner 菜单，**不含** reviewer/labeler 工作台菜单。重新导入 `labelhub_full_seed.sql` 后即可访问 AI 质检 accept 等接口。

数据集默认在 `testdata/preference_compare/`（36 条，缺失时自动从 fixtures 导出）。

---

# QA Quality 多媒体标注 Seed

```bash
python3 scripts/generate_qa_quality_seed.py
# 或通过编排脚本
python3 scripts/generate_all_seeds.py --only qa_quality
```

- 任务码：`TASK_QA_QUALITY_DEMO`
- 30 条样本：`text=20`, `image=4`, `video=3`, `markdown=3`
- 按 `media_type` 动态展示 image / video / markdown / text
- 数据集：`testdata/qa_quality/` 或 `~/Downloads/datasets/qa_quality`
