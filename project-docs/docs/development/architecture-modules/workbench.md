# 工作台系统

## 概述

LabelHub 工作台系统是**可组合的面板布局框架**，为标注、审核、模板设计等不同业务场景提供统一的 UI 编排能力。系统经历了两个架构代际：**v1 三面板布局引擎** 和 **v2 四区域 Tab 布局引擎**，当前两者共存。

---

## Workbench v1：三面板布局引擎

**位置**：`frontend/src/components/workbench/`

### 架构

v1 是一个固定三面板水平布局引擎（左侧面板 + 中央面板 + 右侧面板），支持面板重排序、折叠、拖拽缩放和预设切换。

面板角色：

```
┌──────────┬──────────────────────────────┬──────────┐
│ leading  │         primary              │ trailing │
│ 左侧面板 │        中央面板               │ 右侧面板 │
│ 固定宽度  │        flex 弹性 / stacked主面板│ 固定宽度  │
│ 可折叠    │                               │ 可折叠    │
└──────────┴──────────────────────────────┴──────────┘
```

### 核心类型

#### WorkbenchLayoutSchema（布局蓝图）

```typescript
interface WorkbenchLayoutSchema<TPanelId, TPreset> {
  mode: string;                              // 标识符
  storageKey: string;                        // localStorage 键
  legacyStorageKeys?: string[];              // 旧版存储键（迁移用）
  defaultPreset: TPreset;                    // 默认预设名
  leadingPanelId: TPanelId;                  // 左侧面板 ID
  trailingPanelId: TPanelId;                 // 右侧面板 ID
  primaryPanelId: TPanelId;                  // 中央主面板 ID
  panelDefinitions: Record<TPanelId, WorkbenchPanelDefinition>;
  presets: Record<TPreset, WorkbenchPresetDefinition<TPanelId>>;
  features: WorkbenchLayoutFeatures;         // 功能开关
}
```

| 字段 | 说明 |
|------|------|
| `leadingPanelId` | 左侧面板。固定宽度，可折叠。映射到 `sizes.leadingWidth` |
| `trailingPanelId` | 右侧面板。固定宽度，可折叠。映射到 `sizes.trailingWidth` |
| `primaryPanelId` | 中央主面板。`panelChrome` 下 flex 弹性；`stacked` 模式下为上方区域 |
| `features.stackedPreset` | 启用 stacked 预设（左侧 + 中央/右侧上下堆叠） |
| `features.panelChrome` | `true` → 面板包裹 WorkbenchPanelShell；`false` → 裸渲染 |

#### WorkbenchPanelDefinition（面板定义）

```typescript
interface WorkbenchPanelDefinition {
  id: string;
  label: string;
  collapsible?: boolean;
  reorderable?: boolean;
  resizable?: boolean | "width";       // 拖拽尺寸手柄
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  flex?: boolean;                       // 弹性面板，自动填满剩余空间
}
```

#### WorkbenchLayoutConfig（运行时状态）

```typescript
interface WorkbenchLayoutConfig<TPanelId, TPreset> {
  preset: TPreset;                          // 当前预设
  panelOrder: TPanelId[];                   // 面板排列顺序
  sizes: WorkbenchLayoutSizes;              // leadingWidth / trailingWidth / stackedPrimaryPercent
  panelCollapsed: Record<TPanelId, boolean>;
}
```

#### WorkbenchLayoutSizes（尺寸）

```typescript
interface WorkbenchLayoutSizes {
  leadingWidth: number;                     // 左侧面板宽度（px）
  trailingWidth: number;                    // 右侧面板宽度（px）
  stackedPrimaryPercent: number;            // stacked 模式下主面板占比（%）
}
```

> 历史遗留字段 `queueWidth`、`annotateWidth`、`stackedPayloadPercent`、`queueCollapsed` 已被移除。旧版 localStorage 数据仍会被规范化函数静默迁移。

#### WorkbenchPresetDefinition（预设）

```typescript
interface WorkbenchPresetDefinition<TPanelId> {
  label: string;                            // 显示名称
  hint: string;                             // 提示
  panelOrder: TPanelId[];                   // 面板顺序
  sizes: WorkbenchLayoutSizes;              // 预设尺寸
  panelCollapsed?: Partial<Record<TPanelId, boolean>>;
}
```

#### RawWorkbenchLayoutConfig（存储原始数据）

```typescript
type RawWorkbenchLayoutConfig<TPanelId> = Partial<WorkbenchLayoutConfig<TPanelId>> & {
  sizes?: Partial<WorkbenchLayoutSizes>;
};
```

`RawWorkbenchLayoutConfig` 来自 `localStorage` 反序列化，经 `normalizeLayoutConfig()` 规范化为完整的 `WorkbenchLayoutConfig`。支持 `Partial` 是必要的——存储数据可能缺失部分字段。

### 渲染模式

`WorkbenchLayoutEngine.tsx` 根据预设和功能标志，运行三种渲染模式：

| 模式 | 条件 | 行为 |
|------|------|------|
| **Stacked（堆叠）** | `preset === "stacked"` 且 `stackedPreset === true` | leading 固定宽度左侧，primary + trailing 上下堆叠，中间有 ResizeDivider |
| **Panel Chrome** | `panelChrome === true` | 水平面板行，每个面板渲染在 `WorkbenchPanelShell` 内（边框 + 标题 + 折叠按钮 + 拖拽手柄），支持 DnD 重排序 |
| **Bare** | `panelChrome === false` | 纯水平 flex 行，无外壳无 DnD，由消费方自行管理面板样式 |

**响应式堆叠**（`responsiveStack === true`）：移动端（< lg）自动将 primary + trailing 上下堆叠，覆盖默认的水平布局。

### WorkbenchPanelShell（面板容器）

每个面板在 `panelChrome` 模式下包裹在 `WorkbenchPanelShell` 内：

- 面板标题 + 可选折叠按钮
- DnD 拖拽手柄（`panelReorder` 启用时）
- `collapsedBody` slot：折叠状态下的最小化内容
- `bordered` 标志：中央面板（`primaryPanelId`）两侧可有边框区分

### useWorkbenchLayout（状态管理 Hook）

```typescript
const { schema, config, setConfig, applyPreset, togglePanel, patchSizes } =
  useWorkbenchLayout<TPanelId, TPreset>(schema, options?);
```

| 返回值 | 说明 |
|--------|------|
| `config` | 当前布局配置 |
| `setConfig` | 更新配置（支持函数式更新），自动持久化 |
| `applyPreset(preset)` | 切换到预设，保留可选的额外字段 |
| `togglePanel(panelId)` | 切换面板折叠状态 |
| `patchSizes(patch)` | 增量修改尺寸 |

支持自定义持久化（`options.normalize` / `options.load` / `options.save`），默认通过 `normalizeLayoutConfig` + `loadLayoutConfig` + `saveLayoutConfig` 读写 `localStorage`。

### WorkbenchLayoutEngine（渲染组件）

```typescript
<WorkbenchLayoutEngine
  schema={schema}
  config={config}
  onConfigChange={setConfig}
  panels={{ [panelId]: { body, collapsedBody? } }}
  panelLabels={{ [panelId]: string }}   // 可选，默认从 schema 读取
  panelReorder={boolean}                // 可选，默认取 schema.features.panelReorder
/>
```

`panels` 是 `Record<TPanelId, WorkbenchPanelSlot>`，其中 `WorkbenchPanelSlot` 包含 `body`（主内容）和 `collapsedBody`（折叠态内容）。

### 持久化

- `loadLayoutConfig(schema)` → 读取 `localStorage`，依次尝试 `storageKey` + `legacyStorageKeys`
- `saveLayoutConfig(schema, config)` → 写入 `localStorage`
- `normalizeLayoutConfig(schema, raw)` → 规范化原始数据，补齐缺失字段、clamp 尺寸
- `normalizePanelOrder` → 确保所有面板都在顺序中（存储数据可能缺失面板）
- `normalizeLayoutSizes` → clamp 到各面板的 `[minWidth, maxWidth]` 范围
- `normalizePanelCollapsed` → 从 storage / 预设 / false 三级兜底

### AuxiliaryModuleDock（辅助功能区）

位置：`auxiliary/AuxiliaryModuleDock.tsx`

可选垂直扩展坞，在主区域右下角展示。通过 `AuxiliaryModuleRegistry` 注册模块，每个模块定义图标 + 悬浮面板内容。

### 适用场景

| 场景 | 文件 | 说明 |
|------|------|------|
| 模板设计器 | `features/template-designer/constants/designer-layout-schema.ts` | 三面板：素材面板(280px) + 画布(flex) + 属性面板(360px)，Bare 模式 |
| 低代码资源页 | `components/resource-page/LHResourcePage.tsx` | 标准列表页布局，Panel Chrome 模式 |

---

## Workbench v2：四区域 Tab 布局引擎

**位置**：`frontend/src/components/workbench2/`

### 架构

v2 是一个**四区域 Tab 化布局引擎**（top / left / center / right），每个区域可托管多个 Tab，每个 Tab 由 `WorkbenchSlotProvider` 提供内容。Tab 可在区域内和跨区域拖拽重排。

### 核心类型

#### WorkbenchV2Schema（布局蓝图）

```typescript
interface WorkbenchV2Schema {
  mode: string;                           // 标识符
  storageKey: string;                     // localStorage 键
  legacyStorageKeys?: string[];           // 旧版存储键（迁移用）
  chrome?: WorkbenchChrome;               // "default" | "flush"，未指定时为 "default"
  regions: Record<WorkbenchRegionId, WorkbenchRegionDefinition>;
}
```

| 区域 | 典型用途 |
|------|----------|
| `top` | 水平栏，工具栏或全局控件 |
| `left` | 垂直侧边面板（可折叠） |
| `center` | 中央主区域（不可折叠） |
| `right` | 垂直辅助面板（可折叠） |

#### WorkbenchRegionDefinition（区域定义）

```typescript
interface WorkbenchRegionDefinition {
  id: WorkbenchRegionId;             // "top" | "left" | "center" | "right"
  label: string;                     // 显示名称
  direction: "horizontal" | "vertical";
  defaultSize: number;               // 默认尺寸（px）
  minSize: number;                   // 最小尺寸（px）
  maxSize: number;                   // 最大尺寸（px）
  collapsible?: boolean;             // 仅 side region 生效
}
```

> `defaultRegionSizes` 已在 v2 类型中移除。区域默认尺寸由各 `WorkbenchRegionDefinition.defaultSize` 字段单独定义，无需在 schema 级别重复声明。

#### WorkbenchTabItem（Tab 数据模型）

```typescript
interface WorkbenchTabItem {
  id: string;
  slotId: string;                    // 关联的 WorkbenchSlotProvider.id
  label: string;
  regionId: WorkbenchRegionId;       // 所在区域
  index: number;                     // 区域内序号
  pinned?: boolean;
  /** widget 独立 tab：仅展示单个 widget。无此字段即为普通 slot tab */
  tabKind?: "widget";
  /** tabKind === "widget" 时必须提供 */
  widgetId?: string;
}
```

`tabKind` 值为 `"slot"` 的分支已在类型中移除——普通 Tab 不设 tabKind，只有 widget 独立 Tab 设置 `tabKind: "widget"`。

#### WorkbenchGlobalLayoutState（运行时布局状态）

```typescript
interface WorkbenchGlobalLayoutState {
  regions: Record<WorkbenchRegionId, WorkbenchRegionState>;
  bodyRegionOrder: Array<"left" | "center" | "right">;  // body 三栏排列顺序
  tabs: WorkbenchTabItem[];
}

interface WorkbenchRegionState {
  id: WorkbenchRegionId;
  collapsed: boolean;
  size: number;
  activeTabId: string | null;
}
```

#### WorkbenchRenderContext（渲染上下文）

每个 `WorkbenchSlotProvider` 方法都会收到 `WorkbenchRenderContext`，描述当前渲染状态：

```typescript
interface WorkbenchRenderContext {
  regionId: WorkbenchRegionId;
  placementMode: WorkbenchPlacementMode;  // 依据区域尺寸自动解析的布局模式
  regionSize: number;
  regionCollapsed: boolean;
  isActive: boolean;                      // 当前 Tab 是否为活跃 Tab
  tabId: string;
}
```

`placementMode` 取值派生逻辑：

| 区域 | 条件 | 模式 |
|------|------|------|
| top | `size > 96` | `top-full` |
| top | `size <= 96` | `top-compact` |
| left | 未折叠 | `left-wide` |
| left | 折叠 | `left-narrow` |
| center | 始终 | `center-full` |
| right | 未折叠 | `right-wide` |
| right | 折叠 | `right-narrow` |

### WorkbenchSlotProvider —— 核心扩展点

`WorkbenchSlotProvider<TBusinessContext>` 是 v2 的中枢抽象接口。每个业务场景通过注册一组 SlotProvider 来声明自己的工作台内容。

| 方法 | 用途 |
|------|------|
| `render(ctx, env) → ReactNode` | **必填**。默认渲染内容 |
| `getPresentation(ctx, env)` | 返回 `"default" \| "narrow" \| "collapsed"`，决定渲染变体 |
| `renderNarrow / renderCollapsed / renderPopover` | 响应式变体渲染（狭窄区域/折叠/弹出） |
| `renderTopTab / renderBodyTab / renderTabCustom` | Tab 标签自定义渲染 |
| `renderTabBadge` | Tab 上的角标 |
| `onActivate / onDeactivate` | 生命周期钩子 |
| `isAvailableInPlacement(mode)` | 控制该 Slot 在哪些区域可见 |

渲染变体选择规则（在 `WorkbenchRegion` 中执行）：

1. 调用 `provider.getPresentation(ctx, env)` 获取展示模式
2. 若未返回，按以下规则兜底：
   - 区域已折叠 → `"collapsed"`
   - `placementMode` 为 `left-narrow` 或 `right-narrow` → `"narrow"`
   - 否则 → `"default"`
3. 根据展示模式调用对应方法：`renderCollapsed` → `renderNarrow` → `render`

### Widget 系统

Widget 系统将工位内容拆分为可独立配置、可拖拽编排的组件（Widget），通过 `createWorkbenchWidgetPlacementContext` 工厂集成到 Tier-2 布局中。

#### Widget Placement Context（工厂创建）

```typescript
// 创建带类型的 Widget Placement Context
const {
  Provider,          // React Context Provider
  usePlacement,      // 获取 WorkbenchWidgetPlacementValue
  usePlacementOptional,
  useDragHandlers,   // 生成与 Tab DnD 共用的拖拽处理器
  clearHiddenStorage,
} = createWorkbenchWidgetPlacementContext<TBoardId, TWidgetId>(config);
```

| 概念 | 类型 | 说明 |
|------|------|------|
| **Widget Board** | `TBoardId` | 命名列，如 `"payload"`、`"annotate"`，包含一组 widget |
| **Widget** | `TWidgetId` | 单个可编排组件 |
| **Widget Group** | `WidgetBoardGroup` | Shift + 拖拽合并两个 widget 为 split group（row / stack / tabs） |
| **Widget Palette** | `WorkbenchWidgetPalette` | 展示可用 widget 列表，拖拽到 board 或 tab |
| **Layout Bridge** | `WorkbenchLayoutBridge` | 连接 Tab 管理与 Widget 放置的桥梁 |

#### WorkbenchWidgetPlacementConfig

```typescript
interface WorkbenchWidgetPlacementConfig<TBoardId, TWidgetId> {
  boardIds: readonly TBoardId[];                        // 已注册 board
  hiddenStorageKey: string;                             // 隐藏 widget 持久化键
  isWidgetId: (id: string) => id is TWidgetId;          // 类型守卫
  isBoardId: (id: string) => id is TBoardId;
  getWidgetDefinition: (id: TWidgetId) => WorkbenchWidgetDefinition;
  loadInitialOrders: () => Record<TBoardId, string[]>;
  persistOrders: (orders: Record<TBoardId, string[]>) => void;
  normalizeOrders?: Function;
  canMoveToBoard?: Function;
  widgetGroupsStorageKey?: string;                      // 启用组合功能
  paletteTransferableOnly?: boolean;                    // 默认 true
}
```

#### Widget Tab 机制

每个 Widget 可独立占据一个 Tab（成为独立视图），而非嵌入 Board 内。机制通过 `createWidgetTab` 实现：

```typescript
const { tabs, tabId, created } = createWidgetTab({
  widgetId,
  regionId,    // 目标区域
  label,
  tabs,        // 当前全部 Tab
});
// tabs 中新增了一条 tabKind: "widget", widgetId 的 Tab 条目
```

Widget Tab 的 slotId 固定为 `WORKBENCH_WIDGET_HOST_SLOT_ID = "widget-host"`，由 `WorkbenchWidgetTabSlotContent` 组件渲染。

#### 独立组件

| 组件 | 文件 | 说明 |
|------|------|------|
| `EditableWidgetBoard` | `components/EditableWidgetBoard.tsx` | 看板容器：stack / row / tabs 三种布局，支持拖拽排序、分组 |
| `WorkbenchWidgetPalette` | `components/WorkbenchWidgetPalette.tsx` | 组件库面板，展示可用 widget 列表 |
| `WorkbenchWidgetTabSlotContent` | `components/WorkbenchWidgetTabSlotContent.tsx` | widget 独立 Tab 的内容容器 |
| `WidgetGroupShell` | `components/WidgetGroupShell.tsx` | 组合视图外壳，含布局切换和拆散操作 |

### 渲染架构

`WorkbenchRoot.tsx` 是 v2 的主编排组件：

1. 将 slotProviders 数组转为 `Record<id, provider>` 查找表
2. 调用 `useWorkbenchGlobalLayout` 管理布局状态
3. 调用 `useWorkbenchGlobalDrag` 管理拖拽状态
4. 渲染四个 `WorkbenchRegion`，每个区域渲染其 Tab 列表

#### 布局状态管理（useWorkbenchGlobalLayout）

```typescript
const {
  state,              // WorkbenchGlobalLayoutState
  setTabs,
  setRegionCollapsed,
  toggleRegionCollapsed,
  collapseSideRegions,
  setRegionSize,
  setRegionSizes,
  adjustRegionSizes,  // delta 方式调整尺寸
  setActiveTab,
  setBodyRegionOrder,  // 编辑模式下 body 三栏重排
  resetLayout,
} = useWorkbenchGlobalLayout({ schema, initialTabs, controlledState?, onStateChange? });
```

支持受控（传入 `controlledState`）和非受控两种模式。非受控模式下自动读写 localStorage。

#### 拖拽系统（useWorkbenchGlobalDrag）

```
DndContext 级别
  ├── Tab 拖拽（内置）：
  │   - workbench-tab-item → workbench-tab-container
  │   - 支持区域内重排和跨区域移动
  │   - 编辑模式下启用 handle
  └── Widget 拖拽（通过 widgetDrag 注入）：
      - workbench-widget-item → widget-board-* / dropzone-*
      - 由 createWorkbenchWidgetPlacementContext().useDragHandlers 生成
```

碰撞检测优先级（Widget 拖拽时）：

1. 按住 Shift/Alt → `widget-merge-*` 合并落点
2. 其他 Widget 元素（指针检测）
3. Board 或 Tab Dropzone
4. 矩形区域交集降级
5. 最近中心点降级

`WorkbenchShell.tsx` 提供外围壳层：header 和 footer 插槽。

### StandardWorkbenchV2

位置：`extensions/StandardWorkbenchV2.tsx`

一键可用的组合组件——包裹 `WorkbenchShell` + `WorkbenchRoot`，提供 header/footer/loading/editSidebar 等 props，通常是业务场景的入口组件。

### 持久化

通过 `useWorkbenchGlobalLayout` 内部管理，布局状态（区域尺寸、Tab 位置、折叠状态）序列化为 `WorkbenchGlobalLayoutState`，读写 localStorage。

读写链路：

```
saveWorkbenchLayoutState(schema, state)
  → localStorage.setItem(schema.storageKey, JSON.stringify(state))

loadWorkbenchLayoutState(schema, fallbackState)
  → 依次尝试 schema.storageKey + legacyStorageKeys 读取
  → normalizeWorkbenchLayoutState(schema, raw, fallbackTabs)
  → normalizeSideRegionCollapse 规范化侧栏折叠状态
  → 返回标准化后的 WorkbenchGlobalLayoutState
```

`normalizeWorkbenchLayoutState` 负责：

- `mergeWorkbenchTabs`：以 schema 默认 Tab 为基准，用存储数据覆盖区域/序号；同时保留存储中新增的 Widget Tab
- `normalizeRegionState`：clamp 尺寸到 `[minSize, maxSize]`
- `fallbackActiveTabs`：如果存储的 activeTabId 指向不存在的 Tab，回退到该区域首个 Tab

#### 持久化层级

| 存储 | 键 | 用途 |
|------|-----|------|
| 布局状态 | `schema.storageKey` | 区域尺寸、折叠、Tab 位置 |
| Widget 顺序 | 由 `persistOrders` 配置 | 各 Board 内的 Widget 排序 |
| Widget Groups | `widgetGroupsStorageKey` | 组合视图配置 |
| 隐藏 Widget | `hiddenStorageKey` | 用户从 Board 移除的 Widget ID 列表 |
| 视图模式 | 业务自有 | 各 slot/widget 的卡片/紧凑/JSON 模式偏好 |

### 编辑模式与侧栏

编辑模式下，`StandardWorkbenchV2` 渲染 `editSidebar`。通过 `createWorkbenchEditLayoutSidebar` 工厂创建：

```typescript
createWorkbenchEditLayoutSidebar<TWidgetId, TBoardId>(editMode, {
  features: { tabManager: true, widgetPalette: true },
  layoutState,
  onLayoutStateChange,
  placement,         // WorkbenchEditLayoutSidebarPlacement
  isWidgetId,
  availableWidgetIds,
  widgetPaletteTitle,
});
```

| Feature | 说明 |
|---------|------|
| `tabManager` | 展示所有 Tab 列表，支持重命名和删除（仅 widget Tab） |
| `widgetPalette` | 组件库面板，展示已隐藏/未放置的 widget，支持拖入恢复 |

### 响应式侧栏

`useWorkbenchResponsiveSideRegions` 自动管理窄屏下的侧栏折叠：

- 窗口宽度 < 1024px → 自动折叠左右侧栏
- 窄屏下手动展开侧栏 → pinned 状态，保持展开
- 窗口恢复宽屏 → 恢复到折叠前的记忆状态

### 适用场景

| 场景 | 文件 | 说明 |
|------|------|------|
| 标注工作台 | `features/labeler/workbench/` | LabelerSlotFrame + 多 widget Board |
| 审核工作台 | `features/review/workbench/` | ReviewSlotFrame + AiQueueSlotFrame |
| Demo / 测试 | `components/workbench2/demo/` | 完整性 Demo |

---

## v1 → v2 架构演进

| 维度 | v1 | v2 |
|------|----|----|
| 区域数 | 固定三面板（left/center/right） | 四区域（top/left/center/right） |
| 内容模型 | 每个面板一个 slot | 每个区域多个 Tab，每个 Tab 一个 SlotProvider |
| 布局预设 | 命名预设切换（含 stacked） | 无预设概念，Tab 位置完全灵活 |
| 响应式 | `responsiveStack` 标志（移动端自动堆叠） | SlotProvider 级别的 `renderNarrow / renderCollapsed` |
| DnD | 面板重排（可关闭） | Tab 跨区域拖拽 + Widget 拖拽编辑器 |
| 扩展性 | 面板 slot + AuxiliaryModuleDock | SlotProvider 注册模式 + Widget 编排系统 |
| Widget | 无 | Board + Group + Tab 三重编排 |
| 持久化 | `WorkbenchLayoutConfig` 单层 | 四层独立存储：布局/Widget顺序/Group/隐藏Widget |
| 编辑模式 | 无 | 编辑侧栏：Tab 管理 + 组件库 |
| 应用 | 模板设计器、低代码资源页 | 标注工作台、审核工作台 |
