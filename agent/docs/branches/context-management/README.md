# feat/context-management

## 目标

治理现有 AI Review 请求中的 `memoryContext`，避免把调用方提供的历史规则、Bad Case 和审核记录无上限地整块塞进 LLM Prompt。

这一阶段只解决“已经提供给 Agent 的上下文怎么选”，不负责检索、不接向量库，也不把它包装成所谓 Long-term Memory。

## 当前问题

原有 `ReviewEngine.build_messages()` 在收到 `memory_context` 后，会把整个列表 JSON 序列化后追加为一条 User Message。这样做简单，但随着历史审核数据增长会出现：

- 重复案例反复进入 Prompt；
- 项目规则和普通历史记录没有优先级差异；
- 上下文条数与字符数不可控；
- Token 成本和延迟随历史数据持续上升；
- 低价值历史记录可能挤掉真正重要的规则和 Reviewer 反馈。

## 新增结构

```text
agent/
├── app/
│   ├── schemas/context_management.py
│   └── services/
│       ├── context_manager.py
│       └── managed_ai_review_service.py
├── tests/
│   ├── test_context_manager.py
│   └── test_managed_ai_review_service.py
└── docs/branches/context-management/README.md
```

同时 `app/main.py` 已改为实例化 `ManagedAiReviewService`，因此 `/v1/ai-review` 已实际经过 Context Manager，而不是只新增一个未调用的工具类。

## 在线执行顺序

```text
AiReviewRequest
    ↓
ManagedAiReviewService
    ↓
ContextManager.select(memoryContext)
    ↓
裁剪后的 AiReviewRequest
    ↓
原 AiReviewService
    ↓
ReviewEngine / LLM
    ↓
AiReviewResult + contextSelection stats
```

`ManagedAiReviewService` 使用 `model_copy()` 生成新的 Request，因此不会原地修改调用方传入的 `AiReviewRequest`。

## Context Selection Policy

`ContextSelectionPolicy` 当前支持：

- `maxItems`: 最大上下文条目数，默认 12；
- `maxChars`: JSON 序列化后的总字符预算，默认 12000；
- `typePriorities`: 不同上下文类型的默认优先级；
- `defaultPriority`: 未识别类型的默认优先级；
- `perTypeLimits`: 对某类上下文单独限流。

在线链路可通过环境变量覆盖两个总预算：

```text
LABELHUB_CONTEXT_MAX_ITEMS
LABELHUB_CONTEXT_MAX_CHARS
```

默认优先级：

```text
project_rule       100
reviewer_feedback   90
bad_case            80
review_history      60
generic             50
```

调用方也可以在单条 Context 中提供 `priority`，显式覆盖类型默认值。

## 去重策略

优先使用稳定业务 ID：

```text
contextId / caseId / ruleId / id
```

若没有稳定 ID，则对 canonical JSON 做 SHA-256。

排序发生在去重之前，因此同一个业务 ID 出现多个版本时，优先级最高的条目保留；优先级相同则保持调用方原始顺序。

## 预算策略

选择顺序：

1. 按优先级降序、原始位置升序排序；
2. 去重；
3. 检查 per-type limit；
4. 检查总条数；
5. 检查总字符预算；
6. 满足条件才加入最终 Context。

如果一条 Context 超出剩余预算，当前实现会整条跳过，不会直接截断 JSON 字段。原因是规则或 Reviewer 反馈被截成半句话可能改变语义，比少提供一条上下文更危险。

## 统计信息

每次选择会返回：

- `inputCount`
- `selectedCount`
- `droppedCount`
- `deduplicatedCount`
- `itemLimitRejectedCount`
- `charBudgetRejectedCount`
- `typeLimitRejectedCount`
- `selectedChars`

在线审核完成后，这组统计会写入：

```text
AiReviewResult.parsedResult.contextSelection
```

同一组统计还会记录成：

```text
component = context
operation = select_review_context
```

的结构化 Trace Event。Trace 中只包含计数和字符预算信息，不包含 Context 正文。

## 向后兼容

Context Manager 接收的仍然是现有：

```python
list[dict[str, Any]]
```

因此 Java/Python API 契约不需要为了这一阶段强制升级。类型识别会检查：

```text
contextType / context_type / type / kind
```

未提供类型的旧数据按 `generic` 处理。

## 安全边界

- 不做向量检索；
- 不自动写入长期记忆；
- 不把 AI 自己生成的结论未经人工确认写回 Context；
- 不粗暴截断规则字段；
- 不修改原始 Context 对象；
- 不把 Context Manager 描述成完整 Memory System。

## 验收标准

- 项目规则默认优先于普通历史记录；
- 显式 Priority 可以覆盖默认优先级；
- 同 ID / 同 canonical 内容可以稳定去重；
- 总条数、字符预算和分类上限全部可生效；
- `/v1/ai-review` 实际使用裁剪后的 Context；
- `parsedResult` 和 Trace 都能看到裁剪统计，但看不到 Context 正文；
- 原始 Request 不被修改；
- `main` 分支保持不变。

## 不是下一步优先项

在这套选择和预算机制没有真实数据验证之前，不建议马上增加 Embedding / Vector DB / RAG。先把已有上下文治理好，再根据“召回不足”而不是“想显得像 Agent”来决定是否引入检索层。
