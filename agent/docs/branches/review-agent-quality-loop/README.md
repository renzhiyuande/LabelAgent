# review/agent-quality-loop

## 这是什么

这是 LabelAgent 本轮 Agent 质量闭环开发的集成审查分支。它从 `feat/context-management` 创建，不承担新的业务功能，只用于汇总四个阶段、做组合测试、记录审查发现和明确能力边界。

`main` 没有被修改，也不会从本分支自动合并。

## 分支链路

```text
main
  └─ feat/offline-evaluation
       └─ feat/prompt-version-gate
            └─ feat/agent-trace
                 └─ feat/context-management
                      └─ review/agent-quality-loop
```

每个功能分支都有独立 README：

```text
agent/docs/branches/offline-evaluation/README.md
agent/docs/branches/prompt-version-gate/README.md
agent/docs/branches/agent-trace/README.md
agent/docs/branches/context-management/README.md
```

## 本轮目标

把原有“AI 预审 + 人工复核 + Prompt 优化基础”补成一条可验证的质量工程链，而不是继续堆 Agent 名词：

```text
在线 AI Review
    ↓
人工 Reviewer Ground Truth
    ↓
Offline Evaluation / Replay
    ↓
Baseline vs Candidate Metrics
    ↓
Deterministic Promotion Gate
    ↓
受控人工发布资格

同时：
Trace 记录运行过程
Context Manager 控制进入模型的历史上下文
```

## 已完成能力

### 1. Offline Evaluation / Replay

支持计算：

- AI / Reviewer 最终结论一致率；
- PASS / REJECT / REQUIRE_HUMAN 混淆矩阵；
- 分数 MAE；
- Structured Output 最终成功率；
- Retry Recovery Rate；
- Avg / P95 Latency；
- Avg Token；
- Baseline / Candidate Agreement Delta；
- Bad Case Fix Rate；
- Regression Rate；
- Baseline / Candidate Score MAE Delta。

`EvaluationDatasetBuilder` 可以把已有 `AiReviewResult` 与人工终审结果转换成稳定离线样本。CLI 支持读取 JSON 数据集执行单版本评测和成对比较。

### 2. Prompt Promotion Gate

候选 Prompt 必须先经过同集 Replay，再由确定性策略判断：

```text
PROMOTE
REJECT
INSUFFICIENT_DATA
```

门禁支持样本量、一致率、相对提升、Bad Case 修复率、正常样本回归率和分数 MAE 等约束。

`PROMOTE` 只表示“具备进入发布流程的资格”，不会自动覆盖 Production Prompt。

### 3. Structured Trace

复用现有 `X-Trace-Id` / ContextVar，不建立第二套 Trace ID。

新增：

- 结构化 Trace Event；
- bounded in-memory sink；
- 可选 JSONL sink；
- composite sink；
- span 成功/异常记录；
- HTTP Middleware 结构化事件。

Telemetry 写入失败不会阻断 AI Review 主链。

### 4. Context Management

在线 `/v1/ai-review` 已通过 `ManagedAiReviewService` 接入 Context Manager。

支持：

- Context 类型默认优先级；
- 显式 Priority；
- 稳定 ID / canonical JSON 去重；
- per-type limit；
- item limit；
- 最终 Memory JSON 字符预算；
- 裁剪统计写入 `parsedResult.contextSelection` 与结构化 Trace。

仍保持原有 Java -> Python `memoryContext: list[dict]` 契约兼容。

## 审查阶段发现并修复的问题

### Review Finding 1: Structured Output 成功率可能被高估

初版 `EvaluationDatasetBuilder` 以 `parsedResult is not None` 判断结构化输出成功。

但现有 `AiReviewService` 在 ReviewEngine 最终失败时也会生成诊断用 `parsedResult`，其中 `engineSuccess=false`。因此仅判断对象存在会把失败样本统计为成功。

修复后：

1. 优先读取 `parsedResult.engineSuccess`；
2. `engineSuccess=false` 明确记为失败；
3. 只有旧历史数据缺少该字段时，才以 `parsedResult` 是否存在作为兼容 fallback；
4. `recoveredByRetry` 同时要求最终 Structured Output 成功。

对应新增回归测试覆盖 `engineSuccess=false` 的诊断结果。

### Review Finding 2: Context 字符预算必须与实际 Prompt 序列化一致

初版字符预算使用“每条 Context canonical JSON 长度之和”，没有计算 JSON 数组、缩进、换行、分隔符等真实开销。

修复后，`maxChars` 直接以最终传给 `ReviewEngine` 的：

```python
json.dumps(selected_items, ensure_ascii=False, indent=2, default=str)
```

长度为准，因此 `selectedChars` 与实际 Memory JSON 可解释、可验证。

## CI / 测试

审查分支配置：

```text
.github/workflows/agent-quality-review.yml
```

CI 执行：

```bash
python -m pip install -r agent/requirements.txt
python -m compileall -q agent/app agent/scripts
cd agent
pytest -q -m "not live"
```

第一轮集成 CI 已通过。审查修复进入本分支后必须再次通过同一套 CI 才视为本轮完成。

Live LLM / 外部 Provider 测试默认排除，因为它们需要真实凭据、网络和可变的第三方模型响应，不能作为确定性 CI 门禁。

## 当前能力边界

这些边界是刻意保留的，避免把项目描述得比代码更成熟：

- **还没有真实生产评测指标。** Evaluation 能算指标，但需要导入 200–500 条已经人工终审的历史样本后，才能在简历写真实一致率、Bad Case 修复率、P95 等数字。
- **Prompt Gate 不是自动发布系统。** 目前只输出 Candidate 是否 eligible；没有 Production Prompt 自动替换、数据库版本发布事务或自动回滚。
- **Trace 不是完整分布式 APM。** 当前 Python Agent 侧已有结构化事件和 HTTP Trace ID 复用，但还没有把 Java、Python、数据库持久化统一成完整 OpenTelemetry 链路。
- **Context Manager 不是 Long-term Memory。** 它治理调用方已经提供的上下文，不做 Embedding、Vector Retrieval、自动长期记忆写入。
- **现有所谓 ReAct 更准确地说是 bounded schema repair / self-correction loop。** 当前没有 Thought -> Tool Action -> Observation 的通用工具调用循环，不应在简历中包装成完整 ReAct Agent。
- **没有新增 Multi-Agent、通用 Planner 或 MCP。** 这些不是本轮质量闭环的必要依赖。

## 简历可安全描述的内容

在没有真实历史样本跑数之前，可描述：

- 建立基于人工终审 Ground Truth 的 Offline Replay / Evaluation，支持一致率、MAE、Bad Case 修复率、Regression Rate、延迟和 Token 成本评估；
- 为候选 Prompt 增加确定性质量门禁，限制正常样本回归并区分 Reject 与 Insufficient Data，避免优化结果直接在线自修改；
- 复用全链路 Trace ID 建立 Python Agent 结构化运行事件，支持 bounded memory / JSONL sink 和异常隔离；
- 对审核历史上下文实现优先级、去重、分类限流及预算控制，并实际接入 AI Review 请求链。

真实数据实验完成后，才把 `XX%` 替换为：

```text
AI / Reviewer Agreement
Structured Output Success Rate
Retry Recovery Rate
Bad Case Fix Rate
Regression Rate
P95 Latency
Average Token / Request
```

## 本轮之后最值得做的事情

不是马上上 RAG、MCP 或 Multi-Agent，而是先用真实历史终审记录构建 `reviewer-gold-v1`：

1. 抽取 300–500 条人工终审样本；
2. 固定 Baseline Prompt；
3. Replay Baseline；
4. 从 Bad Case 生成 Candidate；
5. 同集 Replay Candidate；
6. 通过 Promotion Gate；
7. 输出真实指标和失败样本分析；
8. 再根据 Context 缺失问题判断是否真的需要 Retrieval。

这一步完成后，这套工程链才会从“能力已经实现”升级成“有真实实验结果支撑”。
