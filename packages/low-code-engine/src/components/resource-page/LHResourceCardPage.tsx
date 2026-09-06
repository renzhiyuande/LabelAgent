import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useRemoteOptionsCache } from "../../hooks/use-remote-options-cache";
import { useResourceDictOptions } from "../../hooks/use-resource-dict-options";
import { useNavigate } from "react-router-dom";
import { resourceListRootKey } from "../../adapters/query-keys";
import { appMessage } from "../../adapters/lowcode-utils";
import { fetchDetail as engineFetchDetail } from "../../adapters/request";
import {
  applyScopeToListQuery,
  filterResourceFilters,
} from "../../utils/list-scope";
import type { ActionSchema } from "../../schema/types";
import { useResourceCan } from "../../hooks/use-resource-can";
import { useResourceList } from "../../hooks/use-resource-list";
import { useResourceMutations } from "../../hooks/use-resource-mutations";
import { useResourcePage } from "../../hooks/use-resource-page";
import { resolveResourceAction, runResourceLocalAction } from "../../actions/registry";
import { hasPermission } from "../../utils/permissions";
import { LHDetailDrawer } from "../drawers/LHDetailDrawer";
import { LHQueryBar } from "../query-bar/LHQueryBar";
import { useAuthStore } from "../../stores/auth-stub";
import { LHConfirmDialog } from "../dialogs/LHConfirmDialog";
import { useConfirmAction } from "../../hooks/use-confirm-action";
import { useDrawerDetailLoader } from "../../hooks/use-drawer-detail-loader";
import { getRouteMetaService } from "../../global-config";
import type { ResourcePageProps, ResourceRecord } from "../../types";
import { LHPagination } from "../pagination/LHPagination";
import { LHResourceCardGrid, LHResourceCardEmpty } from "../card/LHResourceCardGrid";
import { LHResourceCardItem } from "../card/LHResourceCardItem";
import { LHMetricsBar } from "../metrics/LHMetricsBar";
import { applyRecordTemplate } from "../../utils/record-template";
import { resolveActionSuccessMessage } from "../../utils/action-message";

export function LHResourceCardPage<TRecord extends ResourceRecord>({
  resource,
  title,
  pageSize = 12,
  reloadToken = 0,
  description,
  loadList,
  loadDetail,
  runAction,
  loadRemoteOptions,
  scope,
  hideFilters = [],
  embedded = false,
  currentUser,
  actionHandlers,
}: ResourcePageProps<TRecord>) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pageUser = currentUser ?? useAuthStore((item) => item.currentUser);
  const cardSchema = resource.page?.card;
  const state = useResourcePage(resource, pageSize);
  const confirmAction = useConfirmAction();
  const drawerLoader = useDrawerDetailLoader();
  const cachedLoadRemoteOptions = useRemoteOptionsCache(loadRemoteOptions);
  const dictOptions = useResourceDictOptions(resource);

  useEffect(() => {
    if (!cardSchema && import.meta.env.DEV) {
      console.warn(`[card] resource "${resource.resource}" missing page.card schema`);
    }
  }, [cardSchema, resource.resource]);

  const scopedListQuery = useMemo(
    () => (scope ? applyScopeToListQuery(state.listQuery, scope) : state.listQuery),
    [scope, state.listQuery],
  );
  const resolvedLoadList = useMemo(() => {
    if (!scope) {
      return loadList;
    }
    if (loadList) {
      return (query: typeof scopedListQuery) => loadList(applyScopeToListQuery(query, scope));
    }
    return undefined;
  }, [loadList, scope]);

  const { records, total, initialLoading, refreshing, refetch } = useResourceList<TRecord>(resource, scopedListQuery, {
    reloadToken: state.reloadToken + reloadToken,
    fetchList: resolvedLoadList,
  });

  const mutations = useResourceMutations<TRecord>(resource, {
    listQuery: scopedListQuery,
    runAction,
  });

  const uiResource = useMemo(() => {
    if (hideFilters.length === 0) {
      return resource;
    }
    return { ...resource, filters: filterResourceFilters(resource.filters, hideFilters) };
  }, [hideFilters, resource]);

  const resolveLoadDetail = useMemo(() => {
    if (loadDetail) {
      return loadDetail;
    }
    return (id: string | number) => engineFetchDetail<TRecord>(resource, id);
  }, [loadDetail, resource]);

  const [detailRecord, setDetailRecord] = useState<TRecord | null>(null);
  const { data: canListAccess } = useResourceCan(resource, "list");
  const pageAccess = canListAccess?.can ?? false;
  const canDetail = pageAccess && resource.capabilities?.detail !== false && Boolean(resource.detail);

  async function refresh() {
    await refetch();
  }

  async function openDetail(record: TRecord) {
    if (!canDetail) {
      return;
    }
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

  function navigateAfterAction(action: ActionSchema, record: TRecord, response?: Record<string, unknown> | void) {
    if (!action.navigateOnSuccess?.href) {
      return;
    }
    const merged = { ...record, ...(response ?? {}) } as Record<string, unknown>;
    const href = applyRecordTemplate(action.navigateOnSuccess.href, merged, "");
    if (!href || href.includes("{")) {
      appMessage.error("操作成功，但无法跳转：缺少分配信息");
      return;
    }
    navigate(href, { replace: action.navigateOnSuccess.replace });
    const targetMeta = getRouteMetaService()?.getRouteMetaByPath?.(href.split("?")[0]?.split("#")[0] ?? "");
    if (targetMeta?.resourceKey) {
      void queryClient.invalidateQueries({ queryKey: resourceListRootKey(targetMeta.resourceKey) });
    }
  }

  async function handleAction(action: ActionSchema, record: TRecord) {
    if (!hasPermission(pageUser, action.permission)) {
      return;
    }
    if (action.kind === "link" && action.href) {
      const href = applyRecordTemplate(action.href, record, "");
      if (action.openInNewTab) {
        window.open(href, "_blank", "noreferrer");
        return;
      }
      navigate(href);
      return;
    }
    if (action.kind === "drawer") {
      await openDetail(record);
      return;
    }
    if (action.sidePanel) {
      // TODO: 实现卡片页侧栏嵌套列表
      appMessage.info("卡片页暂不支持侧栏嵌套列表，请使用表格资源页");
      return;
    }
    await confirmAction.openOrRunAction(
      action,
      async () => {
        if (action.actionCode) {
          const actionCode = action.actionCode ?? action.key;
          const localHandler = actionHandlers?.[actionCode];
          if (localHandler) {
            const result = await localHandler({ resource, action, record });
            navigateAfterAction(action, record);
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
          navigateAfterAction(action, record);
          if (result?.refresh) {
            await refresh();
          }
          return;
        }
        try {
          const response = await mutations.runAction({ resource, action, record });
          appMessage.success(resolveActionSuccessMessage(action, record, response));
          navigateAfterAction(action, record, response);
          await refresh();
        } catch (error) {
          appMessage.errorFrom(error, `${action.label}失败`);
          throw error;
        }
      },
      record,
    );
  }

  const effectiveCard = cardSchema ?? {
    title: { field: resource.idKey },
    empty: { title: "暂无数据" },
  };

  return (
    <section className={`lh-resource-page lh-resource-card-page${embedded ? " lh-resource-page--embedded" : ""}`}>
      {!embedded ? (
        <header className="lh-resource-header">
          <div>
            <h1>{title ?? resource.label}</h1>
            <p>{description ?? "Schema 驱动的卡片资源页"}</p>
          </div>
        </header>
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

      <LHMetricsBar schema={resource.metrics} records={records} />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {initialLoading || records.length > 0 ? (
            <LHResourceCardGrid card={effectiveCard} loading={initialLoading}>
              {records.map((record) => (
                <LHResourceCardItem
                  key={String(record[resource.idKey])}
                  resource={resource}
                  card={effectiveCard}
                  record={record}
                  currentUser={pageUser}
                  dictOptions={dictOptions}
                  onOpenDetail={canDetail ? () => void openDetail(record) : undefined}
                  onAction={(action, row) => void handleAction(action, row as TRecord)}
                />
              ))}
            </LHResourceCardGrid>
          ) : (
            <LHResourceCardEmpty card={effectiveCard} />
          )}
        </div>

        {resource.table!.pagination !== false ? (
          <div className="mt-auto flex-shrink-0">
            <LHPagination
              total={total}
              page={state.page}
              pageSize={state.pageSize}
              onPageChange={state.setPage}
              onPageSizeChange={state.setPageSize}
            />
          </div>
        ) : null}
      </div>

      {refreshing && !initialLoading ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-20 h-0.5 bg-primary/80" aria-hidden />
      ) : null}

      <LHDetailDrawer
        resource={resource}
        open={canDetail && state.drawerMode === "detail"}
        loading={drawerLoader.loading}
        record={detailRecord}
        currentUser={pageUser}
        loadRemoteOptions={cachedLoadRemoteOptions}
        onNavigate={(href, openInNewTab) => {
          if (openInNewTab) {
            window.open(href, "_blank", "noreferrer");
            return;
          }
          navigate(href);
        }}
        onAction={(action, detail) => {
          void handleAction(action, detail as TRecord);
        }}
        onClose={() => {
          drawerLoader.cancel();
          state.setDrawerMode(null);
          setDetailRecord(null);
        }}
      />

      <LHConfirmDialog {...confirmAction.dialogProps} />
    </section>
  );
}
