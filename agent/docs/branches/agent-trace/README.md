# feat/agent-trace

## 目标

在 LabelAgent 现有 `x-trace-id -> ContextVar -> 日志` 基础上增加结构化 Trace Event，让一次 Agent 请求除了“有日志”之外，还能得到可程序化分析的运行事件。

本分支不会另造一套 Trace ID，而是复用现有 `set_trace_id()` / `get_trace_id()`；这样 Java 后端只要继续透传同一个 `X-Trace-Id`，Python Agent 的日志和结构化事件就可以沿同一个链路关联。

## 为什么不是只打日志

普通文本日志适合人工排障，但很难稳定统计：

- 某类操作成功率；
- P95 / P99 延迟；
- 某个 Trace 内经历了哪些步骤；
- 哪个阶段失败；
- 后续 Prompt 版本、Evaluation、Gate 决策之间的关联。

结构化 Trace Event 把这些字段固定下来，后续可以写入数据库、日志平台或 OpenTelemetry Adapter，而不必重新解析字符串日志。

## 新增结构

```text
agent/
├── app/
│   ├── schemas/trace.py
│   ├── observability/
│   │   ├── __init__.py
│   │   ├── trace_recorder.py
│   │   └── runtime_trace.py
│   └── middleware/request_logging.py
├── tests/test_trace_recorder.py
└── docs/branches/agent-trace/README.md
```

## Trace Event

当前事件包含：

- `traceId`
- `eventId`
- `parentEventId`
- `component`
- `operation`
- `status`
- `occurredAt`
- `durationMs`
- `attributes`
- `errorType`
- `errorMessage`

当前 HTTP Middleware 会记录：

```text
component = http
operation = METHOD + PATH
status = SUCCESS / ERROR
attributes.statusCode = HTTP Status
```

默认不把请求体、Prompt 正文、API Key、Authorization、Query 参数写入结构化 Trace。

## Sink

### InMemoryTraceSink

默认启用，保留最近一段事件，用于本地调试和测试。容量由：

```text
LABELHUB_TRACE_MEMORY_EVENTS
```

控制，默认 2000。

### JsonlTraceSink

如果设置：

```text
LABELHUB_TRACE_JSONL_PATH=/path/to/agent-trace.jsonl
```

事件会额外追加到 JSONL 文件。

JSONL 是当前阶段刻意选择的最小持久化实现：依赖少、容易查看、方便离线导入。后续如果要接 Loki / ELK / OpenTelemetry，可以实现新的 `TraceSink`，业务调用侧不需要重写。

### CompositeTraceSink

同一个 Event 可以扇出到多个 Sink。某个 Telemetry Sink 写失败时只记录异常，不允许影响 AI Review 主业务链路。

## Span

`TraceRecorder.span()` 提供同步操作的统一计时和异常记录：

```python
with recorder.span(component="prompt", operation="promotion_gate"):
    ...
```

正常退出记录 `SUCCESS`，异常记录 `ERROR`、异常类型、截断后的错误信息，并继续抛出原异常。

## HTTP 链路集成

`RequestLoggingMiddleware` 已接入结构化 Event，并继续保留原有文本日志与 `x-trace-id` 响应头。

这意味着当前请求最少会形成一个 HTTP 级 Event；后续内部 AI Review / Prompt Optimize / Evaluation / Promotion Gate 可以继续使用同一个 Recorder 增加子事件。

## 安全边界

- 不自动记录 Prompt / Response 全文。
- 不自动记录 API Key、Header Token。
- 不记录 Client IP 到结构化 Trace。
- JSONL Sink 故障不能阻断业务。
- Error Message 最大保留 1000 字符，避免异常堆栈或上游返回体无限膨胀。
- 当前不是完整 OpenTelemetry 实现，也不冒充分布式 APM。

## 验收标准

- 复用现有 Trace ID，不产生双 Trace 体系。
- 内存 Sink 有容量上限。
- JSONL 按 alias 字段序列化，可直接被后处理程序消费。
- Span 成功/异常均产生事件。
- HTTP Middleware 产生结构化请求事件。
- Telemetry 写入失败不会影响主业务调用。
- `main` 分支保持不变。

## 已知边界

当前只完成 Python Agent 侧结构化 Trace 基础设施和 HTTP 入口事件。Java 侧目前已有 Request ID / 审核业务链路基础，但本分支没有修改 Java，因此不能把这一版描述成“完整跨服务 Trace Persistence”。

如果后续要做到严格的端到端 Trace，应在 Java 持久化审核记录时同时保存 `traceId`，并在调用 Python Agent 时继续透传。

## 下一阶段

下一分支 `feat/context-management` 会治理现在的 `memoryContext`：明确上下文类型、优先级、去重和预算裁剪，避免历史信息无限拼接到 Prompt。
