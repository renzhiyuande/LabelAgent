import type { FormDynamicTableMeta } from "../schema/types";

const DEFAULT_PAGINATED_HEIGHT = 480;
const ROW_HEIGHT_ESTIMATE = 49;
const TABLE_CHROME_HEIGHT = 120;

export function resolveDynamicTableFieldLayout(meta: FormDynamicTableMeta): {
  height?: number;
  maxHeight?: number;
} {
  const paginated = meta.pagination !== false;
  const height =
    meta.height ??
    (paginated
      ? Math.max(DEFAULT_PAGINATED_HEIGHT, (meta.pageSize ?? 10) * ROW_HEIGHT_ESTIMATE + TABLE_CHROME_HEIGHT)
      : undefined);
  return {
    height,
    maxHeight: meta.maxHeight,
  };
}
