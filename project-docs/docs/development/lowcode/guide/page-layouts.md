# 页面布局模式

低代码引擎支持三种页面布局，通过 `page.key` 切换。

> **相关文档**：[数据表格](./table) | [查询栏](./filters) | [操作按钮](./actions) | [注册接入](./registration) | [ResourceMeta 总览](./resource-meta)

## 标准列表（`"default"`）

默认布局，同时也是最常用的布局：查询栏 + 数据表格。

```typescript
page: { key: "default" }
```

或者不配置 `page` 字段，默认即为标准列表页。

```
┌─────────────────────────────────────┐
│  [关键词] [状态▼] [更多筛选 ▼]     │  ← 查询栏
├─────────────────────────────────────┤
│  ┌──────┬──────┬──────┬───────┐     │
│  │ 编码  │ 名称 │ 状态  │ 操作  │     │
│  ├──────┼──────┼──────┼───────┤     │
│  │ T01  │ ...  │ 进行  │ 编辑  │     │  ← 数据表格
│  │ T02  │ ...  │ 完成  │ 详情  │     │
│  └──────┴──────┴──────┴───────┘     │
│  < 1 2 3 ... >                      │
└─────────────────────────────────────┘
```

## 卡片式布局（`"card"`）

卡片网格布局，适合内容型资源（模板市场、素材库等）。

```typescript
interface CardPageSchema {
  layout?: "grid" | "list";                 // 网格 | 列表
  columns?: { base?: number; sm?: number; md?: number; lg?: number; xl?: number };
  gap?: "sm" | "md" | "lg";                 // 卡片间距
  clickable?: boolean;                       // 是否可点击
  cover?: CardFieldBinding;                  // 封面图
  title: CardFieldBinding;                   // 标题
  subtitle?: CardFieldBinding;               // 副标题
  description?: CardFieldBinding & { maxLines?: number };  // 描述
  badges?: CardBadgeBinding[];               // 角标
  metrics?: CardMetricBinding[];             // 指标
  primaryAction?: string;                    // 主要操作 key
  secondaryActions?: string[];               // 次要操作 key
  showOverflowMenu?: boolean;                // 显示更多菜单
  empty?: { title: string; description?: string; actionKey?: string };  // 空状态
  skeleton?: { count?: number };             // 骨架屏
}
```

### 卡片式配置示例

```typescript
resource: "templateMarket",
page: {
  key: "card",
  card: {
    layout: "grid",
    columns: { base: 1, sm: 2, lg: 3, xl: 4 },
    cover: { field: "coverUrl" },
    title: { field: "name" },
    subtitle: { field: "authorName" },
    description: { field: "description", maxLines: 3 },
    badges: [
      {
        field: "category",
        dict: "template_category",
      },
      {
        field: "status",
        enum: [
          { value: "APPROVED", label: "已上架", tone: "success" },
          { value: "DRAFT", label: "草稿", tone: "default" },
        ],
      },
    ],
    metrics: [
      { label: "下载量", field: "downloadCount" },
      { label: "评分", field: "rating" },
    ],
    primaryAction: "detail",
    clickable: true,
    empty: {
      title: "暂无模板",
      description: "请先创建模板版本",
      actionKey: "create",
    },
    skeleton: { count: 6 },
  },
}
```

### CardFieldBinding

```typescript
interface CardFieldBinding {
  field: string;           // 数据字段
  path?: string;           // 嵌套路径
  formatter?: string;      // 格式化
  fallback?: string;       // 降级文案
}
```

### CardBadgeBinding

```typescript
interface CardBadgeBinding extends CardFieldBinding {
  enum?: Array<{ value: unknown; label: string; tone?: "default" | "success" | "warning" | "destructive" }>;
  dict?: string;           // 数据字典，优先于 enum
}
```

### 视图效果

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│ [封面]   │  │ [封面]   │  │ [封面]   │
│ 标题     │  │ 标题     │  │ 标题     │
│ 作者     │  │ 作者     │  │ 作者     │
│ [标签]   │  │ [标签]   │  │ [标签]   │
│ 下载: 99 │  │ 下载: 50 │  │ 下载: 20 │
└──────────┘  └──────────┘  └──────────┘
```

## 树形布局（`"tree"`）

左侧树形导航 + 右侧过滤后的数据表格。适合有层级关系的资源（菜单、分类、组织架构）。

```typescript
resource: "menus",
page: {
  key: "tree",
  tree: {
    treeColumnKey: "name",         // 树节点的展示字段
    parentField: "parentId",       // 父节点关联字段
    defaultExpanded: true,         // 默认全部展开
  },
}
```

### 视图效果

```
┌──────────┬──────────────────────────┐
│ 系统管理  │  名称  │ 路由  │ 排序  │
│ ├─ 用户   │  用户  │ /user  │  1   │  ← 仅展示选中节点下的数据
│ │─ 角色   │  角色  │ /role  │  2   │
│ │─ 权限   │  权限  │ /perm  │  3   │
│ 运营管理  │  ...   │  ...   │ ...  │
│ └─ 模板   │        │        │      │
└──────────┴──────────────────────────┘
      ↑ 树形侧栏     ↑ 数据表格（自动按 parentId 筛选）
```

### 树形页面工作原理

- 左侧树状侧栏使用 `api.query` 获取全部数据
- 点击树节点时，自动在右侧表格添加 `{ parentId: clickedNode.id }` 筛选
- 树节点的展示文本使用 `treeColumnKey` 指定的字段
