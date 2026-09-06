import type { CSSProperties } from "react";
import type { TableColumnSchema } from "../schema/types";

const TABLE_COLUMN_WIDTH_PRESETS: Record<string, string> = {
  xs: "72px",
  sm: "96px",
  md: "160px",
  lg: "200px",
  xl: "280px",
};

function resolveCssSize(value?: number | string): string | undefined {
  if (value == null) {
    return undefined;
  }
  if (typeof value === "number") {
    return `${value}px`;
  }
  return TABLE_COLUMN_WIDTH_PRESETS[value] ?? value;
}

export function resolveTableColumnStyle(column: TableColumnSchema): CSSProperties {
  const style: CSSProperties = {};
  const width = resolveCssSize(column.width);
  const minWidth = resolveCssSize(column.minWidth);
  const maxWidth = resolveCssSize(column.maxWidth);
  if (width) {
    style.width = width;
  }
  if (minWidth) {
    style.minWidth = minWidth;
  } else if (width) {
    style.minWidth = width;
  }
  if (maxWidth) {
    style.maxWidth = maxWidth;
  }
  if (column.align) {
    style.textAlign = column.align;
  }
  return style;
}

export function isTableColumnClamp(column: TableColumnSchema): boolean {
  return (
    column.formatter === "ellipsis" ||
    column.formatter === "payloadPreview" ||
    column.ellipsis === true ||
    column.ellipsis === 1 ||
    column.ellipsis === 2
  );
}

export function resolveTableColumnCellClassName(column: TableColumnSchema): string {
  return isTableColumnClamp(column) ? "lh-table-col lh-table-col--clamp" : "lh-table-col";
}

export function resolveTableColumnEllipsisLines(column: TableColumnSchema): 1 | 2 {
  if (column.ellipsis === 1 || column.formatter === "ellipsis") {
    return 1;
  }
  return 2;
}
