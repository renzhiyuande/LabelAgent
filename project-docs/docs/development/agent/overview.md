# Python Agent 服务

## 概述

Python Agent 是 LabelHub 的 **LLM 统一接入服务**，基于 FastAPI 构建。作为 Java 后端与各大 LLM 厂商之间的抽象网关，负责 AI 审核、结构化输出、Prompt 编排等任务。

**位置**：`agent/`

**技术栈**：Python 3.11+, FastAPI 0.115.6, Pydantic v2, OpenAI Python SDK, pytest

---

## 架构总览

```
Java 后端
    │ REST (X-Internal-Token)
    ▼
Python Agent (FastAPI)
    ├── /health                         公开
    ├── /internal/health                内部 Token
    ├── /internal/llm/chat              LLM 聊天代理
    ├── /internal/llm/list-models       模型列表
    └── /v1/ai-review ★                 核心：AI 审核引擎
            │
            ├── Prompt Service (prompt 编排)
            ├── Review Engine (ReAct 自修正循环)
            ├── LLM Client (OpenAI SDK 调用)
            └── LLM Runtime (配置解析 + 多 Provider 支持)
```

---

## API 端点

| 端点 | 鉴权 | 用途 |
|------|------|------|
| `GET /health` | 无 | 公开健康检查 |
| `GET /internal/health` | Internal Token | 内部健康检查 |
| `POST /internal/llm/chat` | Internal Token | 原始聊天代理，自动降级 response_format |
| `POST /internal/llm/list-models` | Internal Token | 获取模型的可用模型列表 |
| `POST /v1/ai-review` | Internal Token | **AI 审核** — 核心业务端点 |

---

## AI 审核引擎

### 请求流

```
AiReviewRequest
    │
    ▼
AiReviewService.execute()
    ├── 规范化维度定义（默认 overall_quality）
    ├── 解析 LLM Runtime 配置（三级覆写链）
    ├── PromptService.build_review_prompt_from_specs()
    └── ReviewEngine.run()
            │
            ├── 组装 messages (system + user + memory)
            ├── 动态生成 Pydantic 结构化输出 Schema
            │   （运行时为每个维度创建 conint(0,100) 字段）
            ├── LLMClient.call_with_structured_output()
            ├── 验证 → 成功 → 返回 AiReviewResult
            └── 失败 → ReAct 自修正循环（最多 3 次）
                     └── 全部失败 → verdict="manual" (REQUIRE_HUMAN)
```

### ReAct 自修正

当 LLM 返回的结构化输出校验失败时，引擎会自动将错误信息和前一次的输出追加到消息列表，然后重试。最多重试 3 次，全部耗尽则返回人工审核标记。

### 动态 Schema 生成

审核维度运行时确定——`create_dynamic_llm_result_model()` 在运行时生成 Pydantic 模型，每个维度对应一个 `conint(0,100)` 字段。无需预定义 Schema。

---

## LLM Runtime 配置

### 三级覆写链

```
1. 请求字段（llm_base_url, llm_api_key, model_id）—— 最高优先级
2. 平台配置（LABELHUB_AGENT_PLATFORM_PROFILES 环境变量，JSON 对象）
3. 环境默认值（openai_base_url, openai_api_key, openai_model）
```

### LLM 客户端

`LLMClient` 统一封装 OpenAI 兼容协议：

| 方法 | 用途 |
|------|------|
| `call_openai_compatible()` | 系统 + 用户 Prompt → JSON 输出 |
| `call_with_full_messages()` | 任意消息列表 → 字典输出 |
| `call_with_structured_output()` | Pydantic 模型 → `beta.chat.completions.parse()` 结构化输出 |

每次调用通过 `LlmRuntimeConfig` 注入 base_url / api_key / model / timeout——无全局客户端状态。

---

## Prompt 编排

**位置**：`app/services/prompt_service.py`

| 方法 | 用途 |
|------|------|
| `build_review_prompt()` | 简单路径：题面 + 标注字段 + 枚举维度，强制 `{scores, verdict, reason}` 格式 |
| `build_review_prompt_from_specs()` | 完整路径：每个维度独立配置 `promptInstruction`、`scoreMin/Max`、`llm_names` 映射 |

两种路径均支持任意数量的维度和字段——零硬编码。

---

## Response Format 降级

**位置**：`app/llm_response_format.py`

`/internal/llm/chat` 端点自动尝试以下 response_format 优先级：

1. `json_schema` with `strict: true`（如果输出 Schema 有 properties）
2. `json_object`
3. `null`（无格式约束）

遇到 HTTP 400/404/422 自动降级到下一个格式。

---

## 安全

### 内部 Token 鉴权

- 端点通过 `Depends(require_internal_token)` 保护
- `X-Internal-Token` 与 `LABELHUB_INTERNAL_TOKEN` 环境变量比对
- 无效 Token 返回 401（错误码 `INTERNAL_UNAUTHORIZED`）

### SSRF 防护

`outbound_url_guard.py` 在每次 LLM HTTP 请求前执行：
- 仅允许 `http`/`https` 协议
- 拒绝 URL 中的内嵌凭据
- 阻止云元数据端点（metadata.google.internal 等）
- DNS 解析后检查 IP：拒绝内网/回环/多播/保留地址
- 通过 `LABELHUB_LLM_OUTBOUND_ALLOW_LOCALHOST=true` 可放开本地地址（开发环境）

### 日志脱敏

- `mask_secret()` 仅显示 API Key 的后 4 位
- `safe_json()` 截断超过 4K 字符的日志
- `summarize_chat_messages()` 将消息数组压缩为 `{role, contentLen, preview}` 紧凑格式
- TraceId 通过 `ContextVar` 跨请求传递，注入每个日志记录

---

## 测试

**框架**：pytest

| 测试文件 | 说明 |
|----------|------|
| `test_main.py` | 健康检查端点 + Token 鉴权 |
| `test_ai_review.py` | 审核端点契约、失败降级、参数校验 |
| `test_ai_review_p0_whitebox.py` | 参数化 verdict 映射、维度分数一致性、ReAct 重试 |
| `test_review_engine.py` | 引擎核心逻辑 |
| `test_llm_chat.py` | 聊天代理端点 |
| `test_llm_models.py` | 模型列表端点 |
| `test_llm_runtime.py` | Runtime 配置解析 |
| `test_outbound_url_guard.py` | SSRF 防护（公网 IP 放行/内网 IP 拦截/localhost 开关） |
| `test_llm_response_format.py` | Response Format 降级逻辑 |
