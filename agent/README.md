# 启动项目

先配置环境变量（可复制为本地 `agent/.env`，勿提交仓库）：

```bash
export LABELHUB_AGENT_OPENAI_BASE_URL=https://api.deepseek.com
export LABELHUB_AGENT_OPENAI_API_KEY=<your-deepseek-api-key>
export LABELHUB_AGENT_OPENAI_MODEL=deepseek-v4-flash
```

或由 Java 后端在调用 `/v1/prompt-optimize`、`/v1/ai-review` 时注入 `llmBaseUrl` / `llmApiKey`（需 DB `llm_providers.provider_code=deepseek` 已配置可解密密钥）。

```bash
uvicorn app.main:app --reload --port 8000
```