/** 过滤器字段支持的控件类型 */
export type FilterFieldComponent =
  | "text"
  | "select"
  | "multiSelect"
  | "tags"
  | "dateRange"
  | "dateTimeRange"
  | "numberRange"
  | "remoteSelect"
  | "statusSelect"
  | "number";

/** 表单字段支持的控件类型 */
export type FormFieldComponent =
  | "text"
  | "textarea"
  | "richText"
  | "select"
  | "remoteSelect"
  | "remoteTreeSelect"
  | "treeMultiSelect"
  | "multiSelect"
  | "tags"
  | "radioGroup"
  | "checkboxGroup"
  | "switch"
  | "json"
  | "jsonEditor"
  | "codeEditor"
  | "dateRange"
  | "datetime"
  | "dateTimeRange"
  | "numberRange"
  | "showItem"
  | "showImage"
  | "showFile"
  | "showVideo"
  | "llmSuggest"
  | "fileUpload"
  | "imageUpload"
  | "dictTagTone"
  | "dictTagClassName"
  | "dictTagPreview"
  | "user"
  | "userMentionTextarea"
  | "number"
  | "array"
  | "remoteSchema"
  | "dynamicTable"
  | "assignmentPicker";

export type ActionKind = "button" | "drawer" | "request" | "danger" | "link" | "assignment" | "workflow";
/** 资源抽屉 / 标注表单的模式，与 LHResourceForm.mode 一致 */
export type FormMode = "create" | "edit" | "assignment";
export type DrawerWidth = "sm" | "md" | "lg" | "xl" | number;
export type ConditionOperator = "eq" | "ne" | "in" | "notIn" | "contains" | "notEmpty";
/** 查询筛选支持的运算符，用于过滤器 / 后端查询 op 字段 */
export type FilterOperator = "eq" | "ne" | "in" | "notIn" | "contains" | "notEmpty" | "like" | "between";
export type SortOrder = "asc" | "desc";

export interface OptionItem {
  label: string;
  value: string | number | boolean;
  className?: string;
  tone?: string;
}

/** GET /api/v1/engine/options — 按当前用户角色过滤的远程选项数据源 */
export interface OptionSourceItem {
  key: string;
  label: string;
}

/** 远程选项 query 参数绑定：静态字符串值，或从表单字段 path 取值 */
export type RemoteParamBinding =
  | string
  | { from: string; required?: boolean };

export interface RemoteOptionMeta {
  source: string;
  labelKey?: string;
  valueKey?: string;
  /**
   * 声明式 query 参数映射。
   * key = HTTP query 名；value = 静态字符串，或 `{ from: "表单字段 path" }`。
   */
  params?: Record<string, RemoteParamBinding>;
  /** 用户搜索词映射到的 query 名，默认 keyword */
  searchParam?: string;
  variant?: "flat" | "tree";
  treeApi?: string;
}

export interface RemoteSchemaMeta {
  api: string;
  dependsOn?: string;
  clearOnDependsChange?: boolean;
  /**
   * 可选值绑定：
   * - 不配置时，当前字段值直接作为前端表单值使用
   * - 配置后，可把当前字段值 + dependsOn 指向的模式字段，自动合成为后端 payloadField
   */
  binding?: {
    /** 后端真实持久化字段，例如 rewardRuleJson */
    payloadField: string;
    /** 模式字段路径；不填时默认复用 dependsOn */
    modeField?: string;
    /** payloadField 对象中表示类型的 key，默认 mode */
    discriminatorKey?: string;
    /** 提交时是否移除前端拆分出的 mode/config 字段，默认 true */
    stripSourceFields?: boolean;
  };
}

/** 远程选项 HTTP query，键为参数名 */
export type RemoteOptionQuery = Record<string, string | undefined>;

export interface ConditionMeta {
  field: string;
  operator?: ConditionOperator;
  value: unknown;
}

export interface ValidationRuleMeta {
  type:
    | "required"
    | "minLength"
    | "maxLength"
    | "min"
    | "max"
    | "pattern"
    | "email"
    | "phone";
  value?: number | string;
  message: string;
}

export interface ResourcePermissionMeta {
  page?: string | string[];
  list?: string | string[];
  show?: string | string[];
  create?: string | string[];
  edit?: string | string[];
  delete?: string | string[];
}

export interface ResourceApiMeta {
  /** 与 capabilities.query 配合：提供则 override 引擎默认 POST /api/v1/engine/resources/{resource}/query */
  query?: string;
  /** @deprecated 兼容旧资源定义，等价于 query */
  list?: string;
  detail?: string;
  create?: string;
  /** POST 创建时以 query 传参、无 JSON body（如 Owner 任务成员接口） */
  createViaQuery?: boolean;
  update?: string;
  delete?: string;
  actions?: Record<string, string>;
  options?: Record<string, string>;
}

export interface MetricsSchema {
  items: Array<{
    key: string;
    label: string;
    field: string;
  }>;
}

export interface TableColumnSlotSwitchMeta {
  /** 开关打开时的字段值，默认 status 列为 ACTIVE，其它为 true */
  checkedValue?: unknown;
  /** 开关关闭时的字段值，默认 status 列为 DISABLED，其它为 false */
  uncheckedValue?: unknown;
  /** 打开时触发的 action key，默认 enable */
  enableAction?: string;
  /** 关闭时触发的 action key，默认 disable */
  disableAction?: string;
  permission?: string | string[];
  disabledWhen?: ConditionMeta[];
}

export interface TableColumnSlotImageMeta {
  fileIdField?: string;
  mimeTypeField?: string;
  altField?: string;
}

/** 用户引用展示（表格/详情/表单），点击弹出协作用户卡片 */
export interface UserFieldMeta {
  /** 用户 ID 字段，默认同列 key 去掉 Name 后缀 + Id，或 key + Id */
  idField?: string;
  /** 展示名字段，默认取当前列 key */
  nameField?: string;
  /** 协作者 role 筛选，与 collaborators 选项一致 */
  role?: "LABELER" | "REVIEWER" | "OWNER";
  roleFrom?: string;
}

export type TableColumnType =
  | "text"
  | "number"
  | "datetime"
  | "date"
  | "status"
  | "switch"
  | "tags"
  | "richText"
  | "file"
  | "fileUpload"
  | "image"
  | "imageUpload"
  | "json"
  | "link"
  | "user";

export interface TableColumnLinkMeta {
  labelField?: string;
  formatter?: string;
  action?: "detail" | "edit" | "workflow" | "openRelated";
  resourceKey?: string;
  /** 打开关联资源详情时使用的记录字段，默认取关联资源的 idKey */
  idField?: string;
  workflowCode?: string;
  href?: string;
  openInNewTab?: boolean;
  /** 详情 API 路径参数：键为路径占位符，值为当前行字段名 */
  pathParams?: Record<string, string>;
}

export interface TableColumnSchema {
  key: string;
  title: string;
  type?: TableColumnType;
  link?: TableColumnLinkMeta;
  /** 列宽；数字为 px，或 xs/sm/md/lg/xl 预设 */
  width?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  /** 单元格截断行数；true/2 为两行，1 为一行（与 formatter: ellipsis 等效） */
  ellipsis?: boolean | 1 | 2;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  fixed?: "left" | "right";
  visible?: boolean;
  /** 按行求值；不满足时单元格显示占位，表头仍保留 */
  visibleWhen?: ConditionMeta[];
  permission?: string | string[];
  enum?: OptionItem[];
  /** 数据字典编码，用于状态/类型等枚举展示与筛选 */
  dict?: string;
  /** 表格单元格渲染插槽，如 switch / image */
  slot?: "switch" | "image";
  slotMeta?: TableColumnSlotSwitchMeta | TableColumnSlotImageMeta;
  formatter?: string;
  user?: UserFieldMeta;
}

export interface TablePickerMeta {
  /** 选择器模式：点击行选择，可配合多选 */
  enabled?: boolean;
  selectionMode?: "single" | "multiple";
  /** 点击行触发选择，默认 true */
  rowClickSelect?: boolean;
  /** 隐藏操作列，默认 true */
  hideActionsColumn?: boolean;
}

export interface TableSchema {
  columns: TableColumnSchema[];
  rowKey?: string;
  selectable?: boolean;
  pagination?: boolean;
  defaultSort?: { field: string; order: SortOrder };
  rowActions?: ActionSchema[];
  /** 从 resource.actions 中提升为行内按钮的操作 key（其余仍进 ⋯ 菜单） */
  rowActionKeys?: string[];
  bulkActions?: ActionSchema[];
  /** 表格作为选择器（素材库、关联选择等） */
  picker?: TablePickerMeta;
}

export interface FilterFieldSchema {
  key: string;
  label: string;
  component: FilterFieldComponent;
  field?: string;
  operator?: FilterOperator;
  placeholder?: string;
  width?: number | string;
  defaultValue?: unknown;
  options?: OptionItem[];
  /** 数据字典编码，运行时从 /api/v1/system/dicts/{dictCode} 加载选项 */
  dict?: string;
  remote?: RemoteOptionMeta;
  permission?: string | string[];
}

export interface FilterSchema {
  fields: FilterFieldSchema[];
  primary?: string[];
  collapsible?:
    | boolean
    | {
      mode?: "auto" | "always";
      defaultExpanded?: boolean;
      collapsedRows?: number;
      collapsedFields?: string[];
    };
}

export interface AssignmentFieldMeta {
  /** 候选列表接口；与 candidatesSource 二选一 */
  candidatesApi?: string;
  /** 走 resource.api.options 或引擎 options */
  candidatesSource?: string;
  /** collaborators 静态 role 筛选 */
  candidatesRole?: "LABELER" | "REVIEWER" | "OWNER";
  /** collaborators 动态 role 筛选字段 */
  candidatesRoleFrom?: string;
  /** 已分配读取接口，默认同 action.api */
  assignedApi?: string;
  /** 响应为对象时，从此字段取数组，如 roles / policies */
  assignedPath?: string;
  variant?: "flat" | "tree";
  resourceTypeFilter?: boolean;
  searchPlaceholder?: string;
}

export interface AssignmentSummaryField {
  label: string;
  field: string;
}

/** 图片上传展示方式 */
export type ImageUploadDisplayMode = "thumbnail" | "list" | "card";

/** 文件/图片上传控件配置 */
export interface UploadFieldMeta {
  /** 是否允许多选（图片为多图） */
  multiple?: boolean;
  /** 最大数量，multiple 时生效，默认 9 */
  maxCount?: number;
  /** 单文件大小上限（MB），默认 5 */
  maxSizeMb?: number;
  /** input accept，默认 image/* */
  accept?: string;
  /** 图片展示：缩略图网格 / 列表 / 卡片 */
  displayMode?: ImageUploadDisplayMode;
  /** 点击图片预览大图，默认 true */
  previewOnClick?: boolean;
  /** 展示图片文件名，默认 true */
  showFileName?: boolean;
  /** 上传后允许修改图片名，默认 true */
  allowRename?: boolean;
}

/** ShowItem 展示项配置 */
export type ShowItemContentSource = "payload" | "static" | "template";

export type ShowItemRenderAs = "text" | "markdown" | "json" | "html";

export type ShowItemLayout = "inline" | "card" | "pre" | "table";

/** 展示区域高度：fixed=模板固定高度；auto=随内容并支持运行时拖动（类似 textarea） */
export type ShowItemHeightMode = "fixed" | "auto";

export interface ShowItemFieldMeta {
  /** 数据来源：payload=题目导入列，static=固定文案，template=模板插值 */
  contentSource?: ShowItemContentSource;
  /** 固定展示内容（contentSource=static） */
  staticContent?: string;
  /** 模板内容，支持 {{path}} 引用 payload / 表单值（contentSource=template） */
  templateContent?: string;
  /** 渲染方式 */
  renderAs?: ShowItemRenderAs;
  /** 布局 */
  layout?: ShowItemLayout;
  /** 展示高度模式，默认 auto */
  heightMode?: ShowItemHeightMode;
  /** heightMode=fixed 时的固定高度（px），超出在区域内滚动 */
  maxHeight?: number;
}

/** 富文本字段扩展配置 */
export interface RichTextFieldMeta {
  /** 是否允许从素材库插入图片，默认 false */
  enableAssetLibrary?: boolean;
  /** 设计器登记的素材引用，便于管理与审计 */
  assets?: FileAssetRef[];
  /** 素材图片最大高度（px），默认 240 */
  imageMaxHeight?: number;
  /** 素材图片缩放方式，默认 contain */
  imageFit?: "contain" | "cover";
  /** 预览/只读态允许点击素材图片调整单张尺寸，默认 true */
  previewImageResize?: boolean;
}

/** 文件资产引用（schema 持久化，不含临时 URL） */
export interface FileAssetRef {
  fileId: number | string;
  name: string;
  mimeType?: string;
  sizeBytes?: number;
}

export type ShowAssetContentSource = "payload" | "asset" | "static";

export interface ShowImageFieldMeta {
  contentSource?: ShowAssetContentSource;
  /** 素材库选中的单个文件（contentSource=asset，单图） */
  asset?: FileAssetRef;
  /** 素材库选中的多个文件（contentSource=asset，多图） */
  assets?: FileAssetRef[];
  /** 固定图片 URL（contentSource=static，单图） */
  staticUrl?: string;
  /** 固定图片 URL 列表（contentSource=static，多图，一行一个） */
  staticUrls?: string[];
  alt?: string;
  fit?: "contain" | "cover";
  maxHeight?: number;
  /** 是否多图展示，默认 false */
  multiple?: boolean;
  /** 多图时最大展示数量，默认 9 */
  maxCount?: number;
  /** 展示方式，同 imageUpload */
  displayMode?: ImageUploadDisplayMode;
  /** 点击图片预览大图，默认 true */
  previewOnClick?: boolean;
  /** 展示图片文件名，默认 true */
  showFileName?: boolean;
}

export interface ShowFileFieldMeta {
  contentSource?: ShowAssetContentSource;
  asset?: FileAssetRef;
  staticUrl?: string;
  showSize?: boolean;
  /** 展示区域高度（px），主要用于设计器预览与只读容器 */
  maxHeight?: number;
}

export interface ShowVideoFieldMeta {
  contentSource?: ShowAssetContentSource;
  asset?: FileAssetRef;
  staticUrl?: string;
  /** 展示视频文件名，默认 true */
  showFileName?: boolean;
  /** 播放器最大高度（px），默认 360 */
  maxHeight?: number;
  /** 显示原生播放控件，默认 true */
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
}

/** LLM 输出模式：chat 仅展示文本；agent 解析 JSON 并可写入标注字段 */
export type LlmSuggestMode = "chat" | "agent";

/** Agent 模式：LLM JSON 键 → 标注字段 path */
export interface LlmApplyMapping {
  sourceKey: string;
  targetPath: string;
}

/** 与审核配置对齐：标准模式自动组装 Agent 约束；专业模式可覆盖输出约束片段 */
export type LlmAgentConfigMode = "standard" | "pro";

/** 多提供商权重配置 */
export interface LlmProviderWeight {
  code: string;
  model: string;
  weight: number;
}

/** LLM 推荐字段配置 */
export interface LlmFieldMeta {
  /** 模型提供商标识，留空则使用模板版本默认（仅存 schema，不下发标注端） */
  providerCode?: string;
  /** 模型 key，留空则使用模板版本默认（仅存 schema，不下发标注端） */
  modelKey?: string;
  /** 多提供商路由列表（优先级从高到低，权重影响分流比例） */
  providers?: LlmProviderWeight[];
  /** chat：对话建议；agent：结构化 JSON（可应用到标注字段） */
  mode?: LlmSuggestMode;
  configMode?: LlmAgentConfigMode;
  /** agent 模式：仅选择要自动填充的标注字段 path，JSON 键由服务端推导 */
  applyTargets?: string[];
  /** @deprecated 请使用 applyTargets；保留用于迁移旧模板 */
  applyMappings?: LlmApplyMapping[];
  /** 系统提示词（可选，设计器可编辑） */
  systemPrompt?: string;
  /** 用户提示词模板，支持 {{path}}（设计器可编辑） */
  promptTemplate?: string;
  /** 专业模式：覆盖 Agent 输出约束注入段 */
  agentPromptSuffix?: string;
  /** 注入上下文的字段 path/key（保存时由模板变量自动推导） */
  contextFields?: string[];
  /** 生成按钮文案，默认「获取建议」 */
  buttonLabel?: string;
  /** 允许重复生成，默认 true */
  allowRegenerate?: boolean;
  /** 进入标注工作台时自动加载 LLM 建议（仅对空字段生效），默认 false */
  autoLoad?: boolean;
}

export interface AssignmentActionMeta extends AssignmentFieldMeta {
  payloadKey: string;
  title?: string;
  description?: string;
  width?: DrawerWidth;
  fieldLabel?: string;
  /** 左侧对象信息卡片 */
  summary?: AssignmentSummaryField[];
  targetTitle?: string;
  targetDescription?: string;
}

/** 导入数据契约相关元数据（与 task-import-data-contract 设计对齐） */
export type ImportFieldRole = "display" | "input" | "runtime";

export type PayloadSourceKind = "import" | "annotation" | "runtime";

export interface FormFieldImportMeta {
  /** 导入列角色：display=题目必填契约，input=可选预填，runtime=LLM 等运行时 */
  importRole?: ImportFieldRole;
  /** payload 来源；runtime 字段默认不参与导入校验 */
  payloadSource?: PayloadSourceKind;
  /** 为 true 时允许导入文件出现同名列（覆盖 runtime 默认禁止） */
  allowImport?: boolean;
}

export interface FormFieldSchema {
  key: string;
  path?: string;
  label: string;
  component: FormFieldComponent;
  inputType?: "text" | "number" | "password";
  meta?: FormFieldImportMeta;
  required?: boolean;
  readonly?: boolean;
  hidden?: boolean;
  placeholder?: string;
  description?: string;
  span?: 12 | 24;
  defaultValue?: unknown;
  options?: OptionItem[];
  /** 数据字典编码，运行时从 /api/v1/system/dicts/{dictCode} 加载选项 */
  dict?: string;
  optionsFrom?: string;
  optionMap?: Record<string, OptionItem[]>;
  dependsOn?: string;
  remote?: RemoteOptionMeta;
  remoteSchema?: RemoteSchemaMeta;
  upload?: UploadFieldMeta;
  llm?: LlmFieldMeta;
  assignment?: AssignmentFieldMeta;
  rules?: ValidationRuleMeta[];
  /** 仅在指定表单模式下展示；未配置则在 create / edit / assignment 均展示 */
  visibleIn?: FormMode[];
  /** 在指定表单模式下禁用（仍展示）；可与 readonly、disabledWhen 叠加 */
  disabledIn?: FormMode[];
  visibleWhen?: ConditionMeta[];
  disabledWhen?: ConditionMeta[];
  permission?: string | string[];
  fields?: FormFieldSchema[];
  /** array 子项布局：card=卡片（默认），table=可编辑表格 */
  itemLayout?: "card" | "table";
  /** ShowItem 等展示控件的格式化方式，与详情页 formatter 一致 */
  formatter?: string;
  /** ShowItem 等展示控件的值类型提示 */
  displayType?: DetailFieldType;
  /** ShowItem 展示项扩展配置 */
  showItem?: ShowItemFieldMeta;
  showImage?: ShowImageFieldMeta;
  showFile?: ShowFileFieldMeta;
  showVideo?: ShowVideoFieldMeta;
  /** 富文本扩展配置（素材库插入等） */
  richText?: RichTextFieldMeta;
  /** 表单内嵌动态表格（复用 LHDataTable，非 array） */
  dynamicTable?: FormDynamicTableMeta;
  /** component=user 时的协作者筛选与 ID 字段配置 */
  user?: UserFieldMeta;
}

export interface FormDynamicTableListFilter {
  field: string;
  op: FilterOperator;
  value: unknown;
}

export interface FormDynamicTableMeta {
  /** 未配置时使用 resourceKey 对应资源的 table.columns */
  columns?: TableColumnSchema[];
  rowKey?: string;
  /** 数据来源：resource（默认）| static */
  dataSource?: "resource" | "static";
  resourceKey?: string;
  /** static 时行数据在 values 中的路径 */
  dataPath?: string;
  scope?: {
    field: string;
    from?: string;
  };
  listFilters?: FormDynamicTableListFilter[];
  selectable?: boolean;
  selectionPath?: string;
  pagination?: boolean;
  pageSize?: number;
  hideActionsColumn?: boolean;
  rowSelectableWhen?: ConditionMeta[];
  /** 表单字段固定高度（px），表格区域内部滚动，分页器贴底 */
  height?: number;
  maxHeight?: number;
  empty?: { title?: string; description?: string };
}

export interface FormSectionSchema {
  key: string;
  title?: string;
  description?: string;
  /** 仅在指定表单模式下展示整个分区；未配置则始终展示 */
  visibleIn?: FormMode[];
  fields: FormFieldSchema[];
}

export interface DrawerSubmitAction {
  key: string;
  label: string;
  kind?: "submit" | "secondary";
}

export interface FormSchema {
  title?: string;
  description?: string;
  /** 无 headerActions 时默认新建按钮文案；未配置则为「新建{resource.label}」 */
  createButtonLabel?: string;
  width?: DrawerWidth;
  sections: FormSectionSchema[];
  actions: DrawerSubmitAction[];
}

/** 详情字段 / arrayTable 列支持的格式化器（与 formatFieldValue 实现对齐） */
export type DetailFieldFormatter = "json" | "payloadPreview" | "bytes" | "boolean";

/** arrayTable 子列展示类型（DetailFieldType 的可展示子集） */
export type DetailArrayColumnType =
  | "text"
  | "number"
  | "datetime"
  | "date"
  | "enum"
  | "json"
  | "tags";

export interface DetailArrayColumnSchema {
  key: string;
  label: string;
  type?: DetailArrayColumnType;
  formatter?: DetailFieldFormatter;
  /** type=enum 时的静态选项映射 */
  enum?: OptionItem[];
}

export type DetailFieldType =
  | "text"
  | "number"
  | "datetime"
  | "date"
  | "status"
  | "tags"
  | "richText"
  | "json"
  | "link"
  | "file"
  | "image"
  | "enum"
  | "remoteSchema"
  | "payloadMap"
  | "arrayTable"
  | "dictTagPreview"
  | "user"
  | "timeline"
  | "timelineGroup"
  | "templateForm"
  // 允许通过 registerDetailFieldComponent 注册自定义类型
  | (string & {});

export interface DetailTemplateFormMeta {
  /** 模板 schema JSON 字段，默认 templateSchemaJson */
  schemaField?: string;
  /** 表单值字段，默认 submitData */
  dataField?: string;
  /** display=题目展示区；input=标注作答区 */
  role?: "input" | "display";
}

export interface DetailFieldSchema {
  key: string;
  path?: string;
  label: string;
  type?: DetailFieldType;
  /** 详情结构化展示；未配置时尝试匹配 form.remoteSchema.binding.payloadField */
  remoteSchema?: RemoteSchemaMeta;
  formatter?: DetailFieldFormatter;
  /** 枚举映射，常用于详情页 enum/status 展示 */
  enum?: OptionItem[];
  /** @deprecated 请使用 enum */
  options?: OptionItem[];
  /** 数据字典编码；未指定时尝试匹配 table.columns 同 key 的 dict */
  dict?: string;
  permission?: string | string[];
  /** type=arrayTable 时的列定义 */
  columns?: DetailArrayColumnSchema[];
  user?: UserFieldMeta;
  /** type=link 时与 table.columns.link 相同语义（openRelated / 下载等） */
  link?: TableColumnLinkMeta;
  /** type=templateForm 时按模板 schema 只读渲染 LHResourceForm */
  templateForm?: DetailTemplateFormMeta;
}

export interface DetailSectionSchema {
  key: string;
  title?: string;
  fields: DetailFieldSchema[];
}

export interface DetailSchema {
  width?: DrawerWidth;
  /** stack=纵向分段（默认）；tabs=横向 Tab 切换，Tab 栏可左右滑动 */
  layout?: "stack" | "tabs";
  sections: DetailSectionSchema[];
}

export interface SidePanelActionMeta {
  resourceKey: string;
  scope: {
    field: string;
    from?: string;
  };
  listLoaderCode?: string;
  /** 侧栏宽度，默认 md（640px） */
  width?: DrawerWidth;
  hideFilters?: string[];
  /** 侧栏列表固定筛选，例如仅 REVIEWER 成员 */
  listFilters?: Array<{ field: string; op?: FilterOperator; value: string }>;
  /** 新建表单默认值 */
  createDefaults?: Record<string, unknown>;
  /** 侧栏场景覆盖默认新建按钮文案（优先于 resource.form.createButtonLabel） */
  createButtonLabel?: string;
  /** 从父记录模板解析的新建默认值，如 { templateCode: "{taskCode}-tpl" } */
  createDefaultsFromRecord?: Record<string, string>;
  /** 新建/编辑表单中隐藏的字段 key */
  hideFormFields?: string[];
  title?: string;
  description?: string;
}

export interface WorkflowActionMeta {
  rendererCode: string;
  title?: string;
  description?: string;
  width?: "sm" | "md" | "lg" | "xl";
  placement?: "left" | "right";
}

export interface ActionSchema {
  key: string;
  label: string;
  kind: ActionKind;
  actionCode?: string;
  permission?: string | string[];
  visibleWhen?: ConditionMeta[];
  /** 列表行操作中隐藏，仅在详情/其他入口中展示 */
  hiddenInList?: boolean;
  confirm?: {
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
  };
  prompt?: PromptFormSchema;
  /** assignment / request 提交地址，assignment 场景同时用于读取已分配（GET） */
  api?: string;
  /** request 动作附带的请求体；支持常量值或从当前记录取字段值 */
  requestBody?: Record<string, unknown>;
  /** 批量 assignment 提交地址 */
  bulkApi?: string;
  assignment?: AssignmentActionMeta;
  sidePanel?: SidePanelActionMeta;
  workflow?: WorkflowActionMeta;
  href?: string;
  openInNewTab?: boolean;
  /** request 成功后跳转；占位符取自 record 与接口响应合并结果 */
  navigateOnSuccess?: {
    href: string;
    replace?: boolean;
  };
  /** request 成功提示；占位符取自 record 与接口响应合并结果 */
  successMessage?: string;
}

export interface CardFieldBinding {
  field: string;
  path?: string;
  formatter?: string;
  fallback?: string;
}

export interface CardBadgeBinding extends CardFieldBinding {
  enum?: Array<{ value: unknown; label: string; tone?: "default" | "success" | "warning" | "destructive" }>;
  /** 数据字典编码，优先于 enum 静态配置 */
  dict?: string;
}

export interface CardMetricBinding {
  label: string;
  field: string;
  path?: string;
  formatter?: string;
}

export interface CardPageSchema {
  layout?: "grid" | "list";
  columns?: { base?: number; sm?: number; md?: number; lg?: number; xl?: number };
  gap?: "sm" | "md" | "lg";
  clickable?: boolean;
  cover?: CardFieldBinding;
  title: CardFieldBinding;
  subtitle?: CardFieldBinding;
  description?: CardFieldBinding & { maxLines?: number };
  badges?: CardBadgeBinding[];
  metrics?: CardMetricBinding[];
  primaryAction?: string;
  secondaryActions?: string[];
  showOverflowMenu?: boolean;
  empty?: {
    title: string;
    description?: string;
    actionKey?: string;
  };
  skeleton?: { count?: number };
}

export type ResourcePageSummaryTone = "default" | "success" | "warning" | "destructive";

export interface ResourcePageSummaryMetricSchema {
  key: string;
  label: string;
  href?: string;
}

export interface ResourcePageSummaryActionSchema {
  label: string;
  href: string;
}

export interface ResourcePageSummarySchema {
  variant?: "rail" | "inline" | "strip";
  badge?: string;
  title: string;
  description?: string;
  emptyTitle: string;
  emptyDescription: string;
  metrics: ResourcePageSummaryMetricSchema[];
  actions?: ResourcePageSummaryActionSchema[];
}

/** Prompt 弹窗专用 schema：最多 3 个轻量字段，禁止 textarea / table 等重型控件 */
export interface PromptFormSchema {
  title: string;
  description?: string;
  fields: FormFieldSchema[];
  confirmLabel?: string;
  cancelLabel?: string;
  initialValues?: Record<string, unknown>;
}

export interface HeaderActionSchema {
  key: string;
  label: string;
  kind?: "button" | "drawer" | "request" | "link" | "workflow";
  actionCode?: string;
  permission?: string | string[];
  confirm?: {
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
  };
  prompt?: PromptFormSchema;
  api?: string;
  href?: string;
  workflow?: WorkflowActionMeta;
}

export interface ResourceMeta {
  resource: string;
  label?: string;
  idKey: string;
  page?: {
    key?: "default" | "tree" | "card";
    summary?: ResourcePageSummarySchema;
    tree?: {
      treeColumnKey: string;
      parentField: string;
      defaultExpanded?: boolean;
    };
    card?: CardPageSchema;
  };
  permissions?: ResourcePermissionMeta;
  capabilities?: {
    query?: boolean;
    detail?: boolean;
    create?: boolean;
    edit?: boolean;
    delete?: boolean;
  };
  normalizeRecord?: (record: Record<string, unknown>) => Record<string, unknown>;
  prepareValues?: (values: Record<string, unknown>) => Record<string, unknown>;
  api: ResourceApiMeta;
  metrics?: MetricsSchema;
  table?: TableSchema;
  filters: FilterSchema;
  form: FormSchema;
  detail?: DetailSchema;
  actions?: ActionSchema[];
  headerActions?: HeaderActionSchema[];
}
