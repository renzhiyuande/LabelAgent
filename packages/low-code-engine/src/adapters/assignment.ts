import { request } from "./lowcode-utils";
import type { AssignmentActionMeta, AssignmentFieldMeta, OptionItem, RemoteOptionQuery, ResourceMeta } from "../schema/types";
import { applyPathParams } from "./path";

export interface AssignmentOption {
  id: number;
  label: string;
  description?: string;
  parentId?: number | null;
  resourceType?: string;
  children?: AssignmentOption[];
}

type MenuTreeNode = {
  id: number;
  menuName: string;
  menuCode: string;
  path: string | null;
  parentId: number;
  children: MenuTreeNode[];
};

export function normalizeSelectedIds(ids: number[]): number[] {
  return Array.from(new Set(ids.map((item) => Number(item)).filter((item) => Number.isFinite(item))));
}

export function filterMenuTree(options: AssignmentOption[], keyword: string): AssignmentOption[] {
  if (!keyword.trim()) {
    return options;
  }
  const result: AssignmentOption[] = [];
  for (const node of options) {
    const children = filterMenuTree(node.children ?? [], keyword);
    const matched = node.label.includes(keyword) || String(node.description ?? "").includes(keyword);
    if (!matched && children.length === 0) {
      continue;
    }
    result.push({ ...node, children });
  }
  return result;
}

export function mergeAssignmentOptions(
  candidates: AssignmentOption[],
  assigned: AssignmentOption[],
  variant: AssignmentFieldMeta["variant"],
): AssignmentOption[] {
  const base = dedupeOptions(candidates);
  if (assigned.length === 0 || variant === "tree") {
    return base;
  }
  const knownIds = new Set(flattenOptions(base).map((item) => item.id));
  const extras = assigned.filter((item) => !knownIds.has(item.id));
  return extras.length > 0 ? dedupeOptions([...base, ...extras]) : base;
}

export async function loadAssignmentCandidates(
  resource: ResourceMeta,
  config: AssignmentFieldMeta,
  keyword: string,
  loadRemoteOptions: (source: string, query?: string | RemoteOptionQuery) => Promise<OptionItem[]>,
): Promise<AssignmentOption[]> {
  if (config.candidatesSource) {
    const options = await loadRemoteOptions(config.candidatesSource, {
      keyword: keyword || undefined,
      role: config.candidatesRole,
    });
    return dedupeOptions(options.map((item) => toOption(Number(item.value), String(item.label))));
  }

  const candidatesApi = config.candidatesApi ?? "";
  if (!candidatesApi) {
    return [];
  }

  if (config.variant === "tree") {
    const tree = await request<MenuTreeNode[]>(candidatesApi);
    const mapped = dedupeOptions(tree.map(mapMenuNode));
    return keyword ? filterMenuTree(mapped, keyword) : mapped;
  }

  if (candidatesApi.includes("/permissions")) {
    const page = await request<{ list: Array<{ id: number; permissionCode: string; permissionName: string }> }>(
      `${candidatesApi}${keyword ? `${candidatesApi.includes("?") ? "&" : "?"}keyword=${encodeURIComponent(keyword)}` : ""}`,
    );
    return dedupeOptions(page.list.map((item) => toOption(item.id, item.permissionName, { description: item.permissionCode })));
  }

  if (candidatesApi.includes("/data-scopes")) {
    const page = await request<{ list: Array<{ id: number; policyCode: string; policyName: string; resourceType: string; scopeType: string }> }>(
      `${candidatesApi}${keyword ? `${candidatesApi.includes("?") ? "&" : "?"}keyword=${encodeURIComponent(keyword)}` : ""}`,
    );
    return dedupeOptions(page.list.map((item) => toOption(item.id, item.policyName, {
      description: `${item.policyCode} · ${item.resourceType} / ${item.scopeType}`,
      resourceType: item.resourceType,
    })));
  }

  const options = await request<OptionItem[]>(
    `${candidatesApi}${keyword ? `${candidatesApi.includes("?") ? "&" : "?"}keyword=${encodeURIComponent(keyword)}` : ""}`,
  );
  return dedupeOptions(options.map((item) => toOption(Number(item.value), String(item.label))));
}

export async function loadAssignmentAssigned(
  resource: ResourceMeta,
  recordId: string | number,
  config: AssignmentFieldMeta,
  assignedApi: string,
): Promise<AssignmentOption[]> {
  const path = applyPathParams(assignedApi, { id: recordId });
  const data = await request<unknown>(path);

  if (config.variant === "tree") {
    const list = asArray<{ id: number; menuCode: string; menuName: string; path: string | null }>(data);
    return list.map((item) => toOption(item.id, item.menuName, { description: item.path ?? item.menuCode }));
  }

  if (config.assignedPath) {
    const items = extractPath(data, config.assignedPath);
    return mapAssignedItems(items, config);
  }

  const list = asArray<Record<string, unknown>>(data);
  return mapAssignedItems(list, config);
}

export async function submitAssignmentAction(
  resource: ResourceMeta,
  submitApi: string,
  payloadKey: string,
  recordId: string | number,
  selectedIds: number[],
): Promise<void> {
  await request<void>(applyPathParams(submitApi, { id: recordId }), {
    method: "POST",
    body: JSON.stringify({
      [payloadKey]: normalizeSelectedIds(selectedIds),
    }),
  });
}

export interface BulkAssignmentResult {
  successCount: number;
  failureCount: number;
  failures: Array<{ userId: number; message: string }>;
}

export async function submitBulkAssignmentAction(
  bulkApi: string,
  userIds: Array<string | number>,
  payloadKey: string,
  selectedIds: number[],
): Promise<BulkAssignmentResult> {
  const normalizedUserIds = userIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
  const normalizedRoleIds = normalizeSelectedIds(selectedIds);
  if (normalizedUserIds.length === 0) {
    throw new Error("缺少可分配的用户");
  }
  if (normalizedRoleIds.length === 0) {
    throw new Error("请至少选择一个角色");
  }
  return request<BulkAssignmentResult>(bulkApi, {
    method: "POST",
    body: JSON.stringify({
      userIds: normalizedUserIds,
      [payloadKey]: normalizedRoleIds,
    }),
  });
}

export function buildAssignmentFieldConfig(actionAssignment: AssignmentActionMeta): AssignmentFieldMeta {
  return {
    candidatesApi: actionAssignment.candidatesApi,
    candidatesSource: actionAssignment.candidatesSource,
    candidatesRole: actionAssignment.candidatesRole,
    candidatesRoleFrom: actionAssignment.candidatesRoleFrom,
    assignedApi: actionAssignment.assignedApi,
    assignedPath: actionAssignment.assignedPath,
    variant: actionAssignment.variant,
    resourceTypeFilter: actionAssignment.resourceTypeFilter,
    searchPlaceholder: actionAssignment.searchPlaceholder,
  };
}

function mapAssignedItems(items: Record<string, unknown>[], config: AssignmentFieldMeta): AssignmentOption[] {
  return items
    .map((item) => {
      const id = Number(item.id);
      if (!Number.isFinite(id)) {
        return null;
      }
      if (config.assignedPath === "roles" || item.roleName != null) {
        return toOption(id, String(item.roleName ?? item.roleCode ?? id), {
          description: item.roleCode ? String(item.roleCode) : undefined,
        });
      }
      if (item.permissionName != null) {
        return toOption(id, String(item.permissionName), { description: String(item.permissionCode ?? "") });
      }
      if (item.menuName != null) {
        return toOption(id, String(item.menuName), { description: String(item.path ?? item.menuCode ?? "") });
      }
      if (item.policyName != null) {
        return toOption(id, String(item.policyName), {
          description: `${item.policyCode} · ${item.resourceType} / ${item.scopeType}`,
          resourceType: item.resourceType ? String(item.resourceType) : undefined,
        });
      }
      return toOption(id, String(item.label ?? item.name ?? id));
    })
    .filter((item): item is AssignmentOption => item !== null);
}

function extractPath(data: unknown, path: string): Record<string, unknown>[] {
  if (!data || typeof data !== "object") {
    return [];
  }
  const value = (data as Record<string, unknown>)[path];
  return asArray<Record<string, unknown>>(value);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function toOption(id: number, label: string, extra: Omit<AssignmentOption, "id" | "label"> = {}): AssignmentOption {
  return { id: Number(id), label, ...extra };
}

function mapMenuNode(node: MenuTreeNode): AssignmentOption {
  return toOption(node.id, node.menuName, {
    description: node.path || node.menuCode,
    parentId: node.parentId,
    children: (node.children ?? []).map(mapMenuNode),
  });
}

function dedupeOptions(options: AssignmentOption[]): AssignmentOption[] {
  const seen = new Set<number>();
  const result: AssignmentOption[] = [];
  for (const item of options) {
    const id = Number(item.id);
    if (!Number.isFinite(id) || seen.has(id)) {
      continue;
    }
    seen.add(id);
    result.push({
      ...item,
      id,
      children: item.children ? dedupeOptions(item.children) : undefined,
    });
  }
  return result;
}

function flattenOptions(options: AssignmentOption[]): AssignmentOption[] {
  return options.flatMap((item) => [item, ...flattenOptions(item.children ?? [])]);
}
