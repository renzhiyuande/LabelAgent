"use client";

import { useMemo } from "react";
import type { AuthenticatedUser } from "../../../lib/types";
import type { FormFieldSchema, ResourceMeta } from "../../../schema/types";
import { getResourceMeta } from "../../../schema/resource-registry";
import { LHDataTable } from "../../data-table/LHDataTable";
import { useDynamicTableList } from "../../../hooks/use-dynamic-table-list";
import { buildTableResourceFromField } from "../../../utils/build-table-resource-from-field";
import { getValueAtPath } from "../../../utils/object-path";
import { evaluateConditions } from "../../../utils/visibility";
import { resolveDynamicTableFieldLayout } from "../../../utils/resolve-dynamic-table-field-layout";
import { useResourceDictOptions } from "../../../hooks/use-resource-dict-options";
import type { ResourceFormContext } from "../../forms/use-resource-form-engine.core";
import type { ResourceRecord } from "../../../types";

interface DynamicTableFieldControlProps {
  field: FormFieldSchema;
  values: Record<string, unknown>;
  currentUser?: AuthenticatedUser | null;
  formContext?: ResourceFormContext;
  onChangeSelection: (keys: Array<string | number>) => void;
}

export function DynamicTableFieldControl({
  field,
  values,
  currentUser = null,
  formContext,
  onChangeSelection,
}: DynamicTableFieldControlProps) {
  const meta = field.dynamicTable;
  if (!meta) {
    return null;
  }

  const listResourceKey = meta.resourceKey ?? "";
  const listResource = getResourceMeta(listResourceKey);
  if (!listResource) {
    return <p className="text-sm text-muted-foreground">未找到资源 {listResourceKey}</p>;
  }

  const tableResource = useMemo(
    () => buildTableResourceFromField(field, listResource),
    [field, listResource],
  );
  const dictOptions = useResourceDictOptions(tableResource);

  const selectionPath = meta.selectionPath ?? "selectedItemIds";
  const selectedRowKeys = (getValueAtPath(values, selectionPath) as Array<string | number> | undefined) ?? [];

  const staticRecords =
    meta.dataSource === "static" && meta.dataPath
      ? ((getValueAtPath(values, meta.dataPath) as ResourceRecord[] | undefined) ?? [])
      : [];

  const listState = useDynamicTableList<ResourceRecord>(field, listResource, formContext, values);
  const records = meta.dataSource === "static" ? staticRecords : listState.records;
  const loading = meta.dataSource === "static" ? false : listState.loading;
  const refreshing = meta.dataSource === "static" ? false : listState.refreshing;

  const isRowSelectable = (record: ResourceRecord) => {
    if (!meta.rowSelectableWhen?.length) {
      return true;
    }
    return evaluateConditions(record as Record<string, unknown>, meta.rowSelectableWhen);
  };

  function handleCellAction(event: { action: string; record: ResourceRecord }) {
    formContext?.onTableAction?.({
      action: event.action,
      record: event.record,
      field,
    });
  }

  if (meta.dataSource !== "static" && !listState.scopeReady) {
    return <p className="text-sm text-muted-foreground">缺少列表范围参数，无法加载题目</p>;
  }

  const emptyTitle = meta.empty?.title ?? "暂无数据";
  const layout = resolveDynamicTableFieldLayout(meta);

  return (
    <div
      className="lh-dynamic-table-field"
      style={{
        ...(layout.height != null
          ? { height: layout.height, minHeight: layout.height }
          : {}),
        ...(layout.maxHeight != null ? { maxHeight: layout.maxHeight } : {}),
      }}
    >
      {!loading && records.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyTitle}</p>
      ) : (
        <LHDataTable
          resource={tableResource}
          currentUser={currentUser}
          dictOptions={dictOptions}
          records={records}
          total={meta.dataSource === "static" ? records.length : listState.total}
          page={listState.page}
          pageSize={listState.pageSize}
          loading={loading}
          refreshing={refreshing}
          selectedRowKeys={meta.selectable ? selectedRowKeys : []}
          hideActionsColumn={meta.hideActionsColumn ?? true}
          isRowSelectable={isRowSelectable}
          onEdit={() => undefined}
          onDetail={(record) => handleCellAction({ action: "detail", record })}
          onAction={() => undefined}
          onCellAction={(event) => handleCellAction(event)}
          onPageChange={listState.setPage}
          onPageSizeChange={listState.setPageSize}
          onSelectionChange={meta.selectable ? onChangeSelection : undefined}
        />
      )}
    </div>
  );
}
