import type { RemoteParamBinding } from "@/low-code/schema/types";
import { filterRemoteParamsForSource } from "@/low-code/utils/remote-source-params";

export type OptionSourceProfileKind =
  | "dict"
  | "searchable"
  | "collaborators"
  | "taskBound"
  | "resourceTypeBound"
  | "custom";

export interface OptionSourceProfile {
  kind: OptionSourceProfileKind;
  /** 配置面板说明 */
  description: string;
  /** 是否展示搜索参数名配置 */
  showSearchParam?: boolean;
  /** 是否展示 variant / treeApi */
  supportsTree?: boolean;
}

const SEARCHABLE_SOURCES = new Set([
  "tasks",
  "users",
  "roles",
  "menus",
  "rewardRules",
  "distributeStrategies",
  "dataScopeResourceTypes",
  "resourceTypes",
  "systemClients",
  "dictTypes",
]);

const SOURCE_LABELS: Record<string, string> = {
  collaborators: "协作用户",
  assignableTaskItems: "可分配题目",
  exportFields: "导出字段",
  tasks: "任务",
  users: "用户",
  dataScopeScopeTypes: "数据权限范围类型",
  scopeTypes: "数据权限范围类型",
  dataScopeResourceTypes: "数据权限资源类型",
  resourceTypes: "数据权限资源类型",
};

export function resolveOptionSourceProfile(source: string | undefined): OptionSourceProfile {
  if (!source) {
    return {
      kind: "custom",
      description: "选择数据源后配置请求参数。",
      showSearchParam: true,
    };
  }
  if (source.startsWith("dict:")) {
    return {
      kind: "dict",
      description: "字典数据源，选项来自字典项，无需额外请求参数。",
    };
  }
  if (source === "collaborators") {
    return {
      kind: "collaborators",
      description: "按协作者角色筛选当前用户可见的用户列表。",
      showSearchParam: true,
    };
  }
  if (source === "assignableTaskItems" || source === "exportFields") {
    return {
      kind: "taskBound",
      description: "需先绑定任务字段，选项会随任务取值变化。",
      supportsTree: source === "exportFields",
    };
  }
  if (source === "dataScopeScopeTypes" || source === "scopeTypes") {
    return {
      kind: "resourceTypeBound",
      description: "需先绑定资源类型字段，再加载对应的范围类型。",
    };
  }
  if (SEARCHABLE_SOURCES.has(source)) {
    return {
      kind: "searchable",
      description: "支持输入关键词远程搜索，无需声明级联参数。",
      showSearchParam: true,
    };
  }
  return {
    kind: "custom",
    description: "通过 params 声明 HTTP query 参数；searchParam 指定搜索词参数名（默认 keyword）。",
    showSearchParam: true,
    supportsTree: true,
  };
}

export function formatOptionSourceLabel(source: string | undefined, catalogLabel?: string): string {
  if (!source) {
    return "未配置数据源";
  }
  if (source.startsWith("dict:")) {
    const dictCode = source.slice("dict:".length);
    return catalogLabel ? `字典 · ${catalogLabel}` : `字典 · ${dictCode}`;
  }
  return catalogLabel ?? SOURCE_LABELS[source] ?? source;
}

export function readFieldBinding(
  params: Record<string, RemoteParamBinding> | undefined,
  paramName: string,
): string | undefined {
  const binding = params?.[paramName];
  if (!binding || typeof binding === "string") {
    return undefined;
  }
  return binding.from?.trim() || undefined;
}

export function writeFieldBinding(
  source: string,
  params: Record<string, RemoteParamBinding> | undefined,
  paramName: string,
  fieldPath: string | undefined,
): Record<string, RemoteParamBinding> | undefined {
  const next = { ...(filterRemoteParamsForSource(source, params) ?? {}) };
  if (!fieldPath?.trim()) {
    delete next[paramName];
  } else {
    next[paramName] = { from: fieldPath.trim() };
  }
  return filterRemoteParamsForSource(source, next);
}

export function writeCollaboratorRoleConfig(
  config: CollaboratorRoleConfig,
): Record<string, RemoteParamBinding> | undefined {
  if (config.mode === "static" && config.staticRole && COLLABORATOR_ROLES.has(config.staticRole)) {
    return filterRemoteParamsForSource("collaborators", { role: config.staticRole });
  }
  if (config.mode === "field" && config.fieldPath?.trim()) {
    return filterRemoteParamsForSource("collaborators", {
      role: { from: config.fieldPath.trim() },
    });
  }
  return undefined;
}

export type CollaboratorRoleMode = "none" | "static" | "field";

export interface CollaboratorRoleConfig {
  mode: CollaboratorRoleMode;
  staticRole?: string;
  fieldPath?: string;
}

const COLLABORATOR_ROLES = new Set(["LABELER", "REVIEWER", "OWNER"]);

export function readCollaboratorRoleConfig(
  params: Record<string, RemoteParamBinding> | undefined,
): CollaboratorRoleConfig {
  const binding = params?.role;
  if (!binding) {
    return { mode: "none" };
  }
  if (typeof binding === "string") {
    return COLLABORATOR_ROLES.has(binding)
      ? { mode: "static", staticRole: binding }
      : { mode: "none" };
  }
  if (binding.from?.trim()) {
    return { mode: "field", fieldPath: binding.from.trim() };
  }
  return { mode: "none" };
}

export function formatCollaboratorRoleSummary(
  params: Record<string, RemoteParamBinding> | undefined,
): string {
  const config = readCollaboratorRoleConfig(params);
  if (config.mode === "static" && config.staticRole) {
    return `角色 ${config.staticRole}`;
  }
  if (config.mode === "field" && config.fieldPath) {
    return `角色来自 ${config.fieldPath}`;
  }
  return "不限角色";
}

export function formatFieldBindingSummary(
  params: Record<string, RemoteParamBinding> | undefined,
  paramName: string,
  label: string,
): string | undefined {
  const fieldPath = readFieldBinding(params, paramName);
  return fieldPath ? `${label} ← ${fieldPath}` : undefined;
}
