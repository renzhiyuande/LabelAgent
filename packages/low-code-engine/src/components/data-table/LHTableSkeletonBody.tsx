import type { TableColumnSchema } from "../../schema/types";
import { resolveTableColumnCellClassName, resolveTableColumnStyle } from "../../utils/table-column-style";

interface LHTableSkeletonBodyProps {
  columns: TableColumnSchema[];
  rowCount: number;
  selectable?: boolean;
  hideActionsColumn?: boolean;
}

export function LHTableSkeletonBody({
  columns,
  rowCount,
  selectable = false,
  hideActionsColumn = false,
}: LHTableSkeletonBodyProps) {
  return (
    <>
      {Array.from({ length: rowCount }, (_, rowIndex) => (
        <tr key={`skeleton-${rowIndex}`} className="lh-table-skeleton-row" aria-hidden>
          {selectable ? (
            <td className="lh-cell-check">
              <span className="lh-skeleton lh-skeleton--checkbox" />
            </td>
          ) : null}
          {columns.map((column) => (
            <td
              key={column.key}
              className={resolveTableColumnCellClassName(column)}
              style={resolveTableColumnStyle(column)}
            >
              <span className={`lh-skeleton lh-skeleton--cell ${column.type === "status" ? "is-short" : ""}`} />
            </td>
          ))}
          {!hideActionsColumn ? (
            <td className="lh-table-actions-column">
              <span className="lh-skeleton lh-skeleton--action" />
            </td>
          ) : null}
        </tr>
      ))}
    </>
  );
}
