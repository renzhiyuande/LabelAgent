# LabelHub 项目文档站

LabelHub 数据标注平台的完整项目文档，基于 Docusaurus 构建。

## 目录结构

```
docs/
├── intro.md                # 项目概览
├── architecture.md         # 整体架构
├── quick-start.md          # 快速启动
├── lowcode/                # 低代码引擎文档（含 guide/ + references/）
├── workbench/              # 工作台系统
├── template-designer/      # 模板设计器
├── labeler/                # 标注工作台
├── reviewer/               # 审核工作台
├── backend/                # 后端服务
├── agent/                  # Python Agent
└── development/            # 开发指南
```

## 本地开发

```bash
pnpm install
pnpm dev
```

## 构建

```bash
pnpm build
```

构建产物在 `build/` 目录。
