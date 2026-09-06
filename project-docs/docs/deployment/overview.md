# 部署指南

> **关联文档**：[快速启动](../quick-start)、[开发环境搭建](../development/getting-started)

---

## 1. 环境要求

| 组件 | 版本要求 | 用途 |
|------|----------|------|
| Docker & Docker Compose | Docker 24+ | 基础设施容器化 |
| Java | 21 | 后端运行环境 |
| Node.js | 20+ | 前端构建运行 |
| pnpm | 9+ | 前端包管理 |
| Python | 3.11+ | Python Agent 运行环境 |

---

## 2. 本地开发部署

### 2.0 推荐入口：一键启动整套交付面

```bash
pnpm delivery:stack:up
pnpm delivery:stack:status
pnpm delivery:stack:down
```

默认会拉起或复用：

- MySQL / Redis / MinIO
- backend `:8080`
- agent `:8000`
- frontend `:5173`
- 交付看板 `:3001`

如果当前机器没有运行 Docker daemon，脚本会先尝试在 macOS 上自动拉起 Docker Desktop 并等待；如果最终仍不可达，才会在基础设施预检阶段退出，并提示你：

- 启动 Docker Desktop / Docker daemon
- 或者手工准备 MySQL / Redis / MinIO，并监听默认 `3306 / 6379 / 9000`

### 2.1 启动基础设施

```bash
# 启动 MySQL 8.4、Redis 7、MinIO
docker compose up -d
```

| 服务 | 端口 | 凭据来源 | 用途 |
|------|------|----------|------|
| MySQL 8.4 | 3306 | 启动前显式设置 `LABELHUB_MYSQL_*` / `LABELHUB_DATASOURCE_*` | 主数据库 |
| Redis 7 | 6379 | — | 缓存 + Session |
| MinIO | 9000 / 9001 | 启动前显式设置 `LABELHUB_MINIO_*` | 对象存储 / Console |

### 2.2 启动后端

```bash
cd backend
./mvnw spring-boot:run -pl host-app
```

后端默认监听 `http://localhost:8080`。

**API 文档**：启动后访问 `http://localhost:8080/doc.html`（Knife4j 增强 UI）。

**数据库迁移**：首次启动会自动执行 Flyway 迁移，脚本位于 `backend/host-app/src/main/resources/db/migration/`，当前仓库已到 `V46`。

### 2.3 启动前端

```bash
cd frontend
pnpm install
pnpm dev
```

前端默认监听 `http://localhost:5173`。

**API 代理**：Vite 配置了 `/api` 代理到后端 8080 端口，开发时无需配置 CORS。

### 2.4 启动 Python Agent

```bash
cd agent

# 创建虚拟环境
uv venv
source .venv/bin/activate

# 安装依赖
uv pip install -r requirements.txt

# 启动服务（需先配置 LABELHUB_INTERNAL_TOKEN）
export LABELHUB_INTERNAL_TOKEN=your-secret-token
uvicorn app.main:app --reload --port 8000
```

Agent 默认监听 `http://localhost:8000`，提供两个健康检查端点：
- `/health` — 公开
- `/internal/health` — 需 X-Internal-Token 鉴权

### 2.5 启动文档站

```bash
cd project-docs
pnpm install
pnpm dev
```

文档站默认监听 `http://localhost:3000`。

---

## 3. 环境变量配置

### 3.1 后端环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SPRING_PROFILES_ACTIVE` | 激活配置文件 | `dev` |
| `MYSQL_HOST` | MySQL 主机 | `localhost` |
| `MYSQL_PORT` | MySQL 端口 | `3306` |
| `MYSQL_DB` | MySQL 数据库名 | `labelhub` |
| `REDIS_HOST` | Redis 主机 | `localhost` |
| `MINIO_ENDPOINT` | MinIO 地址 | `http://localhost:9000` |
| `LABELHUB_DATASOURCE_PASSWORD` | 数据库密码 | 启动前显式设置 |
| `LABELHUB_MYSQL_ROOT_PASSWORD` | Compose 初始化 root 密码 | 启动前显式设置 |
| `LABELHUB_MINIO_ACCESS_KEY` | MinIO Access Key | 启动前显式设置 |
| `LABELHUB_MINIO_SECRET_KEY` | MinIO Secret Key | 启动前显式设置 |
| `LABELHUB_INTERNAL_TOKEN` | 内部服务调用 Token | 启动前显式设置 |
| `LABELHUB_AES_KEY` | LLM 密钥解密 AES Key | 启动前显式设置 |

### 3.2 Agent 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `LABELHUB_INTERNAL_TOKEN` | 内部鉴权 Token（需与后端一致） | 启动前显式设置 |
| `LLM_API_KEY` | LLM 服务 API Key | — |
| `LLM_BASE_URL` | LLM 服务地址 | — |

---

## 4. 生产部署注意事项

### 4.1 安全配置

- 修改所有默认密码（数据库、Redis、MinIO）
- 配置强 `INTERNAL_TOKEN`
- 关闭 MinIO 公共访问
- 配置 HTTPS

### 4.2 性能优化

- 后端增加 JVM 堆内存配置（`-Xms4g -Xmx4g`）
- 前端构建生产版本（`pnpm build`）
- Agent 增加 uvicorn worker 数（`--workers 4`）
- 配置数据库连接池大小

### 4.3 日志与监控

- 日志文件轮转配置
- 配置 Prometheus + Grafana 监控（待后续集成）
- 配置告警通知

---

## 5. 数据库迁移

Flyway 迁移脚本位于：
- `backend/host-app/src/main/resources/db/migration/`
- `db/migration/`

当前仓库已实现 `V1 ~ V46`。最新版本包括：

| 版本 | 说明 |
|------|------|
| V1 | 基础表结构：用户、角色、权限、业务主表 |
| V18 | 定时任务能力 |
| V30 | API 凭证与奖励结算增强 |
| V40 | 提交申诉分支状态 |
| V45 | DeepSeek LLM 目录种子 |
| V46 | 默认 LLM 切换到 DeepSeek |

**手动执行迁移**：

```bash
cd backend
./mvnw flyway:migrate -pl host-app
```

新增迁移时，需同时更新：

- `backend/host-app/src/main/resources/db/migration/`
- `db/migration/`
