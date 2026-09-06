# 模板设计器

## 概述

模板设计器是 LabelHub 的**标注表单 Schema 可视化编辑器**，用于拖拽式构建标注模板（FormSchema）。它基于 Workbench v1 三面板布局构建，由 **素材面板（左）、画布（中）、属性面板（右）** 组成。

**位置**：`frontend/src/features/template-designer/`

---

## 三面板布局

```
┌──────────────┬─────────────────────────────────┬──────────────┐
│  素材面板     │           画布                  │  属性面板     │
│  280px       │           flex                  │  360px       │
├──────────────┼─────────────────────────────────┼──────────────┤
│ 基础         │  [Section 1] [Section 2] [+]    │  ✏️ 基础     │
│  text        │  ┌───── ───── ───── ───── ┐    │  🔧 组件     │
│  textarea    │  │ label: 字段名           │    │  ✅ 校验     │
│  richText    │  │ [input placeholder]     │    │  🔗 联动     │
│  ...         │  ├───── ───── ───── ───── ┤    │              │
│ 选择         │  │ label: 字段名           │    │              │
│  select      │  │ [select options...]     │    │              │
│  multiSelect │  └───── ───── ───── ───── ┘    │              │
│ 远程         │                                 │              │
│ 高级         │  预览切换 | 数组作用域           │              │
│ 结构         │                                 │              │
└──────────────┴─────────────────────────────────┴──────────────┘
```

---

## 组件注册表

**位置**：`constants/component-registry.ts`

### 5 大分类 · 24 种组件

| 分类 | 组件 | 数量 |
|------|------|------|
| **基础 (basic)** | text, textarea, richText, showItem, showImage, showFile, showVideo, switch | 8 |
| **选择 (choice)** | select, multiSelect, tags, radioGroup, checkboxGroup | 5 |
| **远程 (remote)** | remoteSelect, remoteTreeSelect | 2 |
| **高级 (advanced)** | jsonEditor, codeEditor, dateRange, dateTimeRange, numberRange, llmSuggest, fileUpload, imageUpload | 8 |
| **结构 (structure)** | array | 1 |

### 组件元信息

每种组件在注册表中定义：

- `ComponentSpecificPropKey` — 该组件特有的 Schema 属性（如 `select` 允许 `defaultValue, options, dependsOn, optionMap, rules, permission`）
- `COMPONENT_DEFAULTS` — 组件默认 Schema 补丁（如 `showImage` 默认 `fit: "contain"`, `maxHeight: 280`）
- `sanitizeFieldForComponent()` — 切换组件类型时清理不兼容的属性，仅保留公共键 + 新组件特有的键

---

## 画布系统

**位置**：`components/canvas/`

### 区域管理（Section）

- 每个 Section 对应一个 Tab，呈现在画布顶部的 Tab 栏中
- 支持：新增 Section、内联重命名、删除（最少保留 1 个）
- 点击 Tab 切换编辑 Scope，自动清除选择并重置属性面板到"基础" Tab

### 字段渲染

- 每个字段由 `CanvasFieldWrapper` 包裹，通过 `useSortable` 实现 DnD（`@dnd-kit/sortable`）
- 点击选中字段（蓝色边框高亮），悬停显示：拖拽手柄、上下移动箭头、删除按钮
- 字段在当前 Section 或 Array 作用域内拖拽排序

### 4 种渲染模式

| 模式 | 适用组件 | 说明 |
|------|----------|------|
| **Compact** | text, textarea, richText, switch, jsonEditor | 单行紧凑展示，显示 icon + required 标记 + 占位符 |
| **Info** | select, multiSelect, tags, radioGroup, checkboxGroup, remoteSelect | 展开展示可选项数量和类型 |
| **Functional** | showItem, showImage, showFile, showVideo, llmSuggest | 模拟标注员视角的完整渲染 |
| **Preview** | 所有组件 | 用样本数据渲染"标注员会看到的样子" |

### 数组作用域（Array Scope）

- `array` 组件可进入子作用域（`enterArrayScope`），画布切换为数组子字段编辑模式
- 通过 `selectedParentKey` 追踪当前编辑的数组字段
- 支持返回（`exitArrayScope`）到外层 Section 编辑

---

## 属性面板

**位置**：`components/property-pane/`

### 4 个属性 Tab

| Tab | 说明 | 适用字段 |
|-----|------|----------|
| **基础 (basic)** | 标题、字段 key、路径、导入角色、组件类型、placeholder、描述、span、必填、只读、隐藏 | 所有字段 |
| **组件 (component)** | 组件特有的配置项（选项列表、远程数据源、默认值、LLM 提示、上传配置、富文本配置等） | 所有字段 |
| **校验 (validation)** | 校验规则编辑器 | 非 showItem / llmSuggest 字段 |
| **联动 (linkage)** | `visibleWhen` / `disabledWhen` 条件列表编辑器 | 所有字段 |

### 特殊的组件属性编辑

- **LLM Prompt 编辑器**（`LlmPromptTextarea.tsx` + `LlmMetaEditor.tsx`）：为 `llmSuggest` 字段配置 AI 提示词
- **远程数据源**（`OptionsEditor.tsx`）：`remoteSelect` 和 `remoteTreeSelect` 的 `optionMap` 和 `dependsOn` 配置
- **JSON 编辑器**（`JsonEditorFieldControl.tsx`）：`jsonEditor` 字段的 schema 定义
- **上传配置**：`fileUpload` 和 `imageUpload` 的存储桶、路径、限制

---

## 状态管理

### Editor Store（`stores/designer-editor-store.ts`）

Zustand store，管理编辑状态的变更：

| 状态组 | 关键字段 |
|--------|----------|
| Schema | `formSchema`, `activeSectionKey`, `selectedId`, `selectedParentKey` |
| 元信息 | `templateName`, `templateId`, `currentVersionId`, `versions[]` |
| 预览 | `isPreviewMode`, `previewValues`, `previewSample` |
| 脏标记 | `isDirty`（自动跟踪） |

**撤销/重做**：`undoStack` + `redoStack`（各 50 级上限），在 editor store 外通过模块级数组管理。每个变更操作前自动调用 `pushUndo()`。

### Session Store（`stores/designer-session-store.ts`）

管理启动流程和版本持久化：

**启动流**：
1. 加载模板详情（`templateDetail`）→ 获取导入契约（`loadImportContractForTemplate`）
2. 获取版本列表（`listTemplateVersions`）
3. 确定目标版本（URL query 优先级 → 已有草稿 → 当前发布版 → 首个版本）
4. 加载 Schema JSON → `editor.loadFormSchema()` 填充编辑器

**版本操作**：

| 操作 | API | 说明 |
|------|-----|------|
| 保存草稿 | `saveVersionDraft` | 校验导入契约 → 持久化 Schema + review 配置 |
| 发布 | `publishTemplateVersion` | 持久化 → 引擎动作 `"publish"` |
| 创建快照 | `createVersionDraft` | 保存当前 → 新建草稿版本 |
| 回滚 | `activateTemplateVersion` | 仅允许回滚到已发布版本，引擎动作 `"setAsCurrent"` |
| 切换草稿 | `hydrateVersion` | 切换到同模板的另一个草稿版本 |

---

## 后端 API

**位置**：`designer-api.ts`

| 端点 | 用途 |
|------|------|
| `listTemplateVersions(templateId)` | 获取模板版本列表 |
| `fetchVersionSchema(versionId)` | 获取某版本的 Schema JSON |
| `saveVersionDraft(templateId, versionId, data)` | 保存草稿（Schema + reviewConfig） |
| `createVersionDraft(templateId, sourceVersionId, description)` | 从源版本创建新草稿 |
| `activateTemplateVersion(templateId, versionId)` | 设置版本为当前版本（回滚/激活） |
| `publishTemplateVersion(templateId, versionId)` | 发布版本 |

---

## 导入契约（Import Contract）

当从导入数据创建模板时，导入契约会锁定某些字段的 `path` 值，确保字段映射关系不被意外修改。存储在 `importContract` 中，在 `saveDraft()` 时验证。
