import type { ReactNode } from "react";
import type { AuthenticatedUser, PageResponse } from "./lib/types";
import type { ActionSchema, FilterOperator, OptionItem, RemoteOptionQuery, ResourceMeta } from "./schema/types";
import type { HeaderActionHandler, ResourceActionHandler } from "./actions/registry";
import type { ResourceListScope } from "./utils/list-scope";

export interface EngineListQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  filters?: Array<{
    field: string;
    op: FilterOperator;
    value: unknown;
  }>;
  sort?: Array<{
    field: string;
    order: "asc" | "desc";
  }>;
}

export interface EngineListResult<TRecord> {
  data: TRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface EngineActionRequest {
  resource: ResourceMeta;
  action: ActionSchema;
  record: Record<string, unknown>;
}

export interface EngineBulkActionRequest {
  resource: ResourceMeta;
  action: ActionSchema;
  ids: Array<string | number>;
  values?: Record<string, unknown>;
  scope?: { field: string; value: string | number };
  records?: Array<Record<string, unknown>>;
}

export interface EngineContextValue {
  currentUser: AuthenticatedUser | null;
}

export type { ResourceListScope } from "./utils/list-scope";

export interface ResourcePageProps<TRecord extends Record<string, unknown>> {
  resource: ResourceMeta;
  title?: string;
  pageSize?: number;
  reloadToken?: number;
  /** 固定列表/新建上下文，例如 templateId */
  scope?: ResourceListScope;
  /** 在查询栏隐藏指定 filter key */
  hideFilters?: string[];
  /** 列表固定筛选（侧栏场景下仅展示审核员等） */
  pinnedListFilters?: Array<{ field: string; op?: FilterOperator; value: unknown }>;
  /** 新建表单默认值 */
  createDefaults?: Record<string, unknown>;
  /** 覆盖默认新建按钮文案（侧栏等场景由父 action 注入） */
  createButtonLabel?: string;
  /** 新建/编辑表单隐藏字段 */
  hideFormFields?: string[];
  /** 嵌入侧拉等容器：不展示页面级大标题 */
  embedded?: boolean;
  /** 当前登录用户（由外层注入，不传则走引擎内置 auth-stub） */
  currentUser?: AuthenticatedUser | null;
  loadList?: (query: EngineListQuery) => Promise<EngineListResult<TRecord>>;
  loadDetail?: (id: string | number) => Promise<TRecord>;
  createRecord?: (values: Record<string, unknown>) => Promise<TRecord>;
  updateRecord?: (id: string | number, values: Record<string, unknown>) => Promise<TRecord>;
  runAction?: (request: EngineActionRequest) => Promise<void>;
  loadRemoteOptions: (source: string, query?: string | RemoteOptionQuery) => Promise<OptionItem[]>;
  description?: string;
  actionHandlers?: Record<string, ResourceActionHandler>;
  headerActionHandlers?: Record<string, HeaderActionHandler>;
  /** 表格选择器模式回调（配合 resource.table.picker） */
  pickerHandlers?: {
    onRowSelect?: (record: TRecord) => void;
    onConfirm?: (records: TRecord[]) => void;
  };
  renderInsights?: (context: {
    records: TRecord[];
    total: number;
    loading: boolean;
    refreshing: boolean;
  }) => ReactNode;
}

export type ResourceRecord = Record<string, unknown>;
export type ResourcePageResponse<TRecord> = PageResponse<TRecord>;
