import type { AuditPoolGroupBy, ManualReviewRow } from "../types";

export interface AuditPoolQueueTreeNode {
  id: string;
  label: string;
  subtitle?: string;
  count: number;
  children: AuditPoolQueueTreeNode[];
  leaf?: ManualReviewRow;
}

const MOCK_TASKS = [
  { id: "201", name: "户外商品标题清洗" },
  { id: "202", name: "3C 配件属性补全" },
  { id: "203", name: "母婴用品描述校对" },
] as const;

export function filterAuditPoolRows(rows: ManualReviewRow[], keyword: string): ManualReviewRow[] {
  const q = keyword.trim().toLowerCase();
  if (!q) {
    return rows;
  }
  return rows.filter((row) => {
    const haystack = [
      row.taskName,
      row.taskId,
      row.labeler,
      row.title,
      row.submissionCode,
      String(row.itemSeqNo),
      row.id,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

function sortNodes(nodes: AuditPoolQueueTreeNode[]): AuditPoolQueueTreeNode[] {
  return [...nodes].sort((left, right) => left.label.localeCompare(right.label, "zh-CN"));
}

function countLeaves(node: AuditPoolQueueTreeNode): number {
  if (node.leaf) {
    return 1;
  }
  return node.children.reduce((sum, child) => sum + countLeaves(child), 0);
}

function finalizeNode(
  id: string,
  label: string,
  subtitle: string | undefined,
  children: AuditPoolQueueTreeNode[],
  leaf?: ManualReviewRow,
): AuditPoolQueueTreeNode {
  const node: AuditPoolQueueTreeNode = { id, label, subtitle, count: 0, children, leaf };
  node.count = countLeaves(node);
  return node;
}

function buildTaskLabelerTree(rows: ManualReviewRow[]): AuditPoolQueueTreeNode[] {
  const taskMap = new Map<string, Map<string, ManualReviewRow[]>>();
  for (const row of rows) {
    const labelerMap = taskMap.get(row.taskId) ?? new Map<string, ManualReviewRow[]>();
    const bucket = labelerMap.get(row.labelerId) ?? [];
    bucket.push(row);
    labelerMap.set(row.labelerId, bucket);
    taskMap.set(row.taskId, labelerMap);
  }

  const roots: AuditPoolQueueTreeNode[] = [];
  for (const [taskId, labelerMap] of taskMap) {
    const sample = rows.find((row) => row.taskId === taskId);
    const labelerNodes: AuditPoolQueueTreeNode[] = [];
    for (const [labelerId, submissions] of labelerMap) {
      const labelerName = submissions[0]?.labeler ?? labelerId;
      const leaves = submissions
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
        .map((row) =>
          finalizeNode(`submission:${row.id}`, row.submissionCode, row.title, [], row),
        );
      labelerNodes.push(
        finalizeNode(`labeler:${taskId}:${labelerId}`, labelerName, `${submissions.length} 条提交`, leaves),
      );
    }
    roots.push(
      finalizeNode(
        `task:${taskId}`,
        sample?.taskName ?? `任务 ${taskId}`,
        `${labelerMap.size} 位标注员`,
        sortNodes(labelerNodes),
      ),
    );
  }
  return sortNodes(roots);
}

function buildLabelerTaskTree(rows: ManualReviewRow[]): AuditPoolQueueTreeNode[] {
  const labelerMap = new Map<string, Map<string, ManualReviewRow[]>>();
  for (const row of rows) {
    const taskMap = labelerMap.get(row.labelerId) ?? new Map<string, ManualReviewRow[]>();
    const bucket = taskMap.get(row.taskId) ?? [];
    bucket.push(row);
    taskMap.set(row.taskId, bucket);
    labelerMap.set(row.labelerId, taskMap);
  }

  const roots: AuditPoolQueueTreeNode[] = [];
  for (const [labelerId, taskMap] of labelerMap) {
    const sample = rows.find((row) => row.labelerId === labelerId);
    const taskNodes: AuditPoolQueueTreeNode[] = [];
    for (const [taskId, submissions] of taskMap) {
      const leaves = submissions
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
        .map((row) =>
          finalizeNode(`submission:${row.id}`, row.submissionCode, row.title, [], row),
        );
      taskNodes.push(
        finalizeNode(
          `task:${labelerId}:${taskId}`,
          submissions[0]?.taskName ?? `任务 ${taskId}`,
          `${submissions.length} 条提交`,
          leaves,
        ),
      );
    }
    roots.push(
      finalizeNode(
        `labeler:${labelerId}`,
        sample?.labeler ?? `标注员 ${labelerId}`,
        `${taskMap.size} 个任务`,
        sortNodes(taskNodes),
      ),
    );
  }
  return sortNodes(roots);
}

function buildItemTree(rows: ManualReviewRow[]): AuditPoolQueueTreeNode[] {
  const itemMap = new Map<string, ManualReviewRow[]>();
  for (const row of rows) {
    const key = row.itemId;
    const bucket = itemMap.get(key) ?? [];
    bucket.push(row);
    itemMap.set(key, bucket);
  }

  const roots: AuditPoolQueueTreeNode[] = [];
  for (const [itemId, submissions] of itemMap) {
    const sample = submissions[0];
    const leaves = submissions
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      .map((row) =>
        finalizeNode(`submission:${row.id}`, row.submissionCode, `${row.labeler} · ${row.taskName}`, [], row),
      );
    roots.push(
      finalizeNode(
        `item:${itemId}`,
        `第 ${sample?.itemSeqNo ?? "—"} 题 · ${sample?.title ?? itemId}`,
        sample?.taskName,
        leaves,
      ),
    );
  }
  return sortNodes(roots);
}

export function buildAuditPoolQueueTree(
  rows: ManualReviewRow[],
  groupBy: AuditPoolGroupBy,
): AuditPoolQueueTreeNode[] {
  if (rows.length === 0) {
    return [];
  }
  switch (groupBy) {
    case "labeler":
      return buildLabelerTaskTree(rows);
    case "item":
      return buildItemTree(rows);
    case "task":
    default:
      return buildTaskLabelerTree(rows);
  }
}

export function collectAuditPoolExpandableIds(
  nodes: AuditPoolQueueTreeNode[],
  currentId: string,
  expanded = new Set<string>(),
): boolean {
  let found = false;
  for (const node of nodes) {
    if (node.leaf) {
      if (node.leaf.id === currentId) {
        found = true;
      }
      continue;
    }
    if (collectAuditPoolExpandableIds(node.children, currentId, expanded)) {
      expanded.add(node.id);
      found = true;
    }
  }
  return found;
}

export function listAuditPoolRootIds(nodes: AuditPoolQueueTreeNode[]): string[] {
  return nodes.map((node) => node.id);
}

export { MOCK_TASKS };
