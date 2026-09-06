import { normalizeSnowflakeIdList, requireSnowflakeId } from "../lib/id-utils";

/** 批量指派提交体：雪花 ID 一律为 string，避免 Number 精度丢失 */
export function prepareBatchAssignValues(values: Record<string, unknown>) {
  const itemIds = normalizeSnowflakeIdList(
    Array.isArray(values.selectedItemIds) ? values.selectedItemIds : [],
  );
  if (itemIds.length === 0) {
    throw new Error("请至少选择一道未指派题目");
  }
  return {
    taskId: requireSnowflakeId(values.taskId, "taskId"),
    itemIds,
    labelerId: requireSnowflakeId(values.labelerId, "labelerId"),
    deadlineAt: values.deadlineAt ?? null,
  };
}
