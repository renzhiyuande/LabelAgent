import { useEffect, useMemo, useRef, useState } from "react";
import { useRemoteOptionsCache } from "../../hooks/use-remote-options-cache";
import { useResourceDictOptions } from "../../hooks/use-resource-dict-options";
import { useNavigate } from "react-router-dom";
import { appMessage } from "../../adapters/lowcode-utils";
import { Button } from "../../components/ui/button";
import {
  createRecord as engineCreateRecord,
  fetchDetail,
  fetchDetail as engineFetchDetail,
  fetchEngineList,
  fetchLegacyList,
  resolveHeaderActionApi,
  runHeaderRequestAction,
  runResourceAction,
} from "../../adapters/request";
import {
  applyPinnedListFilters,
  applyScopeToListQuery,
  filterResourceFilters,
  filterResourceFormFields,
} from "../../utils/list-scope";
import type { ActionSchema, DrawerWidth, FilterOperator, HeaderActionSchema, ResourceMeta, TableColumnSchema, WorkflowActionMeta } from "../../schema/types";
import { useResourceCan } from "../../hooks/use-resource-can";
import { useResourceForm } from "../../hooks/use-resource-form";
import { useResourceList } from "../../hooks/use-resource-list";
import { useResourceMutations } from "../../hooks/use-resource-mutations";
import { useResourcePage } from "../../hooks/use-resource-page";
import { resolveResourceAction, runHeaderAction, runResourceLocalAction } from "../../actions/registry";
import { openPromptForm } from "../../utils/prompt-form-bridge";
import { resolveSidePanelListLoader } from "../../actions/side-panel-registry";
import { resolveWorkflowRenderer } from "../../actions/workflow-registry";
import { hasPermission } from "../../utils/permissions";
import { resolveResourceBulkActions } from "../../utils/resolve-resource-bulk-actions";
import { isActionBlockedForRecord } from "../../utils/action-guards";
import { setValueAtPath } from "../../utils/object-path";
import { collectSectionDefaults, mergeFormValues } from "../../utils/form-values";
import { LHDataTable } from "../data-table/LHDataTable";
import { LHTableBulkActionBar } from "../data-table/LHTableBulkActionBar";
import { LHTablePickerBar } from "../data-table/LHTablePickerBar";
import { LHAssignmentDrawer } from "../drawers/LHAssignmentDrawer";
import { LHBulkAssignmentDrawer } from "../drawers/LHBulkAssignmentDrawer";
import { LHFormDrawer } from "../drawers/LHFormDrawer";
import { LHDetailDrawer } from "../drawers/LHDetailDrawer";
import { useAuthStore } from "../../stores/auth-stub";
import { useNavigationStore } from "../../stores/navigation-stub";
import type { AuthenticatedUser } from "../../lib/types";
import { request } from "../../adapters/lowcode-utils";
import { LHConfirmDialog } from "../dialogs/LHConfirmDialog";
import { LHQueryBar } from "../query-bar/LHQueryBar";
import { useConfirmAction } from "../../hooks/use-confirm-action";
import { useDrawerDetailLoader } from "../../hooks/use-drawer-detail-loader";
import type { ResourcePageProps, ResourceRecord } from "../../types";
import { getResourceMeta } from "../../schema/resource-registry";
import { LHResourceSidePanel } from "./LHResourceSidePanel";
import { LHWorkflowDrawer } from "../drawers/LHWorkflowDrawer";
import { listApiRequiresPathParams } from "../../utils/resolve-legacy-action-api";
import { normalizeSnowflakeId } from "../../lib/id-utils";
import { isMessageErrorHandled } from "../../adapters/lowcode-utils";
interface SidePanelState {
  resourceKey: string;
  scopeField: string;
  scopeValue: string;
  width?: DrawerWidth;
  hideFilters: string[];
  pinnedListFilters?: Array<{ field: string; op?: FilterOperator; value: string }>;
  createDefaults?: Record<string, unknown>;
  createButtonLabel?: string;
  hideFormFields?: string[];
  title: string;
  description?: string;
  listLoaderCode?: string;
}

interface WorkflowState {
  actionKey: string;
  label: string;
  workflow: WorkflowActionMeta;
  record?: ResourceRecord | null;
  selectedRecords?: ResourceRecord[];
}

/** 从详情内 openRelated 离开时的返回帧（关闭 overlay 后恢复） */
interface DetailReturnFrame {
  resourceKey: string;
  record: ResourceRecord;
}

function applyRecordTemplate(
  template: string | undefined,
  record: ResourceRecord,
  fallback: string,
): string {
  if (!template) {
    return fallback;
  }
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(record[key] ?? ""));
}

function resolveRecordLinkHref(template: string, record: ResourceRecord): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = record[key];
    return encodeURIComponent(String(value ?? ""));
  });
}

function resolveCreateButtonLabel(resource: ResourceMeta, override?: string): string {
  return override ?? resource.form.createButtonLabel ?? `新建${resource.label}`;
}

export function LHResourcePage<TRecord extends ResourceRecord>({
  resource,
  title,
  pageSize = 10,
  reloadToken = 0,
  description,
  loadList,
  loadDetail,
  createRecord,
  updateRecord,
  runAction,
  loadRemoteOptions,
  scope,
  hideFilters = [],
  pinnedListFilters,
  createDefaults,
  createButtonLabel,
  hideFormFields = [],
  embedded = false,
  currentUser,
  actionHandlers,
  headerActionHandlers,
  pickerHandlers,
  renderInsights,
}: ResourcePageProps<TRecord>) {
  const navigate = useNavigate();
  const pageUser = currentUser ?? useAuthStore((item) => item.currentUser);
  const loadMenus = useNavigationStore((item) => item.loadMenus);
  const [assignmentState, setAssignmentState] = useState<{ action: ActionSchema; record: TRecord } | null>(null);
  const [bulkAssignmentState, setBulkAssignmentState] = useState<{ action: ActionSchema; records: TRecord[] } | null>(
    null,
  );
  const state = useResourcePage(resource, pageSize);
  const cachedLoadRemoteOptions = useRemoteOptionsCache(loadRemoteOptions);
  const dictOptions = useResourceDictOptions(resource);

  useEffect(() => {
    state.setSelectedRowKeys([]);
  }, [scope?.field, scope?.value, state.setSelectedRowKeys]);

  const scopedListQuery = useMemo(() => {
    let query = scope ? applyScopeToListQuery(state.listQuery, scope) : state.listQuery;
    return applyPinnedListFilters(query, pinnedListFilters);
  }, [pinnedListFilters, scope, state.listQuery]);
  const resolvedLoadList = useMemo(() => {
    if (!scope) {
      return loadList;
    }
    if (loadList) {
      return (query: typeof scopedListQuery) => loadList(applyScopeToListQuery(query, scope));
    }
    return undefined;
  }, [loadList, scope]);
  const listPathParams = useMemo(() => {
    if (!scope) {
      return undefined;
    }
    const scopeValue = normalizeSnowflakeId(scope.value);
    if (!scopeValue) {
      return undefined;
    }
    return { [scope.field]: scopeValue };
  }, [scope]);
  const { records, total, initialLoading, refreshing, refetch } = useResourceList<TRecord>(resource, scopedListQuery, {
    reloadToken: state.reloadToken + reloadToken,
    fetchList: resolvedLoadList,
    listPathParams,
  });
  const resolvedCreateRecord = useMemo(() => {
    if (!scope) {
      return createRecord;
    }
    const scopeValue = normalizeSnowflakeId(scope.value);
    const injectScope = (values: Record<string, unknown>) => {
      if (!scopeValue) {
        throw new Error("缺少有效的任务范围 ID，请关闭侧栏后重新打开");
      }
      return setValueAtPath(values, scope.field, scopeValue);
    };
    if (createRecord) {
      return (values: Record<string, unknown>) => createRecord(injectScope(values));
    }
    return (values: Record<string, unknown>) => engineCreateRecord<TRecord>(resource, injectScope(values));
  }, [createRecord, resource, scope]);
  const mutations = useResourceMutations<TRecord>(resource, {
    listQuery: scopedListQuery,
    createRecord: resolvedCreateRecord,
    updateRecord,
    runAction,
  });
  const uiResource = useMemo(() => {
    let next = resource;
    if (hideFilters.length > 0) {
      next = { ...next, filters: filterResourceFilters(next.filters, hideFilters) };
    }
    const hiddenFormKeys = [...hideFormFields];
    if (scope) {
      hiddenFormKeys.push(scope.field);
    }
    if (hiddenFormKeys.length > 0) {
      next = filterResourceFormFields(next, hiddenFormKeys);
    }
    return next;
  }, [hideFilters, hideFormFields, resource, scope]);
  const resolveLoadDetail = useMemo(() => {
    if (loadDetail) {
      return loadDetail;
    }
    return (id: string | number) => {
      const pathParams: Record<string, string | number> = {};
      if (scope) {
        pathParams[scope.field] = scope.value;
      }
      return engineFetchDetail<TRecord>(resource, id, pathParams);
    };
  }, [loadDetail, resource, scope]);
  const [detailRecord, setDetailRecord] = useState<TRecord | null>(null);
  const [sidePanelState, setSidePanelState] = useState<SidePanelState | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [sidePanelReturnDetailRecord, setSidePanelReturnDetailRecord] = useState<TRecord | null>(null);
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [drawerActionKey, setDrawerActionKey] = useState<string | null>(null);
  const [overlayDetailOpen, setOverlayDetailOpen] = useState(false);
  const [overlayDetailRecord, setOverlayDetailRecord] = useState<ResourceRecord | null>(null);
  const [overlayDetailResource, setOverlayDetailResource] = useState<ResourceMeta | null>(null);
  const detailReturnStackRef = useRef<DetailReturnFrame[]>([]);
  const confirmAction = useConfirmAction();
  const drawerLoader = useDrawerDetailLoader();
  const { data: canListAccess } = useResourceCan(resource, "list");
  const { data: canCreateAccess } = useResourceCan(resource, "create");
  const pageAccess = canListAccess?.can ?? false;
  const hasFormSections = resource.form.sections.length > 0;
  const canCreate = pageAccess &&
    (canCreateAccess?.can ?? false) &&
    resource.capabilities?.create !== false &&
    hasFormSections;
  const canEdit = pageAccess && resource.capabilities?.edit !== false && hasFormSections;
  const canCreateFormDrawer = pageAccess &&
    (canCreateAccess?.can ?? false) &&
    resource.capabilities?.create !== false &&
    hasFormSections;
  const canEditFormDrawer = pageAccess && resource.capabilities?.edit !== false && hasFormSections;
  const formDrawerOpen =
    state.drawerMode === "create"
      ? canCreateFormDrawer
      : state.drawerMode === "edit"
        ? canEditFormDrawer
        : false;
  const canDetail = pageAccess && resource.capabilities?.detail !== false && Boolean(resource.detail);

  const { values, setValues } = useResourceForm(
    resource,
    state.drawerMode === "edit" ? "edit" : "create",
    state.selectedRecord,
    state.drawerMode === "create" || state.drawerMode === "edit",
    scope,
  );

  async function refresh() {
    await refetch();
  }

  function openCreateDrawer() {
    const defaults = collectSectionDefaults(uiResource.form.sections);
    const initial = mergeFormValues(defaults, createDefaults ?? {});
    if (scope) {
      const scopeValue = normalizeSnowflakeId(scope.value);
      if (scopeValue) {
        setValueAtPath(initial, scope.field, scopeValue);
      }
    }
    state.setSelectedRecord(initial as TRecord);
    state.setDrawerMode("create");
    setDrawerActionKey(null);
  }

  function openBatchAssignDrawer(selectedItemIds: Array<string | number> = []) {
    const initial: Record<string, unknown> = {
      selectedItemIds,
      labelerId: "",
      deadlineAt: "",
    };
    if (scope) {
      initial[scope.field] = scope.value;
    }
    state.setSelectedRecord(initial as TRecord);
    state.setDrawerMode("create");
    setDrawerActionKey("batchAssign");
  }

  function pushDetailReturnFrame(frame: DetailReturnFrame) {
    detailReturnStackRef.current.push(frame);
  }

  function popDetailReturnFrame(): DetailReturnFrame | undefined {
    return detailReturnStackRef.current.pop();
  }

  function clearDetailReturnStack() {
    detailReturnStackRef.current = [];
  }

  function restoreDetailReturnFrame(frame: DetailReturnFrame) {
    const returnResource = getResourceMeta(frame.resourceKey);
    if (!returnResource) {
      return;
    }
    if (returnResource.resource === resource.resource) {
      state.setSelectedRecord(frame.record as TRecord);
      setDetailRecord(frame.record as TRecord);
      state.setDrawerMode("detail");
      return;
    }
    setOverlayDetailResource(returnResource);
    setOverlayDetailRecord(frame.record);
    setOverlayDetailOpen(true);
  }

  function closeOverlayDetailDrawer() {
    drawerLoader.cancel();
    setOverlayDetailOpen(false);
    setOverlayDetailRecord(null);
    setOverlayDetailResource(null);
  }

  function closeOverlayDetailAndRestore() {
    closeOverlayDetailDrawer();
    const frame = popDetailReturnFrame();
    if (frame) {
      restoreDetailReturnFrame(frame);
    }
  }

  function suspendCurrentDetailForRelatedNavigation() {
    if (overlayDetailOpen && overlayDetailResource && overlayDetailRecord) {
      pushDetailReturnFrame({
        resourceKey: overlayDetailResource.resource,
        record: overlayDetailRecord,
      });
      closeOverlayDetailDrawer();
      return;
    }
    if (state.drawerMode === "detail" && detailRecord) {
      pushDetailReturnFrame({
        resourceKey: resource.resource,
        record: detailRecord,
      });
      state.setDrawerMode(null);
      setDetailRecord(null);
    }
  }

  async function openOverlayDetail(record: TRecord, detailResource: ResourceMeta = resource) {
    if (!detailResource.detail) {
      return;
    }
    setOverlayDetailResource(detailResource);
    setOverlayDetailOpen(true);
    setOverlayDetailRecord(record);
    try {
      const id = record[detailResource.idKey] as string | number;
      const detail = await (detailResource === resource
        ? resolveLoadDetail(id)
        : fetchDetail<ResourceRecord>(detailResource, id));
      setOverlayDetailRecord(detail);
    } catch (error) {
      appMessage.errorFrom(error, "加载详情失败");
      setOverlayDetailOpen(false);
      setOverlayDetailRecord(null);
      setOverlayDetailResource(null);
    }
  }

  async function openRelatedDetail(
    row: TRecord,
    link: NonNullable<TableColumnSchema["link"]>,
  ) {
    const relatedKey = link.resourceKey;
    if (!relatedKey) {
      return;
    }
    const relatedResource = getResourceMeta(relatedKey);
    if (!relatedResource?.detail) {
      appMessage.info(`未找到资源 ${relatedKey} 的详情配置`);
      return;
    }
    const idField = link.idField ?? relatedResource.idKey;
    const relatedId = normalizeSnowflakeId(row[idField]) ?? row[idField];
    if (relatedId == null || relatedId === "") {
      appMessage.info("缺少关联 ID，无法打开详情");
      return;
    }
    suspendCurrentDetailForRelatedNavigation();
    const pathParams: Record<string, string | number> = {};
    if (link.pathParams) {
      for (const [param, field] of Object.entries(link.pathParams)) {
        const value = normalizeSnowflakeId(row[field]) ?? row[field];
        if (value != null && value !== "") {
          pathParams[param] = value as string | number;
        }
      }
    }
    setOverlayDetailResource(relatedResource);
    setOverlayDetailOpen(true);
    setOverlayDetailRecord(row);
    try {
      const detail = await fetchDetail<ResourceRecord>(relatedResource, relatedId as string | number, pathParams);
      setOverlayDetailRecord(detail);
    } catch (error) {
      appMessage.errorFrom(error, "加载详情失败");
      closeOverlayDetailDrawer();
      const frame = popDetailReturnFrame();
      if (frame) {
        restoreDetailReturnFrame(frame);
      }
    }
  }

  function handleDetailNavigate(href: string, openInNewTab?: boolean) {
    if (openInNewTab) {
      window.open(href, "_blank", "noreferrer");
      return;
    }
    navigate(href);
  }

  async function openDetail(record: TRecord) {
    if (!canDetail) {
      return;
    }
    clearDetailReturnStack();
    closeOverlayDetailDrawer();
    state.setSelectedRecord(record);
    setDetailRecord(null);
    state.setDrawerMode("detail");
    try {
      const detail = await drawerLoader.load(() => resolveLoadDetail(record[resource.idKey] as string | number));
      if (!detail) {
        return;
      }
      setDetailRecord(detail);
      state.setSelectedRecord(detail);
    } catch (error) {
      appMessage.errorFrom(error, "加载详情失败");
      state.setDrawerMode(null);
      state.setSelectedRecord(null);
      setDetailRecord(null);
    }
  }

  async function openEdit(record: TRecord) {
    if (!canEdit) {
      return;
    }
    state.setSelectedRecord(record);
    state.setDrawerMode("edit");
    try {
      const detail = await drawerLoader.load(() => resolveLoadDetail(record[resource.idKey] as string | number));
      if (!detail) {
        return;
      }
      state.setSelectedRecord(detail);
    } catch (error) {
      appMessage.errorFrom(error, "加载编辑数据失败");
      state.setDrawerMode(null);
      state.setSelectedRecord(null);
    }
  }

  async function submitForm() {
    if (drawerActionKey === "batchAssign") {
      const selectedItemIds = values.selectedItemIds;
      if (!Array.isArray(selectedItemIds) || selectedItemIds.length === 0) {
        appMessage.info("请至少选择一道题目");
        return;
      }
    }
    const payload =
      scope && state.drawerMode === "create"
        ? setValueAtPath(values, scope.field, scope.value)
        : values;
    const wasBatchAssign = drawerActionKey === "batchAssign";
    if (state.drawerMode === "edit" && state.selectedRecord) {
      await mutations.update(state.selectedRecord[resource.idKey] as string | number, payload);
    } else {
      await mutations.create(payload);
    }
    state.setDrawerMode(null);
    state.setSelectedRecord(null);
    setDrawerActionKey(null);
    if (wasBatchAssign) {
      state.setSelectedRowKeys([]);
    }
    await refresh();
    state.reload();
  }

  function openWorkflow(
    action: Pick<ActionSchema, "key" | "label" | "workflow">,
    record?: TRecord | null,
    selectedRecords?: TRecord[],
  ) {
    if (!action.workflow) {
      return;
    }
    const renderer = resolveWorkflowRenderer(action.workflow.rendererCode);
    if (!renderer) {
      appMessage.info(`未注册 workflow 渲染器：${action.workflow.rendererCode}`);
      return;
    }
    const recordForTemplate = (record ?? selectedRecords?.[0] ?? null) as ResourceRecord | null;
    const workflow = recordForTemplate
      ? {
          ...action.workflow,
          title: applyRecordTemplate(action.workflow.title, recordForTemplate, action.label),
          description: action.workflow.description
            ? applyRecordTemplate(action.workflow.description, recordForTemplate, "")
            : action.workflow.description,
        }
      : action.workflow;
    setWorkflowState({
      actionKey: action.key,
      label: action.label,
      workflow,
      record: record ?? null,
      selectedRecords: selectedRecords?.length ? selectedRecords : undefined,
    });
    setWorkflowOpen(true);
  }

  async function handleAction(
    action: ActionSchema,
    record: ResourceRecord,
    actionResource: ResourceMeta = resource,
  ) {
    if (!hasPermission(pageUser, action.permission)) {
      return;
    }
    let promptedValues: Record<string, unknown> | null = null;
    if (action.prompt) {
      try {
        promptedValues = await openPromptForm(action.prompt, cachedLoadRemoteOptions);
      } catch (error) {
        if (import.meta.env.DEV) {
          appMessage.error(error instanceof Error ? error.message : "Prompt 表单配置无效");
        }
        return;
      }
      if (!promptedValues) {
        return;
      }
    }
    if (action.kind === "assignment" && action.api && action.assignment) {
      setAssignmentState({ action, record: record as TRecord });
      return;
    }
    if (action.kind === "link" && action.href) {
      const href = action.href.replace(/\{(\w+)\}/g, (_, key: string) => {
        const value = record[key];
        return encodeURIComponent(String(value ?? ""));
      });
      if (action.openInNewTab) {
        window.open(href, "_blank", "noreferrer");
        return;
      }
      navigate(href);
      return;
    }
    if (action.sidePanel) {
      const sidePanelResource = getResourceMeta(action.sidePanel.resourceKey);
      if (!sidePanelResource) {
        appMessage.info(`未找到资源 ${action.sidePanel.resourceKey} 的前端 schema`);
        return;
      }
      const sourceField = action.sidePanel.scope.from ?? actionResource.idKey;
      const sourceValue = record[sourceField];
      if (sourceValue == null || sourceValue === "") {
        appMessage.info("缺少侧栏筛选值，无法打开关联列表");
        return;
      }
      const scopeValue = normalizeSnowflakeId(sourceValue);
      if (!scopeValue) {
        appMessage.error("任务 ID 无效，请刷新列表后重试");
        return;
      }
      if (
        overlayDetailOpen
        && overlayDetailResource
        && overlayDetailRecord
        && actionResource.resource === overlayDetailResource.resource
      ) {
        pushDetailReturnFrame({
          resourceKey: overlayDetailResource.resource,
          record: overlayDetailRecord,
        });
        closeOverlayDetailDrawer();
        setSidePanelReturnDetailRecord(null);
      } else if (state.drawerMode === "detail" && detailRecord && actionResource.resource === resource.resource) {
        setSidePanelReturnDetailRecord(detailRecord as TRecord);
        state.setDrawerMode(null);
        setDetailRecord(null);
      } else {
        setSidePanelReturnDetailRecord(null);
        if (actionResource.resource === resource.resource) {
          state.setDrawerMode(null);
          setDetailRecord(null);
        }
      }
      const createDefaults = {
        ...(action.sidePanel.createDefaults ?? {}),
        ...Object.fromEntries(
          Object.entries(action.sidePanel.createDefaultsFromRecord ?? {}).map(([key, template]) => [
            key,
            applyRecordTemplate(template, record, ""),
          ]),
        ),
      };
      setSidePanelState({
        resourceKey: action.sidePanel.resourceKey,
        scopeField: action.sidePanel.scope.field,
        scopeValue,
        width: action.sidePanel.width,
        hideFilters: action.sidePanel.hideFilters ?? [action.sidePanel.scope.field],
        pinnedListFilters: action.sidePanel.listFilters,
        createDefaults: Object.keys(createDefaults).length > 0 ? createDefaults : undefined,
        createButtonLabel: action.sidePanel.createButtonLabel,
        hideFormFields: action.sidePanel.hideFormFields,
        title: applyRecordTemplate(action.sidePanel.title, record, `${action.label}`),
        description: action.sidePanel.description
          ? applyRecordTemplate(action.sidePanel.description, record, "")
          : undefined,
        listLoaderCode: action.sidePanel.listLoaderCode,
      });
      setSidePanelOpen(true);
      return;
    }
    if (action.kind === "workflow" && action.workflow) {
      openWorkflow(action, record as TRecord);
      return;
    }
    await confirmAction.openOrRunAction(
      action.prompt ? { ...action, confirm: undefined } : action,
      async () => {
        if (action.actionCode) {
          const actionCode = action.actionCode ?? action.key;
          const localHandler = actionHandlers?.[actionCode];
          if (localHandler) {
            const result = await localHandler({ resource: actionResource, action, record });
            if (result?.refresh) {
              await refresh();
            }
            return;
          }
          if (!resolveResourceAction(actionCode)) {
            appMessage.info("该操作暂未注册实现");
            return;
          }
          const result = await runResourceLocalAction({ resource: actionResource, action, record });
          if (result?.refresh) {
            await refresh();
          }
          return;
        }
        try {
          const nextRecord = promptedValues ? { ...record, ...promptedValues } : record;
          if (actionResource.resource === resource.resource) {
            await mutations.runAction({ resource: actionResource, action, record: nextRecord });
          } else {
            await runResourceAction({ resource: actionResource, action, record: nextRecord });
          }
          if (!mutations.usesRefineMutations || !["enable", "disable"].includes(action.key)) {
            await refresh();
          }
        } catch (error) {
          appMessage.errorFrom(error, `${action.label}失败，已恢复原状态`);
          throw error;
        }
      },
      record,
    );
  }

  async function handleSwitchAction(action: ActionSchema, record: TRecord, _column: TableColumnSchema) {
    if (!hasPermission(pageUser, action.permission)) {
      return;
    }
    try {
      if (action.actionCode) {
        const actionCode = action.actionCode ?? action.key;
        const localHandler = actionHandlers?.[actionCode];
        if (localHandler) {
          const result = await localHandler({ resource, action, record });
          if (result?.refresh) {
            await refresh();
          }
          return;
        }
        if (!resolveResourceAction(actionCode)) {
          appMessage.info("该操作暂未注册实现");
          return;
        }
        const result = await runResourceLocalAction({ resource, action, record });
        if (result?.refresh) {
          await refresh();
        }
        return;
      }
      await mutations.runAction({ resource, action, record });
      if (!mutations.usesRefineMutations || !["enable", "disable"].includes(action.key)) {
        await refresh();
      }
    } catch (error) {
      appMessage.errorFrom(error, `${action.label}失败，已恢复原状态`);
      throw error;
    }
  }

  const headerActions = resource.headerActions ?? [];
  const tablePicker = resource.table?.picker;
  const pickerEnabled = tablePicker ? Boolean(tablePicker.enabled) : false;
  const pickerMultiple = tablePicker ? tablePicker.selectionMode === "multiple" : false;
  const bulkActions = useMemo(
    () => resolveResourceBulkActions(resource),
    [resource],
  );

  async function handleBulkAction(action: ActionSchema) {
    if (!hasPermission(pageUser, action.permission)) {
      return;
    }
    const selectedIds = [...state.selectedRowKeys];
    if (selectedIds.length === 0) {
      return;
    }
    const visibleIdSet = new Set(records.map((record) => String(record[resource.idKey])));
    const ids = selectedIds.filter((id) => visibleIdSet.has(String(id)));
    if (ids.length === 0) {
      state.setSelectedRowKeys([]);
      appMessage.info("所选数据已不在当前列表中，请重新勾选");
      return;
    }
    if (ids.length < selectedIds.length) {
      state.setSelectedRowKeys(ids);
      appMessage.info("部分选中项已不在当前列表，将仅处理仍可见的项");
    }
    const count = ids.length;

    if (action.kind === "assignment" && action.assignment && action.bulkApi) {
      const eligibleRecords = records.filter(
        (record) =>
          ids.includes(record[resource.idKey] as string | number) &&
          !isActionBlockedForRecord(resource.resource, action.key, record, pageUser, resource.idKey),
      );
      if (eligibleRecords.length === 0) {
        appMessage.info("所选用户均不可分配角色（可能包含当前登录账号）");
        return;
      }
      if (eligibleRecords.length < ids.length) {
        state.setSelectedRowKeys(eligibleRecords.map((record) => record[resource.idKey] as string | number));
        appMessage.info("已自动排除不可分配角色的用户（例如当前登录账号）");
      }
      await confirmAction.openOrRunAction(
        action,
        async () => {
          setBulkAssignmentState({ action, records: eligibleRecords });
        },
        { count: eligibleRecords.length },
      );
      return;
    }

    if (action.kind === "workflow" && action.workflow) {
      const selectedRecords = records.filter((record) =>
        ids.includes(record[resource.idKey] as string | number),
      );
      await confirmAction.openOrRunAction(
        action,
        async () => {
          openWorkflow(action, null, selectedRecords);
        },
        { count: selectedRecords.length },
      );
      return;
    }

    if (action.kind === "drawer") {
      const selectedRecords = records.filter((record) =>
        ids.includes(record[resource.idKey] as string | number),
      );
      const assignableIds = selectedRecords
        .filter((record) => record.assignable !== false)
        .map((record) => record[resource.idKey] as string | number);
      if (assignableIds.length === 0) {
        appMessage.info("所选题目均不可指派（可能已全部指派）");
        return;
      }
      if (assignableIds.length < selectedRecords.length) {
        appMessage.info("已自动排除不可指派的题目");
      }
      await confirmAction.openOrRunAction(
        action,
        async () => {
          openBatchAssignDrawer(assignableIds);
          state.setSelectedRowKeys([]);
        },
        { count: assignableIds.length },
      );
      return;
    }

    let promptValues: Record<string, unknown> | null = null;
    if (action.prompt) {
      try {
        promptValues = await openPromptForm(action.prompt, cachedLoadRemoteOptions);
      } catch (error) {
        if (import.meta.env.DEV) {
          appMessage.error(error instanceof Error ? error.message : "Prompt 表单配置无效");
        }
        return;
      }
      if (!promptValues) {
        return;
      }
    }

    await confirmAction.openOrRunAction(
      action.prompt ? { ...action, confirm: undefined } : action,
      async () => {
        try {
          await mutations.runBulkAction({ resource, action, ids, values: promptValues ?? undefined });
          state.setSelectedRowKeys([]);
          await refresh();
        } catch (error) {
          appMessage.errorFrom(error, `${action.label}失败，已恢复原状态`);
          throw error;
        }
      },
      { count },
    );
  }

  async function handleHeaderAction(action: HeaderActionSchema) {
    if (!hasPermission(pageUser, action.permission)) {
      return;
    }
    if (action.kind === "drawer") {
      if (action.key === "create") {
        openCreateDrawer();
        return;
      }
      openBatchAssignDrawer();
      return;
    }
    if (action.kind === "link" && action.href) {
      window.open(action.href, "_blank", "noreferrer");
      return;
    }
    if (action.kind === "workflow" && action.workflow) {
      openWorkflow(
        { key: action.key, label: action.label, workflow: action.workflow },
        state.selectedRecord as TRecord | null,
      );
      return;
    }
    if (action.prompt) {
      let promptValues: Record<string, unknown> | null = null;
      try {
        promptValues = await openPromptForm(action.prompt, cachedLoadRemoteOptions);
      } catch (error) {
        if (import.meta.env.DEV) {
          appMessage.error(error instanceof Error ? error.message : "Prompt 表单配置无效");
        }
        return;
      }
      if (!promptValues) {
        return;
      }
      await confirmAction.openOrRunAction(action, async () => {
        try {
          const localHandler = action.actionCode ? headerActionHandlers?.[action.actionCode] : undefined;
          if (localHandler) {
            const result = await localHandler({ values: promptValues! });
            if (result?.refresh) {
              await refresh();
            }
            return;
          }
          if (resolveHeaderActionApi(resource, action)) {
            await appMessage.promise(runHeaderRequestAction(resource, action, promptValues!), {
              loading: `正在${action.label}`,
              success: `${action.label}成功`,
              error: `${action.label}失败`,
            });
            await refresh();
            return;
          }
          const result = await runHeaderAction(action.actionCode ?? action.key, { values: promptValues! });
          if (result?.refresh) {
            await refresh();
          }
        } catch (error) {
          if (!isMessageErrorHandled(error)) {
            appMessage.errorFrom(error, `${action.label}失败`);
          }
          throw error;
        }
      });
      return;
    }
    await confirmAction.openOrRunAction(action, async () => {
      try {
        const localHandler = action.actionCode ? headerActionHandlers?.[action.actionCode] : undefined;
        if (localHandler) {
          const result = await localHandler();
          if (result?.refresh) {
            await refresh();
          }
          return;
        }
        const result = await runHeaderAction(action.actionCode ?? action.key);
        if (result?.refresh) {
          await refresh();
        }
      } catch (error) {
        if (!isMessageErrorHandled(error)) {
          appMessage.errorFrom(error, `${action.label}失败`);
        }
        throw error;
      }
    });
  }

  async function handlePickerConfirm() {
    if (!pickerHandlers?.onConfirm || state.selectedRowKeys.length === 0) {
      return;
    }
    const selected = records.filter((record) =>
      state.selectedRowKeys.includes(record[resource.idKey] as string | number),
    );
    if (selected.length === 0) {
      state.setSelectedRowKeys([]);
      appMessage.info("所选数据已不在当前列表中，请重新选择");
      return;
    }
    pickerHandlers.onConfirm(selected);
  }

  function renderHeaderActionButtons(variant: "page" | "embedded") {
    return headerActions.map((action) => {
      if (!hasPermission(pageUser, action.permission)) {
        return null;
      }
      if (action.kind === "drawer" && action.key === "create") {
        if (!canCreate) {
          return null;
        }
        return (
          <Button
            key={action.key}
            type="button"
            size={variant === "embedded" ? "sm" : "default"}
            onClick={() => {
              state.setSelectedRecord(null);
              state.setDrawerMode("create");
            }}
          >
            {action.label}
          </Button>
        );
      }
      if (action.kind === "link" && action.href) {
        return (
          <Button key={action.key} type="button" variant="outline" size={variant === "embedded" ? "sm" : "default"} asChild>
            <a href={action.href} target="_blank" rel="noreferrer">
              {action.label}
            </a>
          </Button>
        );
      }
      return (
        <Button
          key={action.key}
          type="button"
          variant={variant === "embedded" ? "default" : "outline"}
          size={variant === "embedded" ? "sm" : "default"}
          onClick={() => void handleHeaderAction(action)}
        >
          {action.label}
        </Button>
      );
    });
  }

  return (
    <section className={`lh-resource-page${embedded ? " lh-resource-page--embedded" : ""}`}>
      {!embedded ? (
        <header className="lh-resource-header">
          <div>
            <h1>{title ?? resource.label}</h1>
            <p>{description}</p>
          </div>
          <div className="lh-resource-header-actions flex flex-wrap items-center gap-2">
            {renderHeaderActionButtons("page")}
            {!headerActions.length && canCreate ? (
              <Button
                type="button"
                onClick={() => openCreateDrawer()}
              >
                {resolveCreateButtonLabel(resource, createButtonLabel)}
              </Button>
            ) : null}
          </div>
        </header>
      ) : null}

      {embedded && (headerActions.length > 0 || canCreate) ? (
        <div className="lh-resource-embedded-toolbar flex flex-wrap items-center gap-2">
          {renderHeaderActionButtons("embedded")}
          {!headerActions.length && canCreate ? (
            <Button type="button" size="sm" onClick={() => openCreateDrawer()}>
              {resolveCreateButtonLabel(resource, createButtonLabel)}
            </Button>
          ) : null}
        </div>
      ) : null}

      <LHQueryBar
        schema={uiResource.filters}
        currentUser={pageUser}
        values={state.filters}
        hideFilters={hideFilters}
        loadRemoteOptions={cachedLoadRemoteOptions}
        loading={initialLoading}
        autoSubmit
        onChange={(key, value) => {
          state.setFilters((current) => ({ ...current, [key]: value }));
        }}
        onSubmit={(nextValues) => {
          state.submitFilters(nextValues);
        }}
      />

      {renderInsights?.({
        records,
        total,
        loading: initialLoading,
        refreshing,
      }) ?? null}

      <LHDataTable
        resource={resource}
        currentUser={pageUser}
        dictOptions={dictOptions}
        records={records}
        total={total}
        page={state.page}
        pageSize={state.pageSize}
        loading={initialLoading}
        refreshing={refreshing}
        selectedRowKeys={state.selectedRowKeys}
        sort={state.sort}
        onEdit={(record) => {
          void openEdit(record);
        }}
        onDetail={(record) => {
          void openDetail(record);
        }}
        onCellAction={({ action, column, record }) => {
          if (column.link?.href) {
            navigate(resolveRecordLinkHref(column.link.href, record as TRecord));
            return;
          }
          if (action === "openRelated" && column.link?.resourceKey) {
            void openRelatedDetail(record, column.link);
            return;
          }
          if (action === "detail") {
            void openDetail(record);
          }
        }}
        onAction={(action, record) => {
          void handleAction(action, record);
        }}
        onSwitchAction={(action, record, column) => handleSwitchAction(action, record as TRecord, column)}
        onPageChange={state.setPage}
        onPageSizeChange={state.setPageSize}
        onSortChange={(field) => {
          const current = state.sort[0];
          if (!current || current.field !== field) {
            state.setSort([{ field, order: "asc" }]);
          } else {
            state.setSort([{ field, order: current.order === "asc" ? "desc" : "asc" }]);
          }
          state.setPage(1);
        }}
        onSelectionChange={state.setSelectedRowKeys}
        onPickerRowSelect={pickerHandlers?.onRowSelect}
        bulkToolbar={
          pickerEnabled && pickerMultiple ? (
            <LHTablePickerBar
              visible={state.selectedRowKeys.length > 0}
              count={state.selectedRowKeys.length}
              onConfirm={() => void handlePickerConfirm()}
              onClearSelection={() => state.setSelectedRowKeys([])}
            />
          ) : resource.table!.selectable && bulkActions.length > 0 ? (
            <LHTableBulkActionBar
              visible={state.selectedRowKeys.length > 0}
              count={state.selectedRowKeys.length}
              actions={bulkActions}
              currentUser={pageUser}
              onAction={(action) => void handleBulkAction(action)}
              onClearSelection={() => state.setSelectedRowKeys([])}
            />
          ) : null
        }
      />

      <LHFormDrawer
        resource={uiResource}
        mode={state.drawerMode === "edit" ? "edit" : "create"}
        open={formDrawerOpen}
        loading={state.drawerMode === "edit" && drawerLoader.loading}
        values={values}
        currentUser={pageUser}
        useCustomCreateTitle={Boolean(uiResource.form.title) && state.drawerMode === "create"}
        formContext={{
          scope: scope ? { field: scope.field, value: scope.value } : undefined,
          taskId: scope?.field === "taskId" ? scope.value : undefined,
          onTableAction: ({ action, record }) => {
            if (action === "detail") {
              void openOverlayDetail(record as TRecord);
            }
          },
        }}
        onChange={(key, value) =>
          setValues((currentValues) => setValueAtPath(currentValues, key, value))
        }
        onClose={() => {
          drawerLoader.cancel();
          state.setDrawerMode(null);
          state.setSelectedRecord(null);
          setDrawerActionKey(null);
        }}
        onSubmit={async () => {
          await appMessage.promise(submitForm(), {
            loading: "提交中...",
            success: drawerActionKey === "batchAssign" ? "批量指派成功" : "保存成功",
            error: drawerActionKey === "batchAssign" ? "批量指派失败" : "保存失败",
          });
        }}
        loadRemoteOptions={cachedLoadRemoteOptions!}
      />

      <LHDetailDrawer
        resource={overlayDetailResource ?? resource}
        open={overlayDetailOpen}
        loading={drawerLoader.loading}
        record={overlayDetailRecord}
        currentUser={pageUser}
        onAction={(action, detail) => {
          if (!overlayDetailResource) {
            return;
          }
          void handleAction(action, detail, overlayDetailResource);
        }}
        loadRemoteOptions={cachedLoadRemoteOptions}
        onOpenRelated={(row, link) => {
          void openRelatedDetail(row as TRecord, link);
        }}
        onNavigate={handleDetailNavigate}
        onClose={closeOverlayDetailAndRestore}
      />

      <LHDetailDrawer
        resource={resource}
        open={canDetail && state.drawerMode === "detail"}
        loading={drawerLoader.loading}
        record={detailRecord}
        currentUser={pageUser}
        loadRemoteOptions={cachedLoadRemoteOptions}
        onOpenRelated={(row, link) => {
          void openRelatedDetail(row as TRecord, link);
        }}
        onNavigate={handleDetailNavigate}
        onAction={(action, detail) => {
          state.setSelectedRecord(detail as TRecord);
          void handleAction(action, detail, resource);
        }}
        onClose={() => {
          drawerLoader.cancel();
          state.setDrawerMode(null);
          setDetailRecord(null);
          setSidePanelReturnDetailRecord(null);
          clearDetailReturnStack();
          closeOverlayDetailDrawer();
        }}
      />

      <LHAssignmentDrawer
        resource={resource}
        action={assignmentState?.action ?? { key: "", label: "", kind: "assignment" }}
        record={assignmentState?.record ?? null}
        open={Boolean(assignmentState)}
        onClose={() => setAssignmentState(null)}
        onSubmitted={async () => {
          const active = assignmentState;
          const setCurrentUser = useAuthStore.getState().setCurrentUser;
          const targetUserId = active ? Number(active.record[resource.idKey]) : null;
          const targetRoleCode = active?.record.roleCode != null ? String(active.record.roleCode) : null;
          const affectsCurrentUserRoles =
            Boolean(active && pageUser && resource.resource === "users" && active.action.key === "assignRoles" && targetUserId === pageUser.userId);
          const affectsCurrentUserMenus =
            Boolean(active && pageUser && resource.resource === "roles" && active.action.key === "assignMenus" && targetRoleCode && pageUser.roles.includes(targetRoleCode));
          const affectsCurrentUserPermissions =
            Boolean(active && pageUser && resource.resource === "roles" && active.action.key === "assignPermissions" && targetRoleCode && pageUser.roles.includes(targetRoleCode));

          if (affectsCurrentUserRoles || affectsCurrentUserMenus) {
            await loadMenus(true).catch(() => undefined);
          }
          if (affectsCurrentUserRoles || affectsCurrentUserPermissions) {
            await request<AuthenticatedUser>("/api/v1/auth/me")
              .then(setCurrentUser)
              .catch(() => undefined);
          }

          if (affectsCurrentUserRoles || affectsCurrentUserMenus || affectsCurrentUserPermissions) {
            appMessage.info("当前登录用户的授权已更新，菜单与权限已尝试刷新。");
          } else if (active?.action.kind === "assignment") {
            appMessage.info("授权变更通常会在目标用户重新登录后完全生效。");
          }
          await refresh();
        }}
        loadRemoteOptions={cachedLoadRemoteOptions!}
      />

      <LHBulkAssignmentDrawer
        resource={resource}
        action={bulkAssignmentState?.action ?? { key: "", label: "", kind: "assignment" }}
        records={bulkAssignmentState?.records ?? []}
        open={Boolean(bulkAssignmentState)}
        onClose={() => setBulkAssignmentState(null)}
        onSubmitted={async ({ failedUserIds }) => {
          const active = bulkAssignmentState;
          const affectsCurrentUser =
            Boolean(
              active &&
                pageUser &&
                resource.resource === "users" &&
                active.action.key === "assignRoles" &&
                active.records.some((record) => Number(record[resource.idKey]) === pageUser.userId),
            );

          if (affectsCurrentUser) {
            await loadMenus(true).catch(() => undefined);
            await request<AuthenticatedUser>("/api/v1/auth/me")
              .then(useAuthStore.getState().setCurrentUser)
              .catch(() => undefined);
            appMessage.info("当前登录用户的角色已更新，菜单与权限已尝试刷新。");
          } else if (active?.action.kind === "assignment") {
            appMessage.info("授权变更通常会在目标用户重新登录后完全生效。");
          }

          if (failedUserIds.length > 0) {
            state.setSelectedRowKeys(failedUserIds);
          } else {
            state.setSelectedRowKeys([]);
          }
          await refresh();
        }}
        loadRemoteOptions={cachedLoadRemoteOptions!}
      />

      <LHConfirmDialog {...confirmAction.dialogProps} />
      {sidePanelState
        ? (() => {
          const sidePanelResource = getResourceMeta(sidePanelState.resourceKey);
          if (!sidePanelResource) {
            return null;
          }
          return (
            <LHResourceSidePanel
              open={sidePanelOpen}
              currentUser={pageUser}
              onClose={() => {
                setSidePanelOpen(false);
                if (sidePanelReturnDetailRecord) {
                  state.setSelectedRecord(sidePanelReturnDetailRecord);
                  setDetailRecord(sidePanelReturnDetailRecord);
                  state.setDrawerMode("detail");
                  setSidePanelReturnDetailRecord(null);
                  return;
                }
                const frame = popDetailReturnFrame();
                if (frame) {
                  restoreDetailReturnFrame(frame);
                }
              }}
              onClosed={async () => {
                // SidePanel 关闭后，父页面需要刷新主列表数据（例如导入题目后 quota/数量变化）
                setSidePanelState(null);
                await refresh().catch(() => undefined);
              }}
              resource={sidePanelResource}
              scope={{ field: sidePanelState.scopeField, value: sidePanelState.scopeValue }}
              hideFilters={sidePanelState.hideFilters}
              pinnedListFilters={sidePanelState.pinnedListFilters}
              createDefaults={sidePanelState.createDefaults}
              createButtonLabel={sidePanelState.createButtonLabel}
              hideFormFields={sidePanelState.hideFormFields}
              title={sidePanelState.title}
              description={sidePanelState.description}
              width={sidePanelState.width}
              loadList={
                (query) => {
                  if (sidePanelState.listLoaderCode) {
                    const loader = resolveSidePanelListLoader(sidePanelState.listLoaderCode);
                    if (!loader) {
                      return Promise.reject(
                        new Error(`未注册侧栏列表加载器：${sidePanelState.listLoaderCode}`),
                      );
                    }
                    return loader({
                      query,
                      scope: { field: sidePanelState.scopeField, value: sidePanelState.scopeValue },
                      resource: sidePanelResource,
                    });
                  }
                  let scopedQuery = applyScopeToListQuery(query, {
                    field: sidePanelState.scopeField,
                    value: sidePanelState.scopeValue,
                  });
                  scopedQuery = applyPinnedListFilters(scopedQuery, sidePanelState.pinnedListFilters);
                  const pathParams = {
                    [sidePanelState.scopeField]: sidePanelState.scopeValue,
                  };
                  if (listApiRequiresPathParams(sidePanelResource)) {
                    return fetchLegacyList(sidePanelResource, scopedQuery, pathParams);
                  }
                  if (sidePanelResource.capabilities?.query) {
                    return fetchEngineList(sidePanelResource, scopedQuery);
                  }
                  return fetchLegacyList(sidePanelResource, scopedQuery);
                }
              }
            />
          );
        })()
        : null}
      {workflowState ? (
        <LHWorkflowDrawer
          open={workflowOpen}
          onClose={() => setWorkflowOpen(false)}
          workflow={workflowState.workflow}
          fallbackTitle={workflowState.label}
        >
          {(() => {
            const WorkflowRenderer = resolveWorkflowRenderer(workflowState.workflow.rendererCode);
            if (!WorkflowRenderer) {
              return <div className="text-sm text-slate-500">未找到 workflow 渲染器</div>;
            }
            return (
              <WorkflowRenderer
                workflow={workflowState.workflow}
                resource={resource}
                actionKey={workflowState.actionKey}
                record={workflowState.record}
                selectedRecords={workflowState.selectedRecords}
                scope={scope}
                close={() => setWorkflowOpen(false)}
                refresh={refresh}
              />
            );
          })()}
        </LHWorkflowDrawer>
      ) : null}
    </section>
  );
}
