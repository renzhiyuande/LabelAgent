# 本地开发环境

## 前置要求

| 工具 | 版本要求 | 用途 |
|------|----------|------|
| Java | 21+ | 后端编译运行 |
| Node.js | >= 18 | 前端 + 文档站 |
| pnpm | >= 9 | 前端包管理 |
| Python | 3.11+ | Agent 服务 |
| Docker + Compose | 最新 | 基础设施（MySQL/Redis/MinIO） |

---

## 步骤一：启动基础设施

推荐优先使用根目录一键脚本：

```bash
pnpm delivery:stack:up
pnpm delivery:stack:status
```

如需分别调试各服务，再按下面的分步方式启动。

```bash
docker compose up -d
```

启动三个依赖服务：

| 服务 | 镜像 | 端口 | 说明 |
|------|------|------|------|
| MySQL 8.4 | `mysql:8.4` | `3306` | 主数据库，database `labelhub` |
| Redis 7 | `redis:7` | `6379` | 缓存 + Token 存储 |
| MinIO | `minio/minio` | `9000/9001` | 对象存储 / Console |

> 首次启动后端时会自动执行 Flyway 迁移，无需手动导入 SQL。

---

## 步骤二：运行后端

```bash
# 编译
cd backend
./mvnw clean compile -DskipTests

# 运行
./mvnw spring-boot:run -pl host-app
```

后端默认监听 `http://localhost:8080`。

**API 文档**：启动后访问 `http://localhost:8080/doc.html`（Knife4j 增强 UI）。

---

## 步骤三：运行前端

```bash
cd frontend
pnpm install
pnpm dev
```

前端默认监听 `http://localhost:5173`。

Vite 配置了 `/api` 代理到后端 8080 端口，开发环境无需配置 CORS。

---

## 步骤四：运行 Python Agent

```bash
cd agent

# 创建虚拟环境
uv venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 安装依赖
uv pip install -r requirements.txt

# 运行
uvicorn app.main:app --reload --port 8000
```

Agent 默认监听 `http://localhost:8000`。

**环境变量配置**：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `LABELHUB_INTERNAL_TOKEN` | 内部通信 Token | 启动前显式设置 |
| `LABELHUB_DATASOURCE_PASSWORD` | 数据库密码 | 启动前显式设置 |
| `LABELHUB_MINIO_ACCESS_KEY` | MinIO Access Key | 启动前显式设置 |
| `LABELHUB_MINIO_SECRET_KEY` | MinIO Secret Key | 启动前显式设置 |
| `LABELHUB_AES_KEY` | AES 密钥 | 启动前显式设置 |
| `LABELHUB_LLM_OUTBOUND_ALLOW_LOCALHOST` | 开发时允许本地 LLM（如 Ollama） | `true` |
| `openai_base_url` | 默认 LLM 地址 | — |
| `openai_api_key` | 默认 LLM Key | — |
| `openai_model` | 默认模型 | — |

---

## 步骤五：运行文档站

```bash
cd project-docs
pnpm install
pnpm dev
```

文档站默认监听 `http://localhost:3000`。

---

## 常用命令

### 前端

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 开发模式 |
| `pnpm build` | 生产构建 |
| `pnpm lint` | 代码检查 |
| `pnpm test` | 运行测试（Vitest） |

### 后端

| 命令 | 说明 |
|------|------|
| `./mvnw spring-boot:run -pl host-app` | 运行后端 |
| `./mvnw test` | 运行测试 |
| `./mvnw clean compile -DskipTests` | 仅编译 |

### Agent

| 命令 | 说明 |
|------|------|
| `uvicorn app.main:app --reload --port 8000` | 开发模式 |
| `pytest` | 运行测试 |
| `pytest -v` | 详细输出 |

### 文档站

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 开发模式 |
| `pnpm build` | 静态构建 |
| `pnpm serve` | 预览构建产物 |

---

## 代码生成

### 前端类型

```bash
cd frontend
node scripts/generate-types.mjs
```

从后端 OpenAPI 文档自动生成 TypeScript 类型到 `src/generated/openapi-types.ts`。

### Flyway 迁移

```bash
# 新建迁移
# 创建 backend/host-app/src/main/resources/db/migration/V47__description.sql
```

迁移脚本需要同时复制到项目根 `db/migration/`。
