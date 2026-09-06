# LabelHub 数据标注平台 · AI全栈课题实现要求

**课题名称：** LabelHub 数据标注平台

**适合方向：** 全栈（前端架构 \+ 后端工程 \+ AI Agent 落地）

**预期成果：** 一套覆盖「数据生产 → AI 预审 → 人工审核 → 多格式导出」全生命周期的 Web 标注平台

## 一、课题背景

在大模型与 Agent 训练调优极度依赖高质量业务数据的背景下，**提升数据生产效率与标注质量**已成为 AI 研发的核心环节。本课题聚焦真实的 AI 数据生产场景，要求你完成 **前端 \+ 后端 \+ 审核 Agent** 三端的端到端实现，打造一套可在真实业务中落地的 Web 数据标注平台 —— **LabelHub**。

该平台需完整覆盖数据生产的全生命周期：

- 任务负责人通过 **拖拽 / 组件化** 的方式动态搭建包含多种表单的标注页面；

- 标注员在线**领取 / 分发 / 提交**任务；

- 平台基于自定义评测标准提供 **AI 自动预审**；

- 多角色 **人工审核流转** 保证终审数据质量；

- 支持 **多格式数据导出**，对接下游训练流程。

本课题将全面考察你在 **复杂动态表单架构设计**、**长链路工作流状态流转** 以及 **AI 质检 Agent 落地** 三个维度的全栈工程能力。

---

## 二、最终交付物

### 🛠 任务负责人后台

面向 PM / 运营，提供任务创编、模板搭建、审核配置、数据导出能力。

### ✍️ 标注员工作台

面向标注员 / 行业专家，提供任务广场、在线作答、草稿与提交、个人贡献统计。

### 🤖 AI 审核 Agent

面向系统，按可配置的评测标准对提交数据自动预审，输出评分与质检建议。

#### 关键环节功能截图（示意）

> 以下截图为帮助理解课题要求绘制的 UI 示意图，**非真实产品截图**，仅用于明确每个环节的核心交互、关键字段与状态流转。开发时请以本文档第四章的功能需求为准。

![Image](https://internal-api-drive-stream.larkoffice.com/space/api/box/stream/download/authcode/?code=ODI2NTAyZGU5NmFjYTVkOGZkMDcxZmJlZTFkZDJkOTdfZDEyZDIyMjFiMzJmYjNmMmNiMTlmYzQ4MDdiODUwMzJfSUQ6NzY0MTkyMzkxOTM0NzI4OTI4NV8xNzc5Nzc4MTg2OjE3Nzk4NjQ1ODZfVjM)

![Image](https://internal-api-drive-stream.larkoffice.com/space/api/box/stream/download/authcode/?code=ZmM0ZGI5ZWZkNGFkN2RhZGUxMDVmZGY3YzU0MTgwYzhfZmI5MTAzY2U4NmVlNTVhMmYxNTczMTFkYTM0MWNkMTJfSUQ6NzY0MTkyMzkxODA2NDAyODYwM18xNzc5Nzc4MTg2OjE3Nzk4NjQ1ODZfVjM)

![Image](https://internal-api-drive-stream.larkoffice.com/space/api/box/stream/download/authcode/?code=OWEwZDJlZmYzZWQ2ZjhjODNmMzZiNjQ5NDg3MWNlZjlfYjZlZGNlMjUxODc1ZWY2MzI0OTNiZGI3ZDIwNWQ0Y2ZfSUQ6NzY0MTkyMzkxODMyNDAyNjMyOV8xNzc5Nzc4MTg2OjE3Nzk4NjQ1ODZfVjM)

![Image](https://internal-api-drive-stream.larkoffice.com/space/api/box/stream/download/authcode/?code=M2FmODY0YzQyMTdiNjM2ODhkMjQwMDI3NTBjNmZkNTVfMGM1N2U2OWFiYzhmODdhMWE4YzAxNDU0YjVhMWZjN2FfSUQ6NzY0MTkyMzkxODIzMTc1MTg3NF8xNzc5Nzc4MTg2OjE3Nzk4NjQ1ODZfVjM)

![Image](https://internal-api-drive-stream.larkoffice.com/space/api/box/stream/download/authcode/?code=YmU3ODYzZDZkZmRkMDc5NTY4ZjUyM2M5ZGY1MDVlYjdfN2FkMTI0YjJjMzI4NDk1NTlmNzQ5YjhkNWEyNmExOGRfSUQ6NzY0MTkyMzkxNzgxNjY5NTc4MF8xNzc5Nzc4MTg2OjE3Nzk4NjQ1ODZfVjM)



---

## 三、角色与权限模型

|角色|关键能力|核心页面|
|---|---|---|
|**任务负责人 \(Owner\)**|创建任务、搭建标注模板、配置审核标准与奖励、查看数据看板、导出|任务管理 / 模板搭建 / 数据验收|
|**标注员 \(Labeler\)**<br>|浏览任务广场、领取任务、在线作答、保存草稿、查看打回原因并修改|任务广场 / 标注工作台 / 我的贡献<br>|
|**AI 审核 Agent \(System\)**|拉取已提交数据、按规则评测、写回评分与质检结果|（后台异步流水线）|
|**人工审核员 \(Reviewer\)**|多级审核（初审 / 复审 / 终审）、打回 / 通过 / 修订|审核工作台 / 审核结果列表|

**最少角色要求**：必须实现 Owner、Labeler、Reviewer 三种角色，AI Agent 可由后端服务承载，但需具备独立账户视角与审核记录可追溯。

---

## 四、核心功能需求

### 4\.1 任务管理 · 任务负责人后台

- **任务基础信息**：标题、描述、富文本说明、标签、奖励规则、截止时间、配额

- **任务发布与下线**：状态机（草稿 / 发布中 / 已暂停 / 已结束）

- **数据集管理**：题目导入（JSON / JSONL / Excel）、批量编辑、题目预览

- **任务分发策略**：先到先得 / 指派 / 配额抢单（任选其一）

### 4\.2 标注页面动态搭建（核心难点 ⭐⭐⭐）

这是本课题考察的**第一关键能力**。要求实现一套可视化的「**模板搭建器（Designer）\+ 模板渲染器（Renderer）**」：

- **左侧物料区** → 中间画布（拖拽放置）→ 右侧属性配置面板

- 物料的 schema 与渲染解耦，搭建产物为 **可序列化的 JSON Schema**

- 同一份 schema 既可在 Designer 预览，也可在 Labeler 工作台运行时渲染

**至少实现以下物料**：

|物料|说明|
|---|---|
|单行输入 / 多行文本|基础文本采集|
|单选 / 多选 / 标签选择|枚举类标注|
|富文本编辑器|长文本带格式|
|文件 / 图片上传|多媒体素材|
|JSON 编辑器|结构化数据|
|LLM 交互组件|字段级模型调用，输出可作为标注参考或预填|
|展示项 \(ShowItem\)|渲染题目原始数据，不参与提交|

**进阶要求**：

- 支持字段联动（条件显示 / 联动校验）

- 支持自定义校验规则（必填 / 长度 / 正则 / 自定义函数）

- 支持分组容器与多 Tab 布局

### 4\.3 标注员工作台

- **任务广场**：搜索 / 筛选 / 任务卡片

- **作答页面**：基于模板 schema 渲染表单，支持

    - 上一题 / 下一题 / 跳题

    - 草稿自动保存（防丢失）

    - 提交校验与错误提示

    - 题目级 LLM 辅助（调用 4\.2 中的 LLM 触发组件）

- **我的****数据**：已提交 / 通过 / 打回 / 待修改的统计与列表

### 4\.4 AI 自动预审 Agent（核心难点 ⭐⭐⭐）

要求实现一个**可配置评测标准**的审核 Agent：

- 任务负责人在后台配置**审核 Prompt 模板**与**评分维度**（如：相关性 / 准确性 / 格式合规 / 安全性 …）

- 标注员提交后，自动入队，Agent 调用大模型按维度打分并给出 **通过 / 打回 / 人工复核**** **结论

- 审核结果与原数据一并入库，可在审核工作台查看 AI 评语与原始 Prompt

**实现建议**：

- 异步任务队列

- LLM 调用使用 **Function Calling / 结构化输出**，避免裸文本解析

- 失败重试 \+ 幂等性

### 4\.5 多角色人工审核流转

实现一条清晰的工作流状态机：

```Plain Text
[Labeler 提交] → [AI 预审]
   ├─ 通过 → [人工复审]
   │           ├─ 通过 → [入库 / 可导出]
   │           └─ 打回 → [Labeler 修改]
   └─ 打回 → [Labeler 修改] / [人工复核]

```

- 状态机所有迁移记录可追溯（审计日志）

- 审核员可批量操作

- 打回需附理由，标注员能看到上一轮的审核意见

### 4\.6 多格式数据导出

- 至少支持 **JSON / JSONL / CSV / Excel** 四种格式

- 异步导出 \+ **下载历史** 列表（任务进度可查）

- 字段映射可配置（导出哪些字段 / 重命名 / 是否包含审核记录）

---

## 五、技术挑战与实现要点

### 🧩 复杂动态表单架构

- Designer / Renderer 解耦

- Schema 版本管理（任务发布后模板变更如何兼容）

- 字段联动与运行时校验

- 推荐栈：**Formily** \+ 拖拽库（dnd\-kit / react\-dnd）

### 🔄 长链路状态流转

- 任务 / 题目 / 提交 / 审核 多级状态

- 状态迁移的事务一致性

- 操作幂等与并发控制

- 完整的审计日志

### 🤖 AI Agent 落地

- Prompt 工程与可配置化

- 结构化输出与解析

- 失败兜底与人工介入路径

- 评分稳定性 / 可解释性

### 📦 工程化与体验

- 类型安全（TypeScript 全栈）

- 表单大数据量下的渲染性能

- 草稿自动保存与离线友好

- 移动端适配（可选加分项）

---

## 六、技术栈建议（非强制）

|层|推荐方案|
|---|---|
|前端框架|React 18 \+ TypeScript|
|UI 组件库|Semi Design / Ant Design|
|表单内核|**Formily** \+ Schema 渲染|
|拖拽|**@dnd\-kit/core**** / react\-beautiful\-dnd**|
|状态管理|Zustand / Jotai / Redux Toolkit|
|后端|Java / Go / Python 任选|
|数据库|MySQL |
|LLM 接入|OpenAI / 豆包 / 通义 任选|

### Coding 工具

推荐使用Trae \+ 豆包code模型 [TRAE IDE模型配置操作指南](https://bytedance.larkoffice.com/wiki/AQsEwxVonibJvAkDDE7ct2qUnCf)，为大家申请了模型资源

```Bash
Doubao-Seed-2.0-lite

```

⚠️ coding agent非强制性要求，若大家有自己的claude、codex等工具，也可以使用自己的

---

## 七、验收标准

### 功能完备性（60%）

* [ ] 任务负责人可独立完成「建任务 → 搭模板 → 发布 → 看结果 → 导出」全流程

* [ ] 标注员可独立完成「领任务 → 作答 → 提交 → 看打回 → 修改」全流程

* [ ] AI Agent 自动预审可正常运行，结果可见、可追溯

* [ ] 多格式导出文件结构正确，可被下游消费

### 工程质量（25%）

* [ ] 代码组织清晰、模块边界合理

* [ ] TypeScript 类型完整，无大量 any

* [ ] 关键流程有单元测试 / 集成测试

* [ ] README 与部署文档完备

### 产品体验（15%）

* [ ] 视觉规范统一，关键路径无明显卡顿

* [ ] 错误提示友好，操作可逆（撤销 / 草稿）

* [ ] 至少在 1280×800 与 1920×1080 下表现良好

---

## 八、提交物清单

请在结营答辩前提交以下材料（建议放在一个仓库的 `submission/` 目录下）：

1. **源码仓库**（前端 \+ 后端 \+ Agent，最好是 Monorepo）

2. **README\.md**：架构说明、模块划分、本地启动指引、关键设计取舍

3. **演示视频**（5–10 分钟，覆盖三大角色完整链路）

4. **相关文档**（架构图、关键技术点、Demo 截图）

    1. **AI Coding 过程记录（开发思路、过程文件）**

    2. **基础技术文档**

5. **可访问的演示环境****说明文档**（任意云平台部署）

6. **API 文档**（Postman Collection / API 文档（飞书文档、markdown文件等形式都可以） 任选）



---

## 九、参考实现

下方截图与 Demo 演示位预留空白画板与图片占位，请在导师补充实际素材后查看：

### 9\.1 任务负责人后台 · 模板搭建（拖拽搭建器）

### 9\.2 标注员工作台 · 任务广场与作答页

### 9\.3 AI 自动预审与人工审核

### 9\.4 演示流程（建议录屏剧本）

> 建议在画板中绘制端到端的演示流程图：建任务 → 搭模板 → 发布 → Labeler 作答 → 提交 → AI 预审 → 人工审核 → 导出。

---

**建议聚焦**：动态表单架构、状态机正确性、AI Agent 工程化是本课题最有「**全栈含金量**」的三处。建议优先把这三块做扎实，再追求更多物料 / 角色细分。

祝你打造出一个真正能跑通业务的 LabelHub！🚀

## 十、【测试数据】待标注数据

\[datasets\.zip\]

