# 数据预处理

> **相关文档**：[表单配置](./form) | [ResourceMeta 总览](./resource-meta) | [最佳实践](./best-practices)

引擎提供了两个生命周期钩子，用于在数据流动的关键节点进行转换。

## `normalizeRecord` — 列表/详情数据后处理

后端返回的数据在渲染前会经过此函数。常用于：

- **类型标准化**：将后端 0/1 转为布尔值
- **派生计算字段**：基于原始数据计算新字段
- **格式化**：拼接展示文本

### 示例：派生计算字段

```typescript
normalizeRecord: (record) => {
  const templateReady = record.templateReady === true || record.templateReady === 1;
  const publishReady = record.publishReady === true || record.publishReady === 1;

  let readiness = "待模板";
  if (publishReady) {
    readiness = "可发布";
  } else if (templateReady) {
    readiness = "待检查";
  }

  return {
    ...record,
    readiness,                              // 派生字段，可在 table.columns 中直接用
    templateReady: templateReady ? "是" : "否",
    publishReady: publishReady ? "是" : "否",
  };
},
```

此时 `table.columns` 可以直接引用 `readiness`：

```typescript
columns: [
  { key: "readiness", title: "发布就绪", type: "text" },
]
```

### 示例：Snowflake ID 标准化

```typescript
import { normalizeSnowflakeId } from "@/low-code/lib/id-utils";

normalizeRecord: (record) => ({
  ...record,
  id: normalizeSnowflakeId(record.id) ?? record.id,
  taskId: normalizeSnowflakeId(record.taskId) ?? record.taskId,
}),
```

### 示例：数组嵌套对象展开

```typescript
normalizeRecord: (record) => {
  const roles = Array.isArray(record.roles) ? record.roles : [];
  return {
    ...record,
    roles: roles.map((item) =>
      typeof item === "object" ? String(item.roleName) : String(item)
    ),
    roleIds: roles
      .map((item) => (typeof item === "object" ? Number(item.id) : null))
      .filter(Boolean),
  };
},
```

## `prepareValues` — 提交数据预处理

表单提交时，在发送 API 请求前对数据进行清洗。常用于：

- **提取有用字段**：只提交后端需要的字段，避免多余字段导致报错
- **类型转换**：将字符串 ID 转为数字
- **空值处理**：可选字段传 `null` 而非空字符串

### 示例：字段清洗

```typescript
prepareValues: (values) => ({
  username: values.username,
  displayName: values.displayName,
  email: values.email || null,
  phone: values.phone || null,
  roleIds: Array.isArray(values.roleIds)
    ? values.roleIds.map((item) => Number(item))
    : [],
}),
```

### 示例：远程 Schema 联动提交

当使用 `remoteSchema` 时，`prepareValues` 确保只提交关键字段：

```typescript
prepareValues: (values) => ({
  title: values.title,
  taskCode: values.taskCode,
  rewardRuleJson: values.rewardRuleJson || null, // remoteSchema 绑定的 payloadField
  settingsJson: values.settingsJson || null,
}),
```

:::tip 最佳实践
**一定要写 `prepareValues`**，否则表单的所有字段（包括前端临时字段、ui 状态字段）都会发到后端，可能引发后端反序列化异常。
:::
