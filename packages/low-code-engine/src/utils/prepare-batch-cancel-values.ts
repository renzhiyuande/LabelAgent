import { normalizeSnowflakeIdList, requireSnowflakeId } from "../lib/id-utils";

export function prepareBatchCancelPayload(
  taskId: string | number,
  itemIds: Array<string | number>,
  reason?: string | null,
) {
  const normalizedItemIds = normalizeSnowflakeIdList(itemIds);
  if (normalizedItemIds.length === 0) {
    throw new Error("未选择可取消分配的题目");
  }
  return {
    taskId: requireSnowflakeId(taskId, "taskId"),
    itemIds: normalizedItemIds,
    reason: reason ?? null,
  };
}
