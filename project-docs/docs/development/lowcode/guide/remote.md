# 远程选项 & 远程子表单

低代码引擎支持两种动态数据加载模式：**远程选项**（下拉框数据从 API 加载）和 **远程子表单**（根据选择值动态加载嵌套表单）。

## 远程选项 `RemoteOptionMeta`

用于 `remoteSelect` / `remoteTreeSelect` / `treeMultiSelect` 等控件。

```typescript
interface RemoteOptionMeta {
  source: string;                    // API key 或完整 URL
  labelKey?: string;                 // 选项展示字段，默认 "label"
  valueKey?: string;                 // 选项值字段，默认 "value"
  params?: Record<string, RemoteParamBinding>;  // 查询参数
  searchParam?: string;              // 搜索参数名，默认 "keyword"
  variant?: "flat" | "tree";        // 平铺 | 树形
  treeApi?: string;                  // 树形数据 API
}
```

### 基础用法

```typescript
{
  key: "roleIds",
  label: "角色",
  component: "remoteSelect",
  remote: { source: "roles" },
}
```

`source: "roles"` 匹配 `resource.api.options.roles` 中的 URL。

### 自定义 label / value

```typescript
remote: {
  source: "users",
  labelKey: "displayName",
  valueKey: "id",
}
```

### 静态查询参数

```typescript
remote: {
  source: "users",
  params: {
    role: "LABELER",
    status: "ACTIVE",
  },
}
```

### 动态查询参数（从表单字段取值）

```typescript
remote: {
  source: "cities",
  params: {
    provinceId: { from: "provinceId" },  // 从表单 provinceId 字段取值
  },
}
```

配合 `dependsOn` 实现级联联动：

```typescript
{
  key: "provinceId",
  label: "省份",
  component: "remoteSelect",
  remote: { source: "provinces" },
},
{
  key: "cityId",
  label: "城市",
  component: "remoteSelect",
  dependsOn: "provinceId",           // provinceId 变化时刷新
  remote: {
    source: "cities",
    params: {
      provinceId: { from: "provinceId" },
    },
  },
},
```

### 树形远程选择

```typescript
{
  key: "departmentId",
  label: "部门",
  component: "remoteTreeSelect",
  remote: {
    source: "departments",
    variant: "tree",
    treeApi: "/api/v1/org/tree",
  },
}
```

## 远程子表单 `RemoteSchemaMeta`

用于"根据当前选择的某项值，动态加载子表单"——例如：选择奖励规则类型后，动态加载对应配置表单。

```typescript
interface RemoteSchemaMeta {
  api: string;                        // 子表单 Schema API
  dependsOn?: string;                 // 依赖字段
  clearOnDependsChange?: boolean;     // 依赖变化时清空旧值
  binding?: {
    payloadField: string;             // 提交时存到后端的字段名
    modeField?: string;               // 模式字段路径
    discriminatorKey?: string;        // 区分不同子表单类型的 key
    stripSourceFields?: boolean;      // 提交时移除前端拆分字段
  };
}
```

### 基础用法

```typescript
{
  key: "rewardRuleConfig",
  label: "规则配置",
  component: "remoteSchema",
  description: "根据所选奖励规则类型动态加载对应配置表单",
  remoteSchema: {
    api: "/api/v1/owner/remote-schemas/rewardRules/{rewardRuleMode}/form-schema",
    dependsOn: "rewardRuleMode",           // 字段 rewardRuleMode 变化时重新加载
    binding: {
      payloadField: "rewardRuleJson",      // 提交时存到 rewardRuleJson 字段
      discriminatorKey: "mode",            // 区分不同子表单类型
    },
  },
}
```

### 工作流程

```
1. 用户选择 rewardRuleMode = "PER_APPROVED"
    ↓
2. 引擎 GET /api/v1/owner/remote-schemas/rewardRules/PER_APPROVED/form-schema
    ↓
3. 返回一段 [`FormSchema`](./form)（sections + fields）
    ↓
4. 引擎将返回的 schema 渲染为子表单
    ↓
5. 用户填写子表单
    ↓
6. 提交时，子表单数据被包装到 rewardRuleJson 字段
```

### binding 详解

```typescript
binding: {
  // 提交时：{ rewardRuleJson: { mode: "PER_APPROVED", amount: 10, ... } }
  payloadField: "rewardRuleJson",

  // 提交时自动移除前端拆分出的 mode/config 字段
  stripSourceFields: true,
}
```

### 不清理前端字段

某些场景下需要保留前端字段同时提交到 payloadField：

```typescript
binding: {
  payloadField: "settingsJson",
  stripSourceFields: false,    // 不删除前端字段
}
```

## 后端需要返回的数据格式

### 远程选项 API

```json
// GET /api/v1/engine/options/roles
[
  { "label": "管理员", "value": 1 },
  { "label": "标注员", "value": 2 },
  { "label": "审核员", "value": 3 }
]
```

### 远程子表单 Schema API

```json
// GET /api/v1/owner/remote-schemas/rewardRules/PER_APPROVED/form-schema
{
  "sections": [
    {
      "key": "perItem",
      "fields": [
        {
          "key": "amount",
          "label": "每单金额",
          "component": "text",
          "inputType": "number",
          "required": true
        },
        {
          "key": "maxAmount",
          "label": "上限金额",
          "component": "text",
          "inputType": "number"
        }
      ]
    }
  ]
}
```

:::tip 最佳实践
1. `remoteSchema` 避免嵌套过深，建议最多 2 层
2. `dependsOn` 字段建议使用 `remoteSelect` 或 `select`，方便用户感知可选项
3. 远程选项 API 应支持搜索（`?keyword=xxx`），否则大数据量时用户体验差
:::
