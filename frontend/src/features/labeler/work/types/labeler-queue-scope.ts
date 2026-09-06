export interface LabelerQueueScopeItem {
  taskId: number;
  taskName: string;
  sceneCode?: string | null;
  openCount?: number;
  totalCount?: number;
}

export interface LabelerQueueScope {
  items: LabelerQueueScopeItem[];
}

export function formatLabelerQueueScopeLabel(scope: LabelerQueueScope): string {
  if (scope.items.length === 0) {
    return "未选择任务";
  }
  if (scope.items.length === 1) {
    const item = scope.items[0];
    return item.taskName || `任务 ${item.taskId}`;
  }
  const names = scope.items
    .slice(0, 2)
    .map((item) => item.taskName || `任务 ${item.taskId}`)
    .join("、");
  if (scope.items.length > 2) {
    return `${names} 等 ${scope.items.length} 个任务`;
  }
  return names;
}

export function labelerQueueScopeTaskIds(scope: LabelerQueueScope | null | undefined): Set<number> {
  return new Set((scope?.items ?? []).map((item) => item.taskId));
}
