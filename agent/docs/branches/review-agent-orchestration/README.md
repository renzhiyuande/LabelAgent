# feat/review-agent-orchestration

## 目标

把现有 LabelHub AI 预审从“固定调用链的 AI Workflow”升级为一个**受约束、可审计、可降级的垂直审核 Agent**。

本分支不修改 `main`，基于 `review/agent-quality-loop` 开发。

## 为什么需要这一层

此前能力已经覆盖：

- AI Review 推理；
- Structured Output + Pydantic 动态校验；
- 失败反馈与有限重试；
- Score Consensus / Calibration；
- Context Governance；
- Trace；
- Offline Evaluation / Prompt Gate。

但在线执行路径仍然是程序预先写死的：收到请求后直接进入审核模型。模型没有机会基于当前任务状态选择“下一步应该先获取什么信息”。

因此此前更准确的名称是 **AI Review Runtime / Agentic Workflow**，而不是完整的 Tool-Using Agent。

## 本分支新增 Agent Loop

```text
POST /v1/agent-review
        ↓
ReviewAgentPlanner
        ↓
选择一个白名单 Action
        ↓
┌────────────────────┐
│ inspect_rules      │──→ Observation ─┐
│ inspect_history    │──→ Observation ─┼→ Planner 再决策
│ final_review       │──────────────────┘
└────────────────────┘
        ↓
ManagedAiReviewService
        ↓
Context Manager
        ↓
AiReviewService / ReviewEngine
        ↓
Structured Review Result
```

Planner 由当前请求指定的 OpenAI-Compatible 模型驱动，temperature=0，并要求严格输出：

```json
{
  "tool": "inspect_rules | inspect_history | final_review",
  "arguments": {},
  "reason": "为什么下一步需要这个动作"
}
```

## 白名单工具

### inspect_rules

只读。返回当前审核任务的：

- 评分维度；
- 权重；
- score min/max；
- pass/reject threshold；
- 是否配置自定义 Prompt；
- 是否配置输出 Schema。

它不修改任何规则。

### inspect_history

只读。查看后端已经传入 Python Agent 的 `memoryContext`。

支持限制读取条数，最大 10 条，并返回历史上下文类型统计。

当前版本**不会自行访问数据库、向量库或远程检索系统**。这点很重要：它是 Context Tool，不应夸大成完整 RAG。

### final_review

终止规划循环，并把原始审核请求交给现有 `ManagedAiReviewService`。

因此正式评分仍复用已经验证过的：

- Context Manager；
- Prompt Service；
- Review Engine；
- Dynamic Pydantic Schema；
- retry/self-correction；
- score consensus；
- score calibration。

Agent Planner 不直接生成最终业务审核结果，也不能直接修改 Java 工作流状态。

## 安全边界

这是本实现最重要的设计。

### 1. 最大执行步数

环境变量：

```text
LABELHUB_AGENT_MAX_STEPS
```

默认 4，代码层硬限制 1~8。

达到上限后自动降级进入 `final_review`，不存在无限 Agent Loop。

### 2. 禁止重复只读工具

同一次 Agent Run 中 `inspect_rules` / `inspect_history` 不允许重复调用。

Planner 重复调用时自动结束规划并进入安全的正式审核链。

### 3. Planner / Tool 失败不阻断业务

以下情况全部 fallback 到现有审核服务：

- Planner 网络/Provider 异常；
- Planner 输出无法通过 Pydantic 校验；
- Tool 执行异常；
- 最大步数耗尽；
- 重复 Tool。

因此新 Agent 层是增强，而不是现有审核服务的单点故障源。

### 4. 不允许 Agent 改业务状态

工具箱没有以下能力：

- 通过/驳回提交；
- 修改 Submission；
- 修改 Reviewer 结果；
- 修改数据库；
- 修改 Prompt Production 状态。

最终业务状态仍由 Java Backend / State Machine 决定。

## Trace

每一步记录结构化 Trace Event：

- `agent / planner_decide`
- `agent_tool / inspect_rules`
- `agent_tool / inspect_history`
- `agent / forced_final_review`

正式结果的 `parsedResult.agentRun` 记录：

- mode；
- maxSteps；
- executedSteps；
- fallbackReason；
- 每一步 tool / reason / status / observation summary。

不会把完整历史案例再次复制到 Agent Run 审计字段中。

## API

原 API 保持不变：

```text
POST /v1/ai-review
```

新增：

```text
POST /v1/agent-review
```

两者使用同一个 `AiReviewRequest` / `AiReviewResult` 契约，因此 Backend 可以按任务灰度切换，而不需要维护两套审核数据结构。

## 测试

新增：

```text
agent/tests/test_review_agent_service.py
```

覆盖：

1. Planner 依次调用 rules → history → final review；
2. 重复 Tool 自动安全降级；
3. Planner 异常自动安全降级；
4. 工具箱只暴露只读审核上下文。

## 能力边界

完成本分支后，可以准确描述为：

> 基于受限 Planner + Tool Registry 构建审核 Agent Runtime，支持模型根据任务上下文在白名单工具中选择规则检查、历史上下文读取与正式审核动作，并通过最大步数、重复工具检测和异常降级保证执行可控；Agent Step 与 Tool Result 接入统一 Trace，业务状态仍由后端状态机控制。

当前仍**不应**描述成：

- 通用自主 Agent；
- Multi-Agent；
- 完整 ReAct Tool Calling Framework；
- RAG Agent；
- MCP Agent；
- Autonomous Workflow State Mutation。

这是一个面向 LabelHub 审核场景的 **bounded tool-using vertical agent**。
