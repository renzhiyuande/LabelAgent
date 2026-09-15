# feat/agent-async-runtime

## 目标

把 LabelAgent 已有的数据库持久化异步任务机制真正接入 Agent 审核失败语义，而不是再平行创建一套 Redis List/Stream 队列。

项目原本已经具备 `async_tasks + AsyncTaskWorker + AsyncTaskHandler`：提交请求只负责落库入队，Worker 后台 claim 任务后执行，天然与 HTTP 请求线程解耦。本分支重点补齐 AI/Agent 任务此前没有真正使用到的 Retry、Dead Letter、lease heartbeat 和终态人工降级。

## 为什么没有重新造 Redis Queue

当前 `async_tasks` 本身就是 durable job queue：

```text
Submission Submit
      ↓
async_tasks (PENDING)
      ↓
AsyncTaskWorker atomic claim
      ↓
RUNNING
      ↓
AiReviewTaskHandler
      ↓
PyAgent /v1/ai-review 或 /v1/agent-review
```

相比额外引入 Redis Stream，这条链已经拥有数据库事务内入队、唯一 bizKey 幂等约束、任务状态持久化和死信字段。本阶段优先修正其可靠性语义，避免为了“用了 Redis”重复建设基础设施。

Redis 仍然保留在系统中用于现有锁、claim token 等场景；后续只有在吞吐/延迟指标证明 DB polling 成为瓶颈时，才值得增加 Redis Stream/Kafka 作为 dispatch layer，数据库继续作为 source of truth。

## 本分支改动

### 1. AI 引擎失败真正进入 Worker Retry

旧链路中：

```text
AiReviewEngine exception
    ↓
AiReviewOrchestrator catch
    ↓
立即写 FAILED + REQUIRE_HUMAN
    ↓
return
    ↓
AsyncTaskWorker 误判 handler success
    ↓
async_tasks = SUCCESS
```

因此通用 Worker 虽然实现了指数退避和 DEAD_LETTER，AI Review 实际没有消费这套能力。

本分支改为：

```text
AiReviewEngine exception
    ↓
AiReviewOrchestrator rethrow
    ↓
AiReviewTaskHandler rethrow
    ↓
AsyncTaskWorker
    ├─ retry budget remaining → PENDING + backoff
    └─ retry exhausted        → DEAD_LETTER
                                  ↓
                              onDeadLetter
                                  ↓
                          terminal AI failure record
                                  ↓
                          REQUIRE_HUMAN
```

人工降级只发生在 durable task 真正进入终态以后。

### 2. Dead-letter lifecycle hook

`AsyncTaskHandler` 新增默认 `onDeadLetter(...)` 钩子。

通用 Worker 不依赖任何审核业务；只有 `AiReviewTaskHandler` 覆盖该钩子，在 AI Review 重试耗尽后调用 `AiReviewOrchestrator.handleTerminalFailure(...)`。

这样 DLQ 机制仍然是通用基础设施，而“转人工审核”属于业务补偿。

### 3. Zombie task 消耗 Retry Budget

旧实现会把超时 RUNNING 任务直接重置为 PENDING，但不增加 retryCount。进程持续崩溃时，同一个 poison task 可以永久复活。

现在每次 lease timeout 都按一次失败计数：

```text
RUNNING lease expired
   ↓
retryCount + 1
   ├─ < maxRetry → delayed PENDING
   └─ >= maxRetry → DEAD_LETTER
```

### 4. Worker lease heartbeat

长耗时 Agent/LLM 调用期间，Worker 周期刷新 `locked_at`。

Heartbeat 只会更新满足下面条件的记录：

```text
id = current task
status = RUNNING
worker_id = current worker
```

因此多实例部署时，正常长任务不会因为超过 claim timeout 被另一个实例误恢复；进程真正崩溃后 heartbeat 停止，才进入 zombie recovery。

### 5. Backoff

Worker 使用有上限的指数退避：

```text
retryDelay = min(baseDelay * 2^(retry-1), maxDelay)
```

代码默认：

- base delay: 1000 ms
- max delay: 60000 ms
- max retry count: 沿用任务记录，默认 3

Spring 配置项：

```text
labelhub.async.retry-base-delay-ms
labelhub.async.retry-max-delay-ms
labelhub.async.heartbeat-interval-ms
```

### 6. Agent endpoint 灰度开关

`PyAgentAiReviewEngine` 不改变 Java `AiReviewEngine` 契约，通过：

```text
labelhub.review.pyagent-endpoint
```

选择 Python 路径：

```text
/v1/ai-review       # 原固定审核链，默认
/v1/agent-review    # bounded tool-using Agent loop
```

也可以通过 Spring relaxed binding 使用环境变量：

```text
LABELHUB_REVIEW_PYAGENT_ENDPOINT=/v1/agent-review
```

因此可以先保持 legacy path，再按环境灰度切 Agent Runtime。

### 7. Trace correlation

Java → Python 请求新增稳定 `X-Trace-Id`：

```text
ai-review-{submissionId}-v-{submissionVersionId}
```

同一 submission version 的队列重试能够关联到同一业务执行链，Python 现有 RequestLoggingMiddleware / structured trace 会继续复用该 Trace ID。

## 状态机边界

本分支仍坚持：

```text
Async Runtime / Python Agent
        ↓
产生审核结果或失败
        ↓
Java SubmissionStateMachine
        ↓
唯一业务状态 Source of Truth
```

Agent 不能直接修改 Submission 状态。

## 测试

新增：

```text
backend/host-app/src/test/java/com/labelhub/infra/async/AsyncTaskWorkerTest.java
backend/host-app/src/test/java/com/labelhub/app/review/AiReviewTaskHandlerAsyncTest.java
```

覆盖：

- handler 首次失败进入 delayed retry；
- retry budget 耗尽进入 DEAD_LETTER；
- dead-letter hook 被调用；
- zombie task 消耗 retry budget；
- AI handler 必须把引擎异常向 Worker 传播；
- AI dead-letter 才触发 terminal human fallback。

GitHub Actions 同时运行 Python Agent tests 和 Java async runtime tests。

## 当前明确边界

本分支解决的是 durable async execution，不等于完整 Agent persistence。

尚未在本分支实现：

- `agent_run / agent_step / tool_call` 持久化；
- checkpoint/resume 到具体 Agent Step；
- Worker 并发池 / 项目级限流；
- circuit breaker；
-真实 Rule/History Tool 的后端调用；
- Reviewer Gold 数据集。

这些按后续分支继续实现，避免把多个生命周期问题一次性揉成不可审查的大改动。
