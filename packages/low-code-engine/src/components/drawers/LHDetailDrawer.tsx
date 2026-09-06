import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import type { AuthenticatedUser } from "../../lib/types";
import type { ActionSchema, OptionItem, RemoteOptionQuery, ResourceMeta, TableColumnLinkMeta } from "../../schema/types";
import { LHDrawerLoading } from "./LHDrawerLoading";
import { LHDrawerShell, resolveResourceDrawerWidth } from "./LHDrawerShell";
import { LHDetailGridView } from "./LHDetailGridView";
import { LHDetailTableView } from "./LHDetailTableView";
import { LHDetailTabbedView } from "./LHDetailTabbedView";
import { LHDetailViewToggle } from "./LHDetailViewToggle";
import { useDetailViewMode } from "./use-detail-view-mode";
import { useResourceDictOptions } from "../../hooks/use-resource-dict-options";
import { hasPermission } from "../../utils/permissions";
import { evaluateConditions } from "../../utils/visibility";
import { isActionBlockedForRecord } from "../../utils/action-guards";
import { loadDetailFieldOptions } from "../../utils/detail-field-options";

interface DetailDrawerProps {
  resource: ResourceMeta;
  open: boolean;
  loading?: boolean;
  record: Record<string, unknown> | null;
  currentUser?: AuthenticatedUser | null;
  onAction?: (action: ActionSchema, record: Record<string, unknown>) => void;
  loadRemoteOptions?: (source: string, query?: string | RemoteOptionQuery) => Promise<OptionItem[]>;
  onOpenRelated?: (record: Record<string, unknown>, link: TableColumnLinkMeta) => void;
  onNavigate?: (href: string, openInNewTab?: boolean) => void;
  onClose: () => void;
}

export function LHDetailDrawer({
  resource,
  open,
  loading = false,
  record,
  currentUser = null,
  onAction,
  loadRemoteOptions,
  onOpenRelated,
  onNavigate,
  onClose,
}: DetailDrawerProps) {
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(record);
  const [fieldOptions, setFieldOptions] = useState<Record<string, OptionItem[]>>({});
  const [fieldOptionErrors, setFieldOptionErrors] = useState<Record<string, string>>({});
  const { viewMode, changeViewMode } = useDetailViewMode(open);
  const dictOptions = useResourceDictOptions(resource);

  useEffect(() => {
    if (open && record) {
      setSnapshot(record);
    }
  }, [open, record]);

  const displayRecord = record ?? snapshot;

  useEffect(() => {
    const recordForOptions = displayRecord;
    const loadOptions = loadRemoteOptions;
    if (!open || !recordForOptions || !loadOptions || !resource.detail) {
      setFieldOptions({});
      setFieldOptionErrors({});
      return;
    }
    const ensuredRecord = recordForOptions;
    const ensuredLoadOptions = loadOptions;
    let active = true;

    async function loadDetailOptions() {
      const result = await loadDetailFieldOptions({
        resource,
        record: ensuredRecord,
        currentUser,
        loadRemoteOptions: ensuredLoadOptions,
      });
      if (active) {
        setFieldOptions(result.fieldOptions);
        setFieldOptionErrors(result.fieldOptionErrors);
      }
    }

    void loadDetailOptions();
    return () => {
      active = false;
    };
  }, [currentUser, displayRecord, loadRemoteOptions, open, resource]);

  const detailActions = (resource.actions ?? []).filter((action) => {
    if (action.hiddenInList !== true) {
      return false;
    }
    if (!hasPermission(currentUser, action.permission)) {
      return false;
    }
    if (!displayRecord || !evaluateConditions(displayRecord, action.visibleWhen)) {
      return false;
    }
    return !isActionBlockedForRecord(resource.resource, action.key, displayRecord, currentUser, resource.idKey);
  });

  if (!resource.detail) {
    return null;
  }

  return (
    <LHDrawerShell
      open={open}
      onClose={onClose}
      width={resolveResourceDrawerWidth(resource)}
      title={`${resource.label}详情`}
      description="查看当前记录的完整信息"
      footer={(
        <div className="flex flex-wrap items-center gap-2">
          {detailActions.map((action) => (
            <Button
              key={action.key}
              type="button"
              variant="outline"
              className="lh-drawer-footer-button"
              onClick={() => {
                if (!displayRecord || !onAction) {
                  return;
                }
                onAction(action, displayRecord);
              }}
            >
              {action.label}
            </Button>
          ))}
          <Button type="button" variant="outline" className="lh-drawer-footer-button" onClick={onClose}>
            关闭面板
          </Button>
        </div>
      )}
    >
      {loading ? (
        <LHDrawerLoading message="正在加载详情..." />
      ) : !displayRecord ? (
        <LHDrawerLoading message="暂无详情数据" />
      ) : (
        <>
          <div className="lh-detail-toolbar">
            <div className="lh-drawer-callout lh-detail-toolbar-callout">
              当前详情为只读视图，用于快速核对字段、状态与关联信息。
            </div>
            <LHDetailViewToggle value={viewMode} onChange={changeViewMode} />
          </div>
          {resource.detail.layout === "tabs" ? (
            <LHDetailTabbedView
              key={String(displayRecord[resource.idKey] ?? "detail")}
              sections={resource.detail.sections}
              viewMode={viewMode}
              displayRecord={displayRecord}
              currentUser={currentUser}
              resource={resource}
              dictOptions={dictOptions}
              fieldOptions={fieldOptions}
              fieldOptionErrors={fieldOptionErrors}
              loadRemoteOptions={loadRemoteOptions}
              onOpenRelated={onOpenRelated}
              onNavigate={onNavigate}
            />
          ) : viewMode === "table" ? (
            <LHDetailTableView
              sections={resource.detail.sections}
              displayRecord={displayRecord}
              currentUser={currentUser}
              resource={resource}
              dictOptions={dictOptions}
              fieldOptions={fieldOptions}
              fieldOptionErrors={fieldOptionErrors}
              loadRemoteOptions={loadRemoteOptions}
              onOpenRelated={onOpenRelated}
              onNavigate={onNavigate}
            />
          ) : (
            <LHDetailGridView
              sections={resource.detail.sections}
              displayRecord={displayRecord}
              currentUser={currentUser}
              resource={resource}
              dictOptions={dictOptions}
              fieldOptions={fieldOptions}
              fieldOptionErrors={fieldOptionErrors}
              loadRemoteOptions={loadRemoteOptions}
              onOpenRelated={onOpenRelated}
              onNavigate={onNavigate}
            />
          )}
        </>
      )}
    </LHDrawerShell>
  );
}
