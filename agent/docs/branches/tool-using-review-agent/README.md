# feat/tool-using-review-agent

## 目标

这个分支把原有的“LLM 结构化审核服务”补成一个真正具有 Agent 行为的、受控的审核执行层。

原有链路已经具备：

- Prompt 构建；
- OpenAI-compatible 模型调用；
- 动态 Pydantic Schema；
- 结构化输出失败后的有限自修复；
- Context 治理；
- Trace / Evaluation / Prompt Gate。

但此前缺少 Agent 最核心的一步：**模型根据当前任务状态，自主决定是否调用工具、调用哪个工具，并根据工具结果继续下一步，再决定何时结束。**

本分支补齐这一层，但仍严格限制在 AI 预审业务中，不让 LLM 直接修改业务状态。

---

## 新的执行链路

```text
HTTP /v1/ai-review
    ↓
ManagedAiReviewService
    ↓
ContextManager
    ↓
AgenticAiReviewService
    ↓
ReviewAgentRuntime
    ├─ CALL_TOOL → Tool Registry → Tool Result → 下一步
    ├─ CALL_TOOL → Tool Registry → Tool Result → 下一步
    └─ FINALIZE
    ↓
把工具证据注入 memoryContext
    ↓
原 AiReviewService / ReviewEngine
    ↓
动态 Pydantic Schema + structured-output repair
    ↓
最终 AI Review Result
```

这里特意把“Agent 取证”和“最终结构化评分”分开：

- `ReviewAgentRuntime` 负责决定 **怎么获取证据**；
- `ReviewEngine` 负责生成 **符合业务契约的最终审核结果**；
- Java 后端状态机继续负责 **业务状态是否合法流转**。

LLM 不拥有数据库写权限、审核状态修改权限或 Prompt 发布权限。

---

## Agent Loop

模型每一步只能返回两种动作之一：

```json
{
  "action": "CALL_TOOL",
  "tool": "check_required_fields",
  "arguments": {
    "fields": ["answer"]
  }
}
```

或：

```json
{
  "action": "FINALIZE",
  "arguments": {}
}
```

Runtime 设置硬上限：

```text
LABELHUB_AGENT_AI_REVIEW_AGENT_MAX_STEPS=3
```

默认最多 3 步。

因此这是一个 bounded agent loop，而不是无限自主循环。

---

## Tool Registry

当前工具全部是只读确定性工具。

### `check_required_fields`

检查标注结果中的指定字段是否：

- 存在；
- 非空；
- 数据类型可识别。

适合动态表单/模板任务的完整性检查。

### `compare_fields`

按 dotted path 对 `sourceData` 与 `submitData` 做确定性字段比较。

例如：

```text
source: reference.answer
label : answer
```

支持文本空白、大小写归一化。

### `search_review_memory`

只搜索已经经过 Context Manager 授权进入本次请求的 `memoryContext`。

它不是向量数据库，也不是完整 Long-term Memory；当前使用稳定、可测试的词法匹配做定向检索。

---

## Tool 安全边界

工具调用有四层约束：

1. 固定白名单；
2. 每个工具有独立 Pydantic 参数 Schema；
3. 工具全部只读；
4. Runtime 有最大步骤限制。

例如模型如果尝试：

```json
{
  "action": "CALL_TOOL",
  "tool": "drop_database",
  "arguments": {}
}
```

Registry 会拒绝该调用，并把错误作为执行反馈交给模型选择修正或 `FINALIZE`。

---

## 为什么没有直接使用数据库工具

本分支故意没有提供：

- 任意 SQL；
- 更新任务状态；
- 自动通过/驳回；
- 自动修改 Production Prompt；
- 任意 HTTP 请求工具。

原因是 AI Review Agent 应负责“取证 + 判断辅助”，而业务状态仍由 Java 后端工作流/状态机控制。

这使 Agent 具备自主决策能力，同时不破坏已有业务安全边界。

---

## Agent Trace

Agent 每一步会进入现有 Structured Trace：

```text
component=review_agent
operation=planner_decision
operation=tool_call
operation=finalize_evidence
operation=agent_loop_end
```

Trace 不记录模型思维链。

业务结果的 `parsedResult.agentRuntime` 会保留：

- enabled；
- termination；
- plannerCalls；
- toolCalls；
- evidenceCount；
- 每一步工具动作及状态。

这样可以后续统计：

- 每次审核平均 Tool Call 数；
- 不同 Tool 使用分布；
- Max Steps 命中率；
- Planner Failure Rate；
- Agent 带来的 Token / Latency 增量。

---

## 成本统计

最终 `AiReviewResult` 的：

- `totalLatencyMs`；
- `promptTokens`；
- `completionTokens`；
- `totalTokens`

会把 Agent Planner 的调用成本和最终 ReviewEngine 成本合并。

这意味着 Offline Evaluation 可以真实比较：

```text
普通结构化审核
vs
Tool-using Agent 审核
```

而不仅比较准确率，也能比较延迟与 Token 成本。

---

## Feature Flag

可以通过：

```text
LABELHUB_AGENT_AI_REVIEW_AGENT_ENABLED=true|false
```

控制 Agent Runtime。

关闭时，系统退回原来的结构化 ReviewEngine 链路。

相关参数：

```text
LABELHUB_AGENT_AI_REVIEW_AGENT_MAX_STEPS=3
LABELHUB_AGENT_AI_REVIEW_AGENT_TOOL_RESULT_MAX_CHARS=4000
```

---

## 本分支主要文件

```text
agent/app/schemas/agent_runtime.py
agent/app/tools/review_tools.py
agent/app/services/review_agent_runtime.py
agent/app/services/agentic_ai_review_service.py
agent/app/core/config.py
agent/app/services/managed_ai_review_service.py

agent/tests/test_review_tools.py
agent/tests/test_review_agent_runtime.py
agent/tests/test_agentic_ai_review_service.py
```

---

## 能力边界

这个分支完成后，可以准确描述为：

> 在 AI 自动预审链路中实现受控 Tool-using Agent Runtime，模型可根据任务状态自主选择字段校验、标准答案对比和历史审核检索工具，通过 bounded action loop 收集证据，再交由动态 Schema 约束的 ReviewEngine 生成最终审核结果；工具采用白名单和参数校验并限制最大步骤，业务状态仍由后端状态机控制。

暂时不能描述为：

- 完整自主 Agent 平台；
- Multi-Agent；
- MCP 工具生态；
- 向量化 Long-term Memory；
- 自主业务流程执行；
- LLM 自动发布 Prompt。

这些能力如果后续确有业务需要，再单独开发。
