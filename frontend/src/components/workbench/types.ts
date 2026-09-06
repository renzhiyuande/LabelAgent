/** 三面板布局尺寸。leading = 左侧面板，trailing = 右侧面板 */
export interface WorkbenchLayoutSizes {
  leadingWidth: number;
  trailingWidth: number;
  stackedPrimaryPercent: number;
}

/** 功能开关。每个 schema 必须显式声明全部开关 */
export interface WorkbenchLayoutFeatures {
  /** 面板拖拽重排序 */
  panelReorder: boolean;
  /** 面板折叠按钮 */
  panelCollapse: boolean;
  /** stacked 预设：左侧面板 + 中央/右侧上下堆叠 */
  stackedPreset: boolean;
  /** 辅助功能区（AuxiliaryModuleDock） */
  auxiliaryDock: boolean;
  /** 布局持久化到 localStorage */
  persistLayout: boolean;
  /** 移动端自动切换为上下堆叠 */
  responsiveStack: boolean;
  /** 面板不包裹 WorkbenchPanelShell，适合自管理标题的场景（如模板搭建） */
  panelChrome: boolean;
}

/** 面板定义 */
export interface WorkbenchPanelDefinition {
  id: string;
  label: string;
  collapsible?: boolean;
  reorderable?: boolean;
  /** 是否显示尺寸拖动手柄。"width" 表示仅提供宽度方向拖拽 */
  resizable?: boolean | "width";
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  /** 弹性 flex 面板，自动填满剩余空间。适用于主内容面板 */
  flex?: boolean;
}

export interface WorkbenchPresetDefinition<TPanelId extends string = string> {
  label: string;
  hint: string;
  panelOrder: TPanelId[];
  sizes: WorkbenchLayoutSizes;
  panelCollapsed?: Partial<Record<TPanelId, boolean>>;
}

export interface WorkbenchLayoutConfig<TPanelId extends string = string, TPreset extends string = string> {
  preset: TPreset;
  panelOrder: TPanelId[];
  sizes: WorkbenchLayoutSizes;
  panelCollapsed: Record<TPanelId, boolean>;
}

/**
 * 布局蓝图。定义面板角色、预设、功能开关与持久化配置。
 *
 * 面板角色：
 * - leading：左侧面板（固定宽度，可折叠）
 * - primary：中央主面板（flex，或 stacked 时的上方面板）
 * - trailing：右侧面板（固定宽度，可折叠）
 */
export interface WorkbenchLayoutSchema<TPanelId extends string = string, TPreset extends string = string> {
  mode: string;
  storageKey: string;
  legacyStorageKeys?: string[];
  defaultPreset: TPreset;
  /** 左侧面板 ID */
  leadingPanelId: TPanelId;
  /** 右侧面板 ID */
  trailingPanelId: TPanelId;
  /** 中央主面板 ID（flex 或 stacked 上方区域） */
  primaryPanelId: TPanelId;
  panelDefinitions: Record<TPanelId, WorkbenchPanelDefinition>;
  presets: Record<TPreset, WorkbenchPresetDefinition<TPanelId>>;
  features: WorkbenchLayoutFeatures;
}

/** localStorage 读取的原始（部分）布局配置，经 normalizeLayoutConfig 规范化 */
export type RawWorkbenchLayoutConfig<TPanelId extends string = string> = Partial<
  WorkbenchLayoutConfig<TPanelId>
> & {
  sizes?: Partial<WorkbenchLayoutSizes>;
};
