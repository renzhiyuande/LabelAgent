# LabelHub — 数据标注与 AI 辅助审核平台

LabelHub 是一个可扩展的数据标注与 AI 辅助审核平台。系统以 **Java 后端** 作为主业务核心，**前端** 提供运营与标注工作台，**Python Agent** 承载 LLM 调用、Prompt 编排与结构化输出能力。

## 提交说明

- 比赛提交材料入口：`submission/`
- 项目文档站入口：`project-docs/`
- 本仓库已移除开发残留目录与默认口令；启动前需要显式设置数据库、MinIO、内部鉴权和 AES 相关环境变量

## 架构概览

```
┌─────────────────────────────────────────────────┐
│                   Frontend                        │
│      Refine + shadcn/ui + Tailwind CSS v4         │
│      自研低代码引擎 · 标注工作台 · 审核工作台        │
└────────────────────┬────────────────────────────┘
                     │ HTTP REST (JSON)
┌────────────────────▼────────────────────────────┐
│              Java Backend (Spring Boot 3.4)       │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌───────┐ │
│  │ host-app│ │host-core│ │host-infra│ │plugin │ │
│  │ Controller│ │ Service │ │ Mapper/DB │ │(φ)   │ │
│  └─────────┘ └─────────┘ └──────────┘ └───────┘ │
└────────────────────┬────────────────────────────┘
                     │ REST (Internal Token)
┌────────────────────▼────────────────────────────┐
│           Python Agent (FastAPI)                  │
│   AiReviewService · LLM Client · PromptService    │
│   ReAct Review Engine · OpenAI 兼容协议            │
└─────────────────────────────────────────────────┘
         │                │               │
    ┌────▼───┐       ┌───▼────┐      ┌───▼────┐
    │ MySQL  │       │ Redis  │      │ MinIO  │
    │  8.4   │       │   7    │      │        │
    └────────┘       └────────┘      └────────┘
```

## 技术栈

### 后端
| 技术 | 版本 |
|------|------|
| Java | 21 |
| Spring Boot | 3.4.6 |
| MyBatis-Plus | 3.5.12 |
| Spring Security + 自定义 Bearer Token | 随 Spring Boot |
| MySQL | 8.4 |
| Redis | 7 (Lettuce) |
| Flyway | 数据库迁移 |
| COLA StateMachine | 状态机 |
| Apache POI | Excel 导出 |
| MinIO | 文件存储 |
| Knife4j + SpringDoc | API 文档 (`/doc.html`) |
| Testcontainers | 集成测试 |

### 前端
| 技术 | 版本 |
|------|------|
| React | 18 |
| Refine | 4.57 |
| TypeScript | 5.7+ |
| Vite | 6.0+ |
| Tailwind CSS | v4 |
| shadcn/ui | New York 风格 |
| Zustand | 5.0 |
| TanStack React Query | 4.44 |
| Vitest | 测试框架 |
| Lucide React | 图标 |

### Python Agent
| 技术 | 版本 |
|------|------|
| Python | 3.11+ |
| FastAPI | 0.115.6 |
| Pydantic v2 | 2.10.4 |
| OpenAI SDK | (OpenAI 兼容协议) |
| pytest | 8.3.4 |

## 快速启动

### 前置条件
- JDK 21+
- Node.js 20+
- Python 3.11+
- Docker & Docker Compose

### 1. 一键启动整套本地交付面

先准备必要环境变量：

```bash
export LABELHUB_DATASOURCE_USERNAME=your-db-user
export LABELHUB_DATASOURCE_PASSWORD=your-db-password
export LABELHUB_MYSQL_ROOT_PASSWORD=your-mysql-root-password
export LABELHUB_MINIO_ACCESS_KEY=your-minio-access-key
export LABELHUB_MINIO_SECRET_KEY=your-minio-secret-key
export LABELHUB_INTERNAL_TOKEN=your-internal-token
export LABELHUB_AES_KEY=your-32-byte-aes-key
```

```bash
pnpm delivery:stack:up
```

默认会：

- 复用本机已经存在的 `3306 / 6379 / 9000` 基础设施；若缺失则拉起仓库 `docker-compose.yml`
- 启动 backend `:8080`
- 启动 Python Agent `:8000`
- 启动 frontend `:5173`
- 启动交付看板 `:3001`

状态与停机：

```bash
pnpm delivery:stack:status
pnpm delivery:stack:down
```

在 macOS 上，如果 Docker daemon 尚未就绪，脚本会先尝试自动拉起 Docker Desktop 并等待；如果最终仍不可达，再按提示手工启动 Docker Desktop，或者直接复用你已经手工准备好的 `3306 / 6379 / 9000` 本地基础设施。

### 2. 仅启动基础设施

```bash
docker compose up -d
# 启动 MySQL 8.4 + Redis 7 + MinIO
```

### 3. 手动启动后端

```bash
cd backend
./mvnw clean install -DskipTests
./mvnw spring-boot:run -pl host-app
# API 文档: http://localhost:8080/doc.html
```

### 4. 手动启动 Python Agent

```bash
cd agent
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 5. 手动启动前端

```bash
cd frontend
pnpm install
pnpm dev
# 浏览器: http://localhost:5173
```

### 6. 导出提交包 OpenAPI 固化件

```bash
pnpm delivery:openapi
```

默认从 `http://127.0.0.1:8080` 导出到 `submission/api/`；如果后端运行在其他端口，可覆盖：

```bash
LABELHUB_OPENAPI_BASE_URL=http://127.0.0.1:8082 pnpm delivery:openapi
```

### Docker Compose 基础设施层

当前仓库的 `docker-compose.yml` 负责基础设施容器：

```yaml
# docker-compose.yml 当前包含：
# - mysql:8.4
# - redis:7
# - minio:latest
```

业务服务的推荐启动入口不是直接扩展 compose，而是根目录一键脚本：

```bash
pnpm delivery:stack:up
pnpm delivery:stack:status
pnpm delivery:stack:down
```

## 项目目录结构

```
backend/                     # Java 后端（Maven 多模块）
├── host-app/                # Spring Boot 启动应用
│   └── src/main/resources/db/migration/  # Flyway 迁移 (当前至 V46)
├── host-core/               # 应用服务、统一 API 契约、核心业务接口
├── host-domain/             # 领域模型、枚举、状态
├── host-infra/              # DB/Redis/MinIO/Security 基础设施实现
├── plugins-api/             # 插件 SPI 契约（预留）
└── host-plugin/             # 插件宿主（预留占位）

agent/                       # Python FastAPI Agent 服务
├── app/
│   ├── services/            # AiReviewService, ReviewEngine, PromptService
│   ├── schemas/             # Pydantic 请求/响应模型
│   ├── core/                # 配置、LLM Runtime、日志
│   └── middleware/          # 请求日志中间件
└── tests/                   # 测试 (pytest)

frontend/                    # React + Vite 前端
├── src/
│   ├── app/                 # 路由、布局、认证守卫
│   ├── components/          # UI 组件库 (shadcn/ui + workbench)
│   ├── features/            # 业务功能垂直切片
│   │   ├── business/        # Owner 任务管理
│   │   ├── labeler/         # 标注员工作台
│   │   ├── review/          # 审核员功能
│   │   ├── template-designer/  # 模板设计器
│   │   └── system/          # 系统管理
│   ├── low-code/            # 自研低代码 CRUD 引擎
│   ├── providers/           # Refine data/auth provider
│   └── stores/              # Zustand 状态管理
└── scripts/                 # OpenAPI 类型生成

docs/                        # 仅保留赛题原文
db/migration/                # Flyway 迁移副本
```

## 核心功能

- **模板管理** — 可视化模板设计器 + 版本管理 (schema JSON)
- **任务管理** — 任务创建/发布/暂停/导入标注数据
- **标注员工作台** — 领任务 → 作答 → 自动保存草稿 → 提交 → 看审核结果
- **AI 预审** — Python Agent ReAct 循环多维度评分 (PASS/REJECT/REQUIRE_HUMAN)
- **人工审核** — 多级审核工作台 (通过/驳回/打回修改)
- **申诉** — 标注员申诉 → 审核员二次判定
- **数据导出** — JSON / JSONL / CSV / Excel (Apache POI) 异步导出
- **奖励结算** — 按通过数 × 单价自动计算报酬
- **低代码引擎** — Schema 驱动的列表/表单/详情 CRUD 页面
- **密度系统** — s/m/l 三档 UI 密度
- **暗色模式** — 亮色/暗色自动切换

## 测试

```bash
# 前端测试 (Vitest)
cd frontend && pnpm test

# 后端测试 (JUnit 5 + Testcontainers)
cd backend && ./mvnw test

# Python Agent 测试
cd agent && pytest
```

共 142+ 测试文件（前端 75 + 后端 56 + Python 11），覆盖状态机、序列化、表单校验、AI 审核引擎等核心逻辑。

## 许可证

内部项目。
