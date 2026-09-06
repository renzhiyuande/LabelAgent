# 控件类型速查表

> **相关文档**：[查询栏](../guide/filters) | [表单](../guide/form) | [数据表格](../guide/table) | [详情抽屉](../guide/detail) | [文件上传](../guide/upload)

## 查询栏可用控件

| `component` | 说明 | 数据源 |
|---|---|---|
| `text` | 文本输入 | — |
| `select` | 下拉选择 | `options` / `dict` / `remote` |
| `remoteSelect` | 远程下拉 | `remote` |
| `multiSelect` | 多选 | `options` / `dict` / `remote` |
| `tags` | 标签选择 | `options` / `dict` |
| `dateRange` | 日期范围选择 | — |
| `dateTimeRange` | 日期时间范围 | — |
| `numberRange` | 数字范围 | — |
| `number` | 数字输入 | — |
| `statusSelect` | 状态筛选 | `dict` |

## 表格列渲染类型

| `type` | 说明 | 额外配置 |
|---|---|---|
| `text` | 纯文本 | — |
| `number` | 数字，右对齐 | — |
| `datetime` | 日期时间格式 | — |
| `date` | 日期格式 | — |
| `status` | 彩色状态标签 | `dict` / `enum`（含 `tone`） |
| `switch` | 开关 | `slot: "switch"` + `slotMeta` |
| `tags` | 多个标签 | — |
| `link` | 超链接 | `link` 配置 |
| `user` | 用户卡片 | `user` 配置 |
| `json` | JSON 展示 | — |
| `image` | 图片缩略图 | — |
| `file` | 文件链接 | — |
| `fileUpload` | 文件上传展示 | — |
| `imageUpload` | 图片上传展示 | — |

## 表单输入控件

| `component` | 控件 | 配置属性 |
|---|---|---|
| `text` | 文本输入 | `inputType: "text" \| "number" \| "password"` |
| `textarea` | 多行文本 | — |
| `userMentionTextarea` | @ 提及文本域 | `options` 为候选列表 |
| `select` | 下拉选择 | `options` / `dict` |
| `remoteSelect` | 远程加载下拉 | `remote` |
| `remoteTreeSelect` | 远程树形选择 | `remote.variant: "tree"` |
| `treeMultiSelect` | 树形多选 | — |
| `multiSelect` | 多选 | — |
| `radioGroup` | 单选组 | `options` |
| `checkboxGroup` | 多选组 | `options` |
| `switch` | 开关（布尔） | — |
| `datetime` | 日期时间 | — |
| `dateRange` | 日期范围 | — |
| `dateTimeRange` | 日期时间范围 | — |
| `numberRange` | 数字范围（起止） | — |
| `json` | JSON 编辑 | 底层 Monaco Editor |
| `jsonEditor` | JSON 编辑器（别名） | — |
| `codeEditor` | 代码编辑器 | — |
| `richText` | 富文本 | `richText` |
| `fileUpload` | 文件上传 | `upload` |
| `imageUpload` | 图片上传 | `upload` |
| `user` | 用户选择 | `user` |
| `remoteSchema` | 远程动态子表单 | `remoteSchema` |
| `array` | 数组字段 | `fields` + `itemLayout` |
| `dynamicTable` | 内嵌数据表格 | `dynamicTable` |
| `llmSuggest` | LLM 建议 | `llm` |
| `assignmentPicker` | 分配选择器 | `assignment` |

## 表单只展示控件（不可编辑）

| `component` | 说明 |
|---|---|
| `showItem` | 渲染展示项（支持模板插值） |
| `showImage` | 图片展示 |
| `showFile` | 文件展示 |
| `showVideo` | 视频展示 |
| `dictTagPreview` | 字典标签预览 |
| `dictTagTone` | 字典标签色调（设计器专用） |
| `dictTagClassName` | 字典标签 class（设计器专用） |

## 详情字段类型

| `type` | 说明 | 配置 |
|---|---|---|
| `text` | 文本 | — |
| `number` | 数字 | — |
| `datetime` | 日期时间带 icon | — |
| `date` | 仅日期 | — |
| `status` | 状态标签 | `dict` / `enum.tone` |
| `tags` | 多标签 | — |
| `richText` | HTML 富文本渲染 | — |
| `json` | 格式化 JSON | — |
| `link` | 超链接 | `link` |
| `file` | 文件下载 | — |
| `image` | 图片预览 | — |
| `enum` | 枚举映射 | `enum` |
| `remoteSchema` | 远程动态详情 | 自动匹配 `form.remoteSchema.binding.payloadField` |
| `arrayTable` | 表格展示数组 | `columns` |
| `user` | 用户信息卡片 | `user` |
| `timeline` | 时间线 | — |
| `timelineGroup` | 分组时间线 | — |
| `templateForm` | 模板表单只读渲染 | `templateForm` |
| `dictTagPreview` | 字典标签预览 | `dict` |

## 格式化器（`formatter`）

| 值 | 效果 | 适用类型 |
|---|---|---|
| `payloadPreview` | 摘要预览（截取 N 字符） | `text` / `json` |
| `json` | 格式化 JSON | `json` |
| `bytes` | 字节格式化（KB/MB/GB） | `number` |
| `boolean` | "是" / "否" | `boolean` |
| `ellipsis` | 单行省略 | `text` |

## 操作类别 `ActionKind`

| `kind` | 行为 | 典型场景 |
|---|---|---|
| `drawer` | 弹出表单抽屉 | 新建、编辑 |
| `request` | 直接 API 请求 | 启用/禁用、暂停 |
| `danger` | 确认+DELETE | 删除 |
| `link` | 页面跳转 | 打开设计器 |
| `assignment` | 分配抽屉 | 分配角色/用户 |
| `workflow` | 工作流渲染 | 发布审批 |
| `button` | 纯事件按钮 | 自定义 JS |

## 条件操作符 `ConditionOperator`（visibleWhen / disabledWhen）

| `operator` | 含义 | 示例值 |
|---|---|---|
| `eq` | 等于 | `"DRAFT"` |
| `ne` | 不等于 | `"APPROVED"` |
| `in` | 在列表中 | `["DRAFT", "PAUSED"]` |
| `notIn` | 不在列表中 | `["DELETED"]` |
| `contains` | 包含 | `"关键词"` |
| `notEmpty` | 非空 | `true` |

## 查询操作符 `FilterOperator`（筛选字段）

| 操作符 | 说明 |
|--------|------|
| `eq` | 等于（精确匹配） |
| `ne` | 不等于 |
| `in` | 包含（数组值） |
| `notIn` | 不包含 |
| `like` | 模糊匹配 |
| `contains` | 包含 |
| `notEmpty` | 非空 |
| `between` | 范围查询 |

## 页面布局 `page.key`

| `key` | 布局 | 适合场景 |
|---|---|---|
| `"default"`（默认） | 查询栏 + 表格 | 标准 CRUD |
| `"card"` | 卡片网格 | 模板市场、素材库 |
| `"tree"` | 树形 + 表格 | 菜单、分类、组织架构 |

## 抽屉宽度预设

| 值 | 宽度 |
|---|---|
| `"sm"` | 420px |
| `"md"` | 600px |
| `"lg"` | 800px |
| `"xl"` | 1000px（仅 workfow/sidePanel 可用） |
| `number` | 自定义 px |
