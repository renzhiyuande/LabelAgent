# feat/offline-evaluation

## 目标

把 LabelAgent 现有的在线 AI 预审能力补成一个可复现、可量化的离线评测底座。该分支只负责“测得准”，不负责自动发布 Prompt，也不修改业务状态机。

这一步的核心问题是：当 Reviewer 已经给出人工终审结果后，能否稳定回答下面几件事：

1. AI 与人工最终结论的一致率是多少？
2. 分数偏差有多大？
3. Structured Output 最终成功率、Retry 恢复率是多少？
4. P95 延迟和平均 Token 成本是多少？
5. 新 Prompt 相比基线 Prompt 修复了多少历史 Bad Case，又引入了多少正常样本回归？

## 设计原则

- 人工终审结果是离线评测 Ground Truth。
- Evaluation 逻辑是纯函数，不访问数据库、不调用模型，方便复现和回归测试。
- `attemptCount` 不直接等价于 Retry 次数。现有系统包含多次成功推理/一致性策略，因此 Retry 只统计失败 LLM Attempt，避免把 Consensus Run 错算为重试。
- Structured Output 失败也必须进入评测集，不能只统计成功请求，否则成功率会虚高。
- Baseline 与 Candidate 必须在同一批人工真值样本上成对比较。

## 目录

```text
agent/
├── app/
│   ├── schemas/evaluation.py
│   └── services/
│       ├── evaluation_service.py
│       └── evaluation_dataset_builder.py
├── scripts/run_offline_evaluation.py
├── tests/
│   ├── test_evaluation_service.py
│   └── test_evaluation_dataset_builder.py
└── docs/branches/offline-evaluation/README.md
```

## 已实现能力

### 单版本质量评测

`OfflineEvaluationService.evaluate()` 输出：

- `agreementRate`: AI 与 Reviewer 结论一致率
- `confusionMatrix`: PASS / REJECT / REQUIRE_HUMAN 混淆矩阵
- `scoreMae`: AI 与人工分数 MAE
- `structuredOutputSuccessRate`: 结构化输出最终成功率
- `retryRecoveryRate`: 出现失败 Attempt 后最终恢复成功的比例
- `avgLatencyMs` / `p95LatencyMs`
- `avgTotalTokens`

### Baseline / Candidate Replay 对比

`OfflineEvaluationService.compare()` 输出：

- Baseline 与 Candidate 一致率
- `agreementDelta`
- 历史 Bad Case 修复率 `badCaseFixRate`
- 原正确样本回归率 `regressionRate`
- Baseline / Candidate 分数 MAE 及变化量

### 在线结果转离线样本

`EvaluationDatasetBuilder` 可以把现有 `AiReviewResult` 与 Reviewer 最终结论转成 `EvaluationSample`。

对于最终没有产生合法结构化结果的请求，使用 `failed_execution_sample()` 显式记录失败，而不是丢弃样本。

## CLI

在 `agent` 目录执行：

```bash
python scripts/run_offline_evaluation.py evaluate dataset.json
python scripts/run_offline_evaluation.py compare comparison.json
```

CLI 只负责读取 JSON 和输出结果，不调用在线 LLM。

## 推荐的数据集构建方式

第一批正式评测集建议从已经完成人工终审的历史任务中抽取 300–500 条；样本不足时至少保证 200 条，并尽量覆盖 PASS、REJECT、REQUIRE_HUMAN 以及高频误判类型。

数据集建议固定版本，例如：

```text
reviewer-gold-v1
reviewer-gold-v2
```

一旦作为发布门禁使用，不应该直接修改旧版本；新增或纠正样本时创建新版本，保证历史实验可以重放。

## 验收

当前分支的验收条件：

- Evaluation 核心逻辑无模型依赖。
- 正常数据、空数据、Retry 恢复、非法 Retry 状态均有测试。
- 能区分失败 Attempt 与 Consensus 成功推理。
- 能显式表示 Structured Output 最终失败样本。
- Baseline / Candidate 可以在同一 Ground Truth 上比较。
- `main` 分支保持不变。

## 本分支不做的事情

- 不自动修改 Production Prompt。
- 不决定 Candidate 是否上线；该能力放在 `feat/prompt-version-gate`。
- 不实现跨 Java/Python 的持久化 Trace；该能力放在 `feat/agent-trace`。
- 不实现 Memory/RAG。
- 不把向量库包装成所谓“Agent Memory”。

## 下一阶段

下一分支 `feat/prompt-version-gate` 会消费本分支的 `ReplayComparisonMetrics`，根据可配置门槛输出明确的 PROMOTE / REJECT 决策和失败原因。只有评测通过，Candidate Prompt 才具备进入人工发布流程的资格。
