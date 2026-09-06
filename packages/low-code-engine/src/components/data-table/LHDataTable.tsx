import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { LHPagination } from "../pagination/LHPagination";
import { LHTableSkeletonBody } from "./LHTableSkeletonBody";
import { useDelayedTrue } from "../../hooks/use-delayed-true";
import { useTableDisplayRecords } from "../../hooks/use-table-display-records";
import { formatFieldValue } from "../../utils/formatters";
import { LHUserReference } from "../user/LHUserReference";
import { resolveUserRefFromRecord } from "../../utils/resolve-user-ref";
import { LHTablePayloadPreviewCell } from "./LHTablePayloadPreviewCell";
import { LHTableEllipsisCell } from "./LHTableEllipsisCell";
import { evaluateConditions } from "../../utils/visibility";
import { hasPermission } from "../../utils/permissions";
import { isActionBlockedForRecord } from "../../utils/action-guards";
import { LHTableSwitchCell } from "./LHTableSwitchCell";
import { LHTableImageCell, isImageColumn } from "./LHTableImageCell";
import type { ActionSchema, OptionItem, ResourceMeta, TableColumnSchema } from "../../schema/types";
import type { ResourceRecord } from "../../types";
import type { AuthenticatedUser } from "../../lib/types";
import type { MouseEvent, ReactNode } from "react";
import { findDictOption, resolveDictLabel, resolveDictTagClassName } from "../../utils/dict-display";
import {
  isTableColumnClamp,
  resolveTableColumnCellClassName,
  resolveTableColumnEllipsisLines,
  resolveTableColumnStyle,
} from "../../utils/table-column-style";

export interface TableCellActionEvent<TRecord extends ResourceRecord> {
  action: string;
  column: TableColumnSchema;
  record: TRecord;
}

interface DataTableProps<TRecord extends ResourceRecord> {
  resource: ResourceMeta;
  currentUser?: AuthenticatedUser | null;
  dictOptions?: Record<string, OptionItem[]>;
  records: TRecord[];
  total?: number;
  page?: number;
  pageSize?: number;
  loading?: boolean;
  refreshing?: boolean;
  selectedRowKeys?: Array<string | number>;
  sort?: Array<{ field: string; order: "asc" | "desc" }>;
  onEdit: (record: TRecord) => void;
  onDetail: (record: TRecord) => void;
  onAction: (action: ActionSchema, record: TRecord) => void;
  onSwitchAction?: (action: ActionSchema, record: ResourceRecord, column: TableColumnSchema) => Promise<void>;
  onCellAction?: (event: TableCellActionEvent<TRecord>) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSortChange?: (field: string) => void;
  onSelectionChange?: (selectedRowKeys: Array<string | number>) => void;
  bulkToolbar?: ReactNode;
  onPickerRowSelect?: (record: TRecord) => void;
  hideActionsColumn?: boolean;
  isRowSelectable?: (record: TRecord) => boolean;
}

function selectionKey(value: string | number): string {
  return String(value);
}

function mergeSelectionKeys(
  current: Array<string | number>,
  nextKeys: Array<string | number>,
): Array<string | number> {
  const seen = new Set(current.map(selectionKey));
  const merged = [...current];
  for (const key of nextKeys) {
    const normalized = selectionKey(key);
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    merged.push(key);
  }
  return merged;
}

function removeSelectionKeys(
  current: Array<string | number>,
  removeKeys: Array<string | number>,
): Array<string | number> {
  const removeSet = new Set(removeKeys.map(selectionKey));
  return current.filter((key) => !removeSet.has(selectionKey(key)));
}

function tagTone(value: unknown): string {
  if (value === "ACTIVE") {
    return "success";
  }
  if (value === "DISABLED") {
    return "muted";
  }
  return "neutral";
}

function resolveStatusCell(
  column: TableColumnSchema,
  rawValue: unknown,
  dictOptions: Record<string, OptionItem[]>,
): ReactNode {
  if (column.dict) {
    const options = dictOptions[column.dict] ?? [];
    const matched = findDictOption(options, rawValue);
    return (
      <span className={resolveDictTagClassName(matched)}>
        {resolveDictLabel(matched, rawValue)}
      </span>
    );
  }
  if (column.enum?.length) {
    const matched = column.enum.find((item) => String(item.value) === String(rawValue ?? ""));
    if (matched) {
      return <span className={`lh-tag ${matched.tone ?? "neutral"}`}>{matched.label}</span>;
    }
  }
  return <span className={`lh-tag ${tagTone(rawValue)}`}>{String(rawValue ?? "-")}</span>;
}

export function LHDataTable<TRecord extends ResourceRecord>({
  resource,
  currentUser = null,
  dictOptions = {},
  records,
  total = records.length,
  page = 1,
  pageSize = 10,
  loading = false,
  refreshing = false,
  selectedRowKeys = [],
  sort = [],
  onEdit,
  onDetail,
  onAction,
  onSwitchAction,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onSelectionChange,
  bulkToolbar,
  onPickerRowSelect,
  onCellAction,
  hideActionsColumn: hideActionsColumnOverride,
  isRowSelectable,
}: DataTableProps<TRecord>) {
  const table = resource.table!;
  const picker = table.picker;
  const pickerEnabled = Boolean(picker?.enabled);
  const pickerMultiple = picker?.selectionMode === "multiple";
  const pickerRowClick = picker?.rowClickSelect !== false;
  const hideActionsColumn =
    hideActionsColumnOverride ?? (pickerEnabled && picker?.hideActionsColumn !== false);
  const showSelectionColumn = Boolean(table.selectable) || (pickerEnabled && pickerMultiple);
  const columns = table.columns.filter(
    (column) => column.visible !== false && hasPermission(currentUser, column.permission),
  );
  const actions = resource.actions ?? [];
  const canDetail = hasPermission(currentUser, resource.permissions?.page) &&
    resource.capabilities?.detail !== false &&
    Boolean(resource.detail);
  const canEdit = hasPermission(currentUser, resource.permissions?.page) &&
    resource.capabilities?.edit !== false &&
    resource.form.sections.length > 0;
  const activeSort = sort[0];
  const { displayRecords, phase, settlingEmpty, revealing, showSkeleton } = useTableDisplayRecords(
    records,
    refreshing,
    loading,
  );

  function rowSelectionEnabled(record: TRecord) {
    return isRowSelectable ? isRowSelectable(record) : true;
  }

  const selectableDisplayRecords = displayRecords.filter((record) => rowSelectionEnabled(record));
  const pageRowKeys = selectableDisplayRecords.map(
    (record) => record[resource.idKey] as string | number,
  );
  const selectedOnPageCount = pageRowKeys.filter((key) =>
    selectedRowKeys.some((item) => selectionKey(item) === selectionKey(key)),
  ).length;
  const allSelected =
    selectableDisplayRecords.length > 0 && selectedOnPageCount === selectableDisplayRecords.length;
  const someSelectedOnPage = selectedOnPageCount > 0 && !allSelected;
  const headerCheckboxChecked: boolean | "indeterminate" = allSelected
    ? true
    : someSelectedOnPage
      ? "indeterminate"
      : false;
  const showRefreshIndicator = useDelayedTrue(refreshing && phase === "idle", 320);
  const skeletonRowCount = Math.min(Math.max(pageSize, 5), 10);

  function renderSortIndicator(columnKey: string) {
    if (activeSort?.field !== columnKey) {
      return "↕";
    }
    return activeSort.order === "asc" ? "↑" : "↓";
  }

  function isSwitchColumn(column: TableColumnSchema) {
    return column.type === "switch" || column.slot === "switch";
  }

  const inlineActionKeys = new Set([
    ...(table.rowActionKeys ?? []),
    ...(table.rowActions?.map((action) => action.key) ?? []),
  ]);

  function isVisibleRowAction(action: ActionSchema, record: TRecord): boolean {
    return (
      action.key !== "create" &&
      action.hiddenInList !== true &&
      action.key !== "enable" &&
      action.key !== "disable" &&
      hasPermission(currentUser, action.permission) &&
      evaluateConditions(record as Record<string, unknown>, action.visibleWhen) &&
      !isActionBlockedForRecord(
        resource.resource,
        action.key,
        record as Record<string, unknown>,
        currentUser,
        resource.idKey,
      )
    );
  }

  function resolveInlineActions(record: TRecord): ActionSchema[] {
    const configured = table.rowActions ?? [];
    const fromResource = inlineActionKeys.size
      ? actions.filter((action) => inlineActionKeys.has(action.key))
      : [];
    const merged = [...configured, ...fromResource].filter(
      (action, index, list) => list.findIndex((item) => item.key === action.key) === index,
    );
    return merged.filter((action) => isVisibleRowAction(action, record));
  }

  function resolveOverflowActions(record: TRecord): ActionSchema[] {
    return actions.filter(
      (action) =>
        action.kind !== "drawer" &&
        !inlineActionKeys.has(action.key) &&
        isVisibleRowAction(action, record),
    );
  }

  function handleLinkCellClick(
    column: TableColumnSchema,
    record: TRecord,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.stopPropagation();
    const action = column.link?.action ?? "detail";
    if (onCellAction) {
      onCellAction({ action, column, record });
      return;
    }
    if (action === "detail") {
      onDetail(record);
    }
  }

  function renderCell(column: TableColumnSchema, record: TRecord) {
    if (!evaluateConditions(record as Record<string, unknown>, column.visibleWhen)) {
      return "-";
    }
    const rawValue = record[column.key];
    if (column.type === "link") {
      const displayValue =
        column.link?.labelField != null
          ? record[column.link.labelField]
          : rawValue;
      const linkLabel = formatFieldValue(
        { type: column.type, formatter: column.link?.formatter ?? column.formatter },
        displayValue,
      );
      return (
        <Button
          type="button"
          variant="ghost"
          className="h-auto max-w-full px-0 text-primary hover:bg-transparent hover:underline"
          onClick={(event) => handleLinkCellClick(column, record, event)}
        >
          {isTableColumnClamp(column) ? (
            <span className="lh-table-cell-truncate">{linkLabel}</span>
          ) : (
            linkLabel
          )}
        </Button>
      );
    }
    if (isSwitchColumn(column) && onSwitchAction) {
      return (
        <LHTableSwitchCell
          column={column}
          record={record}
          resource={resource}
          actions={actions}
          currentUser={currentUser}
          onSwitchAction={onSwitchAction}
        />
      );
    }
    if (isImageColumn(column)) {
      return <LHTableImageCell column={column} record={record} />;
    }
    if (column.type === "user") {
      const userRef = resolveUserRefFromRecord(record, column.key, column.user);
      return (
        <LHUserReference
          userId={userRef.userId}
          displayName={userRef.displayName}
          role={userRef.role}
        />
      );
    }
    if (column.type === "status") {
      return resolveStatusCell(column, rawValue, dictOptions);
    }
    if (column.dict) {
      const matched = findDictOption(dictOptions[column.dict], rawValue);
      return resolveDictLabel(matched, rawValue);
    }
    if (column.formatter === "payloadPreview") {
      return <LHTablePayloadPreviewCell value={rawValue} />;
    }
    if (column.formatter === "ellipsis" || isTableColumnClamp(column)) {
      const text = formatFieldValue(column, rawValue);
      return <LHTableEllipsisCell text={text} lines={resolveTableColumnEllipsisLines(column)} />;
    }
    return formatFieldValue(column, rawValue);
  }

  function isRowSelected(record: TRecord) {
    const rowKey = selectionKey(record[resource.idKey] as string | number);
    return selectedRowKeys.some((item) => selectionKey(item) === rowKey);
  }

  function toggleRowSelection(record: TRecord) {
    if (!onSelectionChange || !rowSelectionEnabled(record)) {
      return;
    }
    const rowKey = record[resource.idKey] as string | number;
    if (isRowSelected(record)) {
      onSelectionChange(removeSelectionKeys(selectedRowKeys, [rowKey]));
      return;
    }
    onSelectionChange(mergeSelectionKeys(selectedRowKeys, [rowKey]));
  }

  function togglePageSelection(checked: boolean) {
    if (!onSelectionChange) {
      return;
    }
    if (checked) {
      onSelectionChange(mergeSelectionKeys(selectedRowKeys, pageRowKeys));
      return;
    }
    onSelectionChange(removeSelectionKeys(selectedRowKeys, pageRowKeys));
  }

  function handlePickerRowClick(record: TRecord, event: MouseEvent<HTMLTableRowElement>) {
    if (!pickerEnabled || !pickerRowClick) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select, [role="checkbox"], [role="menuitem"], label')) {
      return;
    }
    if (pickerMultiple) {
      toggleRowSelection(record);
      return;
    }
    onPickerRowSelect?.(record);
  }

  const showRowActions = !hideActionsColumn;

  return (
    <div className={`lh-table-wrap${showRefreshIndicator ? " is-refreshing" : ""}`}>
      {showRefreshIndicator ? <div className="lh-table-refresh-bar" aria-hidden /> : null}
      {bulkToolbar}
      <div className={`lh-table-scroll${settlingEmpty || revealing ? " is-transitioning" : ""}`}>
        <table className="lh-table">
          <thead>
            <tr>
              {showSelectionColumn ? (
                <th className="lh-cell-check">
                  <Checkbox
                    checked={headerCheckboxChecked}
                    onCheckedChange={(checked) => {
                      togglePageSelection(checked === true);
                    }}
                  />
                </th>
              ) : null}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={resolveTableColumnCellClassName(column)}
                  style={resolveTableColumnStyle(column)}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`lh-column-button ${column.sortable ? "is-sortable" : ""}`}
                    onClick={() => {
                      if (column.sortable && onSortChange) {
                        onSortChange(column.key);
                      }
                    }}
                  >
                    <span>{column.title}</span>
                    {column.sortable ? <span className="lh-sort-indicator">{renderSortIndicator(column.key)}</span> : null}
                  </Button>
                </th>
              ))}
              {showRowActions ? <th className="lh-table-actions-column">操作</th> : null}
            </tr>
          </thead>
          <tbody
            className={
              settlingEmpty ? "is-fading-out" : revealing ? "is-revealing" : undefined
            }
          >
            {displayRecords.length > 0 ? (
              displayRecords.map((record) => {
                const inlineActions = resolveInlineActions(record);
                const overflowActions = resolveOverflowActions(record);
                const hasRowActions = canDetail || canEdit || inlineActions.length > 0 || overflowActions.length > 0;
                return (
                  <tr
                    key={String(record[resource.idKey])}
                    className={[
                      pickerEnabled && pickerRowClick ? "lh-table-row-picker" : "",
                      pickerEnabled && isRowSelected(record) ? "is-selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined}
                    onClick={pickerEnabled && pickerRowClick ? (event) => handlePickerRowClick(record, event) : undefined}
                  >
                    {showSelectionColumn ? (
                      <td className="lh-cell-check">
                        <Checkbox
                          checked={isRowSelected(record)}
                          disabled={!rowSelectionEnabled(record)}
                          onCheckedChange={() => toggleRowSelection(record)}
                        />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={resolveTableColumnCellClassName(column)}
                        style={resolveTableColumnStyle(column)}
                      >
                        {renderCell(column, record)}
                      </td>
                    ))}
                    {showRowActions ? (
                      <td className="lh-table-actions-column">
                        {hasRowActions ? (
                          <div className="lh-action-group">
                            {canDetail ? (
                              <Button type="button" variant="outline" size="sm" onClick={() => onDetail(record)}>
                                详情
                              </Button>
                            ) : null}
                            {canEdit ? (
                              <Button type="button" size="sm" onClick={() => onEdit(record)}>
                                编辑
                              </Button>
                            ) : null}
                            {inlineActions.map((action) => (
                              <Button
                                key={action.key}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onAction(action, record)}
                              >
                                {action.label}
                              </Button>
                            ))}
                            {overflowActions.length > 0 ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button type="button" variant="outline" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {overflowActions.map((action) => (
                                    <DropdownMenuItem key={action.key} onClick={() => onAction(action, record)}>
                                      {action.label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                );
              })
            ) : showSkeleton ? (
              <LHTableSkeletonBody
                columns={columns}
                rowCount={skeletonRowCount}
                selectable={showSelectionColumn}
                hideActionsColumn={hideActionsColumn}
              />
            ) : null}
          </tbody>
        </table>
      </div>
      {table.pagination ? (
        <LHPagination
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      ) : null}
    </div>
  );
}
