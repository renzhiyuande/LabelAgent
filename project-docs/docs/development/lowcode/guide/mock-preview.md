# Mock 模式与离线预览

低代码引擎内置 **mock 数据层**，可在无后端的情况下独立开发、预览和调试 Schema 配置，无需启动任何后端服务。

## 适用场景

- 编写新的 `ResourceMeta` 配置后，想立即看渲染效果
- 调试表单联动、条件显隐、远程选项等前端行为
- 写 Schema 阶段不依赖后端 API 是否就绪
- 给设计师/产品经理做交互演示

## 引擎内置 mock

引擎包 `packages/low-code-engine/src/mock/` 下已提供完整的 mock 基础设施：

```
packages/low-code-engine/src/mock/
├── demo-resource.ts    # 完整 ResourceMeta（含级联、数组、远程选项、显隐联动）
└── provider.ts         # 内存 CRUD + 筛选/排序/选项加载
```

### 可用的 mock API

| 函数 | 作用 |
|------|------|
| `fetchMockList(query)` | 分页查询，支持 `eq` / `like` / `in` / `between` 筛选 + 排序 |
| `fetchMockDetail(id)` | 详情查询 |
| `createMockRecord(values)` | 新建（自动分配 ID） |
| `updateMockRecord(id, values)` | 更新 |
| `runMockAction({ action, record })` | 行操作（approve → DONE, archive → ARCHIVED） |
| `fetchMockOptions(source, keyword?)` | 远程选项（owners / provinces / reviewers） |
| `fetchMockDependentOptions(source, dependsValue?)` | 级联选项（cities / districts / reviewers 按场景） |

### demo 资源覆盖的能力

`demoOrdersResource` 是一个完备的示例 `ResourceMeta`，覆盖了引擎绝大多数能力：

| 能力 | 示例 |
|------|------|
| 分页表格 + 排序 | ✅ 7 列，按更新时间倒排 |
| 多字段筛选 | keyword / select / multiSelect / dateTimeRange / numberRange |
| 远程选项 + 级联 | 省 → 市 → 区 三级联动 |
| 条件显隐 | `scene === "review"` 时显示审核人字段 |
| 条件禁用 | `enabled === false` 时禁用审批备注 |
| 嵌套对象 path | `contact.owner.name`、`settings.runtime.configJson` |
| 数组字段 | `steps` 数组，每项内联联动（type → 回调地址显隐） |
| JSON 编辑器 / 代码编辑器 | `configJson` + `script` |
| radioGroup / checkboxGroup / switch | 通知渠道 / 审核规则 / 启用状态 |
| 详情抽屉 | 含 json 展示、tags、datetime 等多种类型 |
| 行操作 | approve / archive |
| Danger 确认 | archive 带确认弹窗 |

## 快速开始：3 分钟预览

### 方式一：使用 `SystemLowCodeLabPage`

项目已有实验场页面（路径 `/system/lowcode-lab`），直接渲染 `demoOrdersResource` + mock provider：

```tsx
import { LHResourcePage } from "@labelhub/low-code-engine";
import { demoOrdersResource } from "@labelhub/low-code-engine/mock/demo-resource";
import {
  fetchMockList, fetchMockDetail, createMockRecord,
  updateMockRecord, runMockAction, fetchMockOptions, fetchMockDependentOptions,
} from "@labelhub/low-code-engine/mock/provider";

function SchemaPreview() {
  return (
    <LHResourcePage
      resource={demoOrdersResource}
      loadList={(query) => fetchMockList(query)}
      loadDetail={(id) => fetchMockDetail(id)}
      createRecord={(values) => createMockRecord(values)}
      updateRecord={(id, values) => updateMockRecord(id, values)}
      runAction={(request) => runMockAction(request)}
      loadRemoteOptions={(source, query) => {
        const keyword = typeof query === "string" ? query : query?.keyword;
        if (source === "cities" || source === "districts" || source === "reviewers") {
          return fetchMockDependentOptions(source, keyword);
        }
        return fetchMockOptions(source, keyword);
      }}
    />
  );
}
```

### 方式二：直接用自己写的 ResourceMeta

把 `demoOrdersResource` 换成自己写的 `ResourceMeta`，渲染同样的 mock handler：

```tsx
import { LHResourcePage } from "@labelhub/low-code-engine";
import { myResource } from "../low-code-resources/my-resource"; // 自己的 Schema
import { fetchMockList, fetchMockDetail } from "@labelhub/low-code-engine/mock/provider";

<LHResourcePage
  resource={myResource}
  loadList={(query) => fetchMockList(query)}
  loadDetail={(id) => fetchMockDetail(id)}
  loadRemoteOptions={(source, keyword) => fetchMockOptions(source, typeof keyword === 'string' ? keyword : keyword?.keyword)}
/>
```

## 使用 tsconfig paths 别名（推荐）

项目 `tsconfig.json` 已配置 paths，可以直接用 `@/low-code/` 别名：

```typescript
import { LHResourcePage } from "@/low-code";
import { demoOrdersResource } from "@/low-code/mock/demo-resource";
import { fetchMockList } from "@/low-code/mock/provider";
```

## 引擎包热更（tsup --watch）

当修改引擎包源码时（如新增组件、修复 bug），不需要手动构建：

```bash
cd packages/low-code-engine
npm run dev    # tsup --watch 模式
```

tsup 监听文件变化自动重建 ESM，前端 Vite 检测到 `dist/` 变化后触发 HMR 刷新浏览器。

## 快速验证 Schema 的 checklist

1. ✅ 表格列按预期渲染，排序生效
2. ✅ 筛选字段展示正确，提交后列表刷新
3. ✅ 新建/编辑抽屉打开，字段渲染完整
4. ✅ 远程选项加载正常，级联联动正确
5. ✅ 条件显隐/禁用按预期工作
6. ✅ 详情抽屉展示所有字段
7. ✅ 行操作执行后列表刷新
8. ✅ 危险操作弹出确认框

## Mock 的边界

| 能力 | Mock 支持 | 说明 |
|------|-----------|------|
| 分页 | ✅ | 内存分页 |
| 筛选/排序 | ✅ | `eq` / `like` / `in` / `between` |
| CRUD | ✅ | 内存数组，页面刷新后重置 |
| 远程选项 | ✅ | 静态或级联数据 |
| 详情 | ✅ | 按 ID 查找 |
| 权限 | ❌ | 不模拟权限系统 |
| 后端元数据 | ❌ | 不模拟 `/api/v1/engine/meta/` |
| 文件上传 | ❌ | 需要真实后端或 mock 上传服务 |
