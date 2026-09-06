# 后端数据契约

低代码引擎在运行时需要后端提供三类动态数据：**字典（dict）**、**远程选项（remote/option）**、**远程子表单（remoteSchema）**。本文档描述这三类数据的请求定义与后端返回契约。

> **背景**：引擎不自带后端，所有数据通过配置的 `HttpClient` 发出 HTTP 请求。无论后端使用什么技术栈，只需按约定返回对应格式的数据即可。

---

## 一、字典（Dict）

字典用于将编码值映射为可读标签，常用于状态列、类型列的展示与筛选。

### 请求

| 属性 | 值 |
|------|-----|
| **方法** | `GET` |
| **路径** | `/api/v1/system/dicts/{dictCode}` |
| **路径参数** | `dictCode` — 字典编码（如 `common_status`、`task_status`） |
| **查询参数** | 无 |
| **不可覆盖** | 该路径为硬编码，不支持通过 `resource.api` 覆盖 |

### 响应

```json
[
  {
    "id": 1,
    "dictTypeId": 1,
    "itemCode": "ACTIVE",
    "itemLabel": "启用",
    "itemValue": "ACTIVE",
    "sortNo": 1,
    "isDefault": true,
    "status": "ACTIVE",
    "className": null,
    "tone": "success"
  },
  {
    "id": 2,
    "dictTypeId": 1,
    "itemCode": "DISABLED",
    "itemLabel": "禁用",
    "itemValue": "DISABLED",
    "sortNo": 2,
    "isDefault": false,
    "status": "ACTIVE",
    "className": null,
    "tone": "danger"
  }
]
```

### 字段映射

| 后端字段 | 引擎使用 | 说明 |
|---------|---------|------|
| `itemValue` | `OptionItem.value` | 唯一标识，与数据库值一致 |
| `itemLabel` | `OptionItem.label` | 前端展示文本 |
| `className` | `OptionItem.className` | 自定义 CSS 类名（设计器用） |
| `tone` | `OptionItem.tone` | 预设色调：`success` / `warning` / `destructive` / `neutral` |

### Schema 引用

```typescript
{
  key: "status",
  title: "状态",
  type: "status",           // 表格列：彩色标签
  dict: "common_status"     // ← 引用字典编码
}
```

支持 `dict` 的字段类型：

| 场景 | 属性 | 示例 |
|------|------|------|
| 表格列 `type: "status"` | `column.dict` | `{ key: "status", type: "status", dict: "common_status" }` |
| 筛选字段 | `field.dict` | `{ key: "status", component: "select", dict: "common_status" }` |
| 表单字段 | `field.dict` | `{ key: "status", component: "select", dict: "common_status" }` |
| 详情字段 | `field.dict` | 自动继承同 key 表格列的 dict |
| 卡片徽标 | `badge.dict` | 卡片页面 badge 配色 |

### 自定义映射（不依赖后端字典）

使用 `enum` 替代 `dict`，字段级静态配置：

```typescript
{
  key: "status",
  title: "状态",
  type: "status",
  enum: [
    { label: "启用", value: "ACTIVE", tone: "success" },
    { label: "禁用", value: "DISABLED", tone: "danger" },
  ],
}
```

### LabelHub 后端实现要点

```java
// DictController.java
@GetMapping("/api/v1/system/dicts/{dictCode}")
public Result<List<DictItemOptionDto>> getDictItems(@PathVariable String dictCode) {
    // 1. 按 dictCode 查询字典类型
    // 2. 查询该类型下所有 status = ACTIVE 的字典项
    // 3. 按 sortNo 排序返回
}

// DictItemOptionDto.java
public class DictItemOptionDto {
    private Long id;
    private Long dictTypeId;
    private String itemCode;
    private String itemLabel;
    private String itemValue;
    private Integer sortNo;
    private Boolean isDefault;
    private String status;
    private String className;   // 可选
    private String tone;        // 可选: success/warning/destructive/neutral
}
```

---

## 二、远程选项（Remote / Options）

远程选项用于下拉选择框动态从后端加载候选数据。

### 请求

| 属性 | 值 |
|------|-----|
| **方法** | `GET` |
| **默认路径** | 分两类（见下方表格） |
| **查询参数** | `?keyword=xxx`（搜索关键词，可选） |
| **覆盖方式** | `resource.api.options[source]` |

### 默认路径路由

| 场景 | `source` 值 | 默认路径 |
|------|------------|---------|
| 引擎数据 | `"roles"` / `"users"` 等 | `GET /api/v1/engine/options/{source}` |
| 业务数据 | `"collaborators"` / `"assignableTaskItems"` | `GET /api/v1/business/options/{source}` |
| 字典数据 | `"dict:common_status"` | `GET /api/v1/system/dicts/{dictCode}`（复用字典 API） |
| 自定义 | 任意 | 通过 `api.options` 覆盖 |

### 路径覆盖

```typescript
api: {
  options: {
    roles: "/api/v1/custom/roles",       // 覆盖默认路径
    users: "/api/v1/custom/users/list",
  },
}
```

### 响应

```json
[
  { "label": "管理员", "value": 1 },
  { "label": "标注员", "value": 2 },
  { "label": "审核员", "value": 3 }
]
```

### 字段映射

| 后端字段 | 引擎使用 | 说明 |
|---------|---------|------|
| `value` | 选项唯一标识 | 存储到对应字段的值 |
| `label` | 选项展示文本 | 下拉框/选择器展示文案 |

可以通过 `RemoteOptionMeta.labelKey` / `valueKey` 自定义映射字段名。

### 搜索支持

选项接口应支持 `?keyword=` 查询参数实现搜索过滤：

```json
// GET /api/v1/engine/options/users?keyword=张
[
  { "label": "张瑞", "value": 1001 },
  { "label": "张潇", "value": 1002 }
]
```

### 动态参数

选项接口可额外接收自定义查询参数，从表单字段自动取值：

```json
// GET /api/v1/engine/options/cities?provinceId=10
```

### Schema 引用

```typescript
// 基础远程选择
{ key: "roleIds", component: "remoteSelect", remote: { source: "roles" } }

// 带搜索
{ key: "userId", component: "remoteSelect", remote: { source: "users" } }

// 带静态参数
{ key: "cityId", component: "remoteSelect", remote: { source: "cities", params: { provinceId: "10" } } }

// 带动态参数（级联）
{ key: "cityId", component: "remoteSelect", dependsOn: "provinceId",
  remote: { source: "cities", params: { provinceId: { from: "provinceId" } } } }

// 树形选项
{ key: "deptId", component: "remoteTreeSelect",
  remote: { source: "departments", variant: "tree" } }

// 字典作为选项
{ key: "status", component: "select", dict: "common_status" }
```

### LabelHub 后端实现要点

LabelHub 后端通过 `LowCodeOptionProvider` 接口注册选项数据源，统一由 `LowCodeOptionController` 分发。

**核心接口：**

```java
// LowCodeOptionProvider.java
public interface LowCodeOptionProvider {
    String optionKey();                              // 选项唯一标识
    List<OptionItem> options(String keyword);        // 返回选项列表
    default String[] requiredPermissions() { ... }   // 可选权限控制
}
```

**实现示例：**

```java
@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class RoleOptionProvider implements LowCodeOptionProvider {
    private final RoleService roleService;

    public RoleOptionProvider(RoleService roleService) {
        this.roleService = roleService;
    }

    @Override
    public String optionKey() { return "roles"; }

    @Override
    public List<OptionItem> options(String keyword) {
        return roleService.list().stream()
                .filter(r -> keyword == null || r.getName().contains(keyword))
                .map(r -> new OptionItem(r.getName(), r.getId()))
                .toList();
    }
}
```

添加新选项源只需新增一个 `@Component` 实现 `LowCodeOptionProvider`，自动注册到 `LowCodeProviderRegistry`，无需修改 Controller 或配置文件。

**统一入口控制器（框架内部实现，一般无需修改）：**

```java
@GetMapping("/api/v1/engine/options/{optionKey}")
public Result<List<OptionItemDto>> getOptions(
    @PathVariable String optionKey,
    @RequestParam(required = false) String keyword
) {
    // 按 optionKey 查找 LowCodeOptionProvider → 调用 options(keyword) → 返回
}
```

---

## 三、远程子表单（RemoteSchema）

远程子表单根据当前表单的某个值动态加载另一段表单 Schema。

### 请求

| 属性 | 值 |
|------|-----|
| **方法** | `GET` |
| **路径** | 由 `RemoteSchemaMeta.api` 定义，支持 `{param}` 路径占位符 |
| **路径参数** | 从当前表单值自动提取 `{param}` 对应的字段值 |
| **不可默认** | 必须显式配置 `api`，无默认路径 |

### 响应

返回一段完整的 `FormSchema`：

```json
{
  "sections": [
    {
      "key": "perItem",
      "title": "每项配置",
      "fields": [
        {
          "key": "amount",
          "label": "每单金额",
          "component": "text",
          "inputType": "number",
          "required": true,
          "rules": [{ "type": "min", "value": 0, "message": "金额不能为负" }]
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

### 请求-响应完整流程

```
1. 用户选择 rewardRuleMode = "PER_APPROVED"
    ↓
2. 引擎自动 GET /api/v1/owner/remote-schemas/rewardRules/PER_APPROVED/form-schema
    ↓
3. 后端返回 { sections: [...] }  ← 完全符合 FormSchema 类型
    ↓
4. 引擎渲染返回的字段到表单中
    ↓
5. 用户填写后提交
    ↓
6. 引擎将子表单数据合并到绑定字段 rewardRuleJson
```

### pathParams 绑定

`{param}` 占位符自动从表单值中提取：

```typescript
api: "/api/v1/schemas/{scene}/form"

// 表单中 scene = "review" 时实际请求：
// GET /api/v1/schemas/review/form
```

### Schema 引用

```typescript
{
  key: "rewardRuleConfig",
  label: "奖励规则",
  component: "remoteSchema",
  remoteSchema: {
    api: "/api/v1/owner/remote-schemas/rewardRules/{rewardRuleMode}/form-schema",
    dependsOn: "rewardRuleMode",
    binding: {
      payloadField: "rewardRuleJson",
      discriminatorKey: "mode",
    },
  },
}
```

### binding 数据流

```
                  ↓ 加载
后端返回 { sections, fields }
                  ↓ 渲染
用户填写子表单
                  ↓ binding 拆分
{ rewardRuleMode: "PER_APPROVED", amount: 10, ... }
                  ↓ binding 合并 + 提交
{ rewardRuleJson: { mode: "PER_APPROVED", amount: 10, ... } }
```

### LabelHub 后端实现要点

LabelHub 后端提供**两种方式**实现远程子表单：

#### 方式一：声明式（推荐）— `@LhSchemaRoot` 注解

在 Java Record 上标注 `@LhSchemaRoot`，引擎自动扫描、注册并暴露 REST 端点。

**核心注解：**

| 注解 | 作用 |
|------|------|
| `@LhSchemaRoot` | 标注在 Record 上，声明 schema 元数据（namespace / key / label / permissions） |
| `@LhSchemaSections` + `@LhSchemaSection` | 定义表单分区 |
| `@LhSchemaField` | 标注在 Record Component 上，定义字段（label / component / required / rules / options） |
| `@LhSchemaOption` | 定义静态选项 |
| `@LhSchemaRule` | 定义校验规则 |

**可用控件：** `TEXT` / `TEXTAREA` / `NUMBER` / `SELECT` / `SWITCH` / `CHECKBOX_GROUP` / `ARRAY`

**示例：**

```java
@LhSchemaRoot(
        namespace = "rewardRules",
        key = "PER_APPROVED",
        label = "按通过条数计奖",
        title = "奖励规则配置",
        description = "每条审核通过的提交按固定单价发放奖励。",
        permissions = {"system:admin", "business:task:create", "business:labeler:workbench"})
@LhSchemaSections(@LhSchemaSection(key = "basic", title = "基础配置"))
public record PerApprovedRewardRuleConfig(
        @LhSchemaField(
                sectionKey = "basic",
                label = "币种",
                component = LhSchemaComponent.SELECT,
                defaultValue = "CNY",
                options = {
                    @LhSchemaOption(label = "人民币 CNY", value = "CNY"),
                    @LhSchemaOption(label = "美元 USD", value = "USD")
                })
        String currency,
        @LhSchemaField(
                sectionKey = "basic",
                label = "单条奖励金额",
                jsonKey = "base_amount",
                component = LhSchemaComponent.NUMBER,
                required = true,
                rules = @LhSchemaRule(type = "min", value = "0", message = "奖励金额不能小于 0"))
        BigDecimal baseAmount) {

    public static PerApprovedRewardRuleConfig from(Map<String, Object> json) { /* ... */ }
}
```

**自动注册流程：**

```
@LhSchemaRoot 标注 Record
       │
       ▼
LhSchemaRootClasspathScanner  启动时扫描 3 个固定包
       │                        (com.labelhub.core.business.*)
       ▼
RemoteSchemaBeanRegistrar     自动注册 SchemaRemoteSchemaProvider Bean
       │
       ▼
SchemaIntrospector            反射读取 Record Component + 注解 → 生成 Map<String,Object> FormSchema
       │
       ▼
OwnerRemoteSchemaController   自动提供 GET /api/v1/owner/remote-schemas/{namespace}/{key}/form-schema
LabelerRemoteSchemaController 自动提供 GET /api/v1/labeler/remote-schemas/{namespace}/{key}/form-schema
```

新增一种奖励规则只需新建一个 `@LhSchemaRoot` Record，无需接触 Controller、Provider 或注册逻辑。`RewardRuleOptionProvider` 自动通过 `RemoteSchemaRegistry.listByNamespace("rewardRules")` 感知新规则。

#### 方式二：编程式 — `@GetMapping` Controller

```java
@GetMapping("/api/v1/owner/remote-schemas/rewardRules/{mode}/form-schema")
public Result<FormSchemaDto> getRewardRuleFormSchema(@PathVariable String mode) {
    // 1. 按 mode 返回对应的 FormSchema（sections + fields）
    // 2. 可在数据库配置或代码中预定义模板
    return Result.ok(buildFormSchema(mode));
}
```

---

## 四、接入通用 REST 后端

如果后端不是 LabelHub 体系，引擎通过两层机制适配：

### 4.1 HttpClient 桥接层

所有 HTTP 请求最终经过 `adapters/interfaces.ts` 定义的 `HttpClient`：

```typescript
interface HttpClient {
  request<T>(path: string, init?: RequestOptions): Promise<T>;
}

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  notifyOnError?: boolean;
  errorMessage?: string;
}
```

在应用初始化时注入：

```typescript
import { configure, LowCodeEngineProvider } from "@labelhub/low-code-engine";

// 方式一：使用 axios
configure({
  httpClient: {
    async request(path, init) {
      const response = await axios({
        url: path,
        method: init?.method ?? "GET",
        headers: init?.headers,
        data: init?.body,
      });
      return response.data;
    },
  },
  messageService: { /* ... */ },
});

// 方式二：使用 fetch
configure({
  httpClient: {
    async request(path, init) {
      const response = await fetch(path, {
        method: init?.method ?? "GET",
        headers: { "Content-Type": "application/json", ...init?.headers },
        body: init?.body as string,
      });
      return response.json();
    },
  },
  messageService: { /* ... */ },
});
```

### 4.2 路径覆盖

通过 `resource.api` 覆盖默认的引擎路径和选项路径：

```typescript
api: {
  query: "/api/custom/users",                // 列表查询
  detail: "/api/custom/users/{id}",          // 详情
  create: "/api/custom/users",               // 创建
  update: "/api/custom/users/{id}",          // 更新
  delete: "/api/custom/users/{id}",          // 删除
  options: {
    roles: "/api/custom/role-options",       // 远程选项
    users: "/api/custom/user-options",
  },
},
```

### 4.3 数据契约对齐

引擎需要的后端数据结构：

```typescript
// 列表响应
interface PageResponse<T> {
  total: number;
  page: number;
  pageSize: number;
  list: T[];
}

// 选项响应
type OptionItem = { label: string; value: string | number | boolean };

// 字典响应
interface DictItem {
  itemValue: string;
  itemLabel: string;
  className?: string;
  tone?: string;
}

// 远程子表单响应 — 即 FormSchema（单层即可）
interface FormSchema {
  sections: Array<{
    key: string;
    title?: string;
    fields: FormFieldSchema[];
  }>;
}
```

### 4.4 normalizeRecord / prepareValues

当后端返回的数据结构与前端期望的字段名不一致时，通过 `normalizeRecord`（后端→前端）和 `prepareValues`（前端→后端）做适配：

```typescript
const resource: ResourceMeta = {
  // ...
  api: { query: "/api/external/items" },
  normalizeRecord: (record) => ({
    id: record.uuid,              // 后端 uuid → 前端 id
    name: record.title,           // 后端 title → 前端 name
    status: record.state,         // 后端 state → 前端 status
    createdAt: record.create_time,
  }),
  prepareValues: (values) => ({
    uuid: values.id,              // 前端 id → 后端 uuid
    title: values.name,
    state: values.status,
    create_time: values.createdAt,
  }),
};
```

### 4.5 完整接入示例（通用 REST）

```typescript
import { configure, LowCodeEngineProvider } from "@labelhub/low-code-engine";

// 1. 配置 HttpClient
configure({
  httpClient: {
    async request(path, init) {
      const token = localStorage.getItem("token");
      const res = await fetch(`https://api.example.com${path}`, {
        method: init?.method ?? "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...init?.headers,
        },
        body: init?.body as string | undefined,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  },
  messageService: {
    success: (msg) => toast.success(msg),
    error: (msg, desc) => toast.error(desc ? `${msg}: ${desc}` : msg),
    warning: (msg) => toast.warning(msg),
    info: (msg) => toast.info(msg),
    errorFrom: (err, fb) => toast.error(fb),
  },
});

// 2. 包裹应用
function App() {
  return (
    <LowCodeEngineProvider config={{ httpClient, messageService }}>
      <YourApp />
    </LowCodeEngineProvider>
  );
}

// 3. 定义资源
const myResource: ResourceMeta = {
  resource: "items",
  label: "数据项",
  idKey: "id",
  api: {
    query: "/api/items",                 // 传统 REST 列表
    detail: "/api/items/{id}",
    create: "/api/items",
    update: "/api/items/{id}",
    options: {
      categories: "/api/categories",     // 远程选项
    },
  },
  normalizeRecord: (r) => ({ ...r }),
  prepareValues: (v) => ({ ...v }),
  // ...
};
```

---

## 五、快速参考

| 数据源 | HTTP | 默认路径 | 可覆盖 | 响应类型 |
|--------|------|---------|--------|---------|
| dict | GET | `/api/v1/system/dicts/{code}` | ❌ 否 | `DictItem[]` |
| engine option | GET | `/api/v1/engine/options/{source}` | ✅ `api.options` | `OptionItem[]` |
| business option | GET | `/api/v1/business/options/{source}` | ✅ `api.options` | `OptionItem[]` |
| dict as option | GET | `/api/v1/system/dicts/{code}` | ✅ `api.options` | `OptionItem[]` |
| remoteSchema | GET | 由 `RemoteSchemaMeta.api` 定义 | — | `FormSchema` |
