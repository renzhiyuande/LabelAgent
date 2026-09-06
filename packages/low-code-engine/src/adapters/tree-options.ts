import type { RemoteOptionMeta } from "../schema/types";

export interface TreeOptionNode {
  label: string;
  value: string | number;
  description?: string;
  children?: TreeOptionNode[];
}

export interface FlatTreeOption {
  label: string;
  value: string | number;
  depth: number;
}

type MenuTreeNode = {
  id: number;
  menuName: string;
  menuCode: string;
  path: string | null;
  children?: MenuTreeNode[];
};

export function mapMenuTreeNodes(nodes: MenuTreeNode[]): TreeOptionNode[] {
  return nodes.map((node) => ({
    label: node.menuName,
    value: node.id,
    description: node.path || node.menuCode,
    children: node.children?.length ? mapMenuTreeNodes(node.children) : undefined,
  }));
}

export function flattenTreeOptions(nodes: TreeOptionNode[], depth = 0): FlatTreeOption[] {
  return nodes.flatMap((node) => [
    { label: node.label, value: node.value, depth },
  ].concat(flattenTreeOptions(node.children ?? [], depth + 1)));
}

export function flattenLeafTreeOptions(nodes: TreeOptionNode[], depth = 0): FlatTreeOption[] {
  return nodes.flatMap((node) => {
    if (node.children && node.children.length > 0) {
      return flattenLeafTreeOptions(node.children, depth + 1);
    }
    return [{ label: node.label, value: node.value, depth }];
  });
}

export interface SelectableFlatTreeOption extends FlatTreeOption {
  /** 选中后展示文案（叶子节点含所属分组前缀） */
  displayLabel: string;
  disabled: boolean;
}

function isTreeGroupNode(node: TreeOptionNode): boolean {
  return Boolean(node.children?.length) || String(node.value).startsWith("tpl:");
}

/** 保留分组行（不可选）+ 叶子行（可选），叶子展示「模板 / 版本」。 */
export function flattenSelectableTreeOptions(
  nodes: TreeOptionNode[],
  depth = 0,
  parentLabel?: string,
): SelectableFlatTreeOption[] {
  return nodes.flatMap((node) => {
    const hasChildren = Boolean(node.children?.length);
    const isGroup = isTreeGroupNode(node);
    if (isGroup && hasChildren) {
      const groupRow: SelectableFlatTreeOption = {
        label: node.label,
        displayLabel: node.label,
        value: node.value,
        depth,
        disabled: true,
      };
      return [groupRow, ...flattenSelectableTreeOptions(node.children!, depth + 1, node.label)];
    }
    if (isGroup) {
      return [
        {
          label: node.label,
          displayLabel: node.label,
          value: node.value,
          depth,
          disabled: true,
        },
      ];
    }
    const displayLabel = parentLabel ? `${parentLabel} / ${node.label}` : node.label;
    return [
      {
        label: node.label,
        displayLabel,
        value: node.value,
        depth,
        disabled: false,
      },
    ];
  });
}

export function collectSubtreeLeafValues(node: TreeOptionNode): string[] {
  if (!node.children || node.children.length === 0) {
    return [String(node.value)];
  }
  return node.children.flatMap(collectSubtreeLeafValues);
}

export function mergeSelectedValues(current: string[], nextValues: string[], selected: boolean): string[] {
  if (selected) {
    return [...new Set([...current, ...nextValues])];
  }
  const remove = new Set(nextValues);
  return current.filter((value) => !remove.has(value));
}

export interface ApiTreeOptionNode {
  label: string;
  value: string | number;
  children?: ApiTreeOptionNode[];
}

function normalizeTreeOptionValue(value: string | number): string {
  const raw = String(value);
  if (raw.startsWith("tpl:")) {
    return raw;
  }
  const normalized = /^\d+$/.test(raw) ? raw : undefined;
  return normalized ?? raw;
}

export function mapApiTreeNodes(nodes: ApiTreeOptionNode[]): TreeOptionNode[] {
  return nodes.map((node) => ({
    label: node.label,
    value: normalizeTreeOptionValue(node.value),
    children: node.children?.length ? mapApiTreeNodes(node.children) : undefined,
  }));
}

export function filterTreeOptions(nodes: TreeOptionNode[], keyword: string): TreeOptionNode[] {
  const normalized = keyword.trim();
  if (!normalized) {
    return nodes;
  }

  const result: TreeOptionNode[] = [];
  for (const node of nodes) {
    const children = filterTreeOptions(node.children ?? [], normalized);
    const matched =
      node.label.includes(normalized) || String(node.description ?? "").includes(normalized);
    if (!matched && children.length === 0) {
      continue;
    }
    result.push({ ...node, children: children.length > 0 ? children : undefined });
  }
  return result;
}

export function resolveRemoteTreeApi(remote: RemoteOptionMeta): string {
  if (remote.treeApi) {
    return remote.treeApi;
  }
  return `/api/v1/admin/${remote.source}/tree`;
}
