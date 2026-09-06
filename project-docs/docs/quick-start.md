# 快速启动

## 一键启动整套本地交付面

```bash
pnpm delivery:stack:up
```

默认行为：

- 优先复用本机已运行的 MySQL / Redis / MinIO
- 自动启动 backend `:8080`
- 自动启动 agent `:8000`
- 自动启动 frontend `:5173`
- 自动启动本地推进看板 `:3001`
- 若本机已经有基础设施占用 `3306 / 6379 / 9000`，脚本会直接复用，不重复起容器

状态与停机：

```bash
pnpm delivery:stack:status
pnpm delivery:stack:down
```

启动成功后建议依次检查：

- backend：`http://localhost:8080/actuator/health`
- agent：`http://localhost:8000/health`
- frontend：`http://localhost:5173`
- board：`http://localhost:3001/api/board`

在 macOS 上，如果 Docker daemon 尚未就绪，脚本会先尝试自动拉起 Docker Desktop 并等待；如果最终仍不可达，再按提示手工启动 Docker Desktop，或者直接复用你已经手工准备好的 `3306 / 6379 / 9000` 本地基础设施。

## 仅启动基础设施

```bash
docker compose up -d
```

启动三个依赖服务：

| 服务 | 端口 | 用途 |
|------|------|------|
| MySQL 8.4 | 3306 | 主数据库 |
| Redis 7 | 6379 | 缓存 + Session |
| MinIO | 9000 / 9001 | 对象存储 / Console |

## 运行后端

```bash
cd backend
./mvnw spring-boot:run -pl host-app
```

后端默认监听 `http://localhost:8080`，API 文档访问 `/doc.html`。

## 运行前端

```bash
cd frontend
pnpm install
pnpm dev
```

前端默认监听 `http://localhost:5173`。

## 运行 Python Agent

```bash
cd agent
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## 运行文档站

```bash
cd project-docs
pnpm install
pnpm dev
```

## 常见问题

**OpenAPI 固化件导出**：执行 `pnpm delivery:openapi`，默认会把 backend `public/internal` OpenAPI 与 Agent 契约导出到 `submission/api/`。

**数据库迁移**：首次启动后端会自动执行 Flyway 迁移，脚本位于 `backend/host-app/src/main/resources/db/migration/`。

**前端 API 代理**：Vite 配置了 `/api` 代理到后端 8080 端口。

**Agent 内部 Token**：启动前配置 `INTERNAL_TOKEN` 环境变量，与后端保持一致。
