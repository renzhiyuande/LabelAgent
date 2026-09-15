# feat/prompt-version-gate

## 目标

在已有 Offline Replay / Evaluation 之上增加一个确定性的 Prompt 晋升门禁。该分支解决的问题不是“如何生成候选 Prompt”，而是：**候选 Prompt 是否有足够证据证明它比当前基线更安全、更有效。**

本分支仍然不直接改线上 Prompt。门禁只输出“是否具备晋升资格”和失败原因，真正的发布动作仍应由人工或后端受控流程完成。

## 为什么需要门禁

现有 `prompt_optimizer_service.py` 已经能够基于 AI / Reviewer 不一致样本生成 Candidate Prompt，但如果 Candidate 生成后直接替换 Production Prompt，会有几个风险：

- 只修复历史 Bad Case，却让大量原本正确的样本回归；
- 样本数量太少，偶然性被误认为提升；
- 结论一致率提高，但评分 MAE 明显恶化；
- 某些指标缺失时仍然误判为“通过”。

因此 Candidate 必须先经过与 Baseline 同集 Replay，再由确定性门禁判断。

## 依赖

本分支基于：

```text
feat/offline-evaluation
```

直接消费 `ReplayComparisonMetrics`，不重新计算评测指标。

## 新增结构

```text
agent/
├── app/
│   ├── schemas/prompt_gate.py
│   └── services/prompt_promotion_gate.py
├── tests/test_prompt_promotion_gate.py
└── docs/branches/prompt-version-gate/README.md
```

## 决策模型

门禁有三种结果：

- `PROMOTE`：全部要求满足，Candidate 具备进入发布流程的资格；
- `REJECT`：证据充分，但 Candidate 未达到质量门槛；
- `INSUFFICIENT_DATA`：样本不足或策略要求的指标缺失，不能据此做发布判断。

`PROMOTE` 不等于“已经上线”。它只是一个可审计的 eligibility 结果。

## 可配置策略

`PromptPromotionPolicy` 支持：

- `minSampleCount`
- `minCandidateAgreementRate`
- `minAgreementDelta`
- `minBadCaseFixRate`
- `maxRegressionRate`
- `maxScoreMaeDelta`

其中最重要的不是单纯要求一致率上涨，而是同时限制 Regression Rate。这样可以避免 Candidate 通过“过拟合历史 Bad Case”换取表面指标提升。

默认策略不是业务真理。正式上线前应根据真实数据分布和 Reviewer 标注稳定性重新标定阈值。

## 示例判定

假设 Baseline / Candidate 在 300 条相同人工真值样本上 Replay：

```text
Baseline agreement: 76%
Candidate agreement: 82%
Bad-case fix rate:   41.7%
Regression rate:      2.2%
Score MAE delta:     -1.1
```

若策略为：

```text
minSampleCount = 200
minCandidateAgreementRate = 0.80
minBadCaseFixRate = 0.30
maxRegressionRate = 0.05
maxScoreMaeDelta = 0
```

则 Candidate 可以得到 `PROMOTE`。

如果 Bad Case 修复率很高，但 Regression Rate 达到 8%，门禁会返回 `REJECT`。

## 安全边界

本分支明确不做：

- 不自动覆盖 Production Prompt；
- 不允许 LLM 自己决定是否发布自己生成的 Prompt；
- 不绕过 Offline Replay；
- 不因为单个总分指标上涨就晋升；
- 不把缺失指标当成通过。

## 验收标准

- 同版本 Baseline / Candidate 禁止比较。
- 样本不足返回 `INSUFFICIENT_DATA`。
- Candidate 对原正确样本回归超过阈值时必须阻断。
- 策略要求但无法计算的指标返回 `INSUFFICIENT_DATA`。
- 所有检查项都返回实际值、操作符、阈值和结果，方便后续持久化与审计。
- `main` 分支保持不变。

## 下一阶段

下一分支 `feat/agent-trace` 会为 AI Review、Prompt Optimize、Offline Evaluation 和 Promotion Gate 建立统一的运行事件模型，目标是让一次候选 Prompt 从生成、评测到门禁决策能够被同一个 Trace 串起来。
