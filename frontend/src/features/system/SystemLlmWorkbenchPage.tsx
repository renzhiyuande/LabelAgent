import { ChevronLeft, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppPageContainer } from "../../app/layout/AppPageContainer";
import { Badge } from "../../components/ui/badge";
import { appMessage } from "../../lib/message";
import {
  createRecord,
  deleteRecord,
  fetchDetail,
  fetchEngineList,
  fetchRemoteOptions,
  LHDetailDrawer,
  LHConfirmDialog,
  LHFormDrawer,
  LHQueryBar,
  runResourceAction,
  updateRecord,
} from "@labelhub/low-code-engine";
import { llmModelsResource, llmProvidersResource } from "@/low-code-resources";
import { useResourceDictOptions } from "@/low-code/hooks/use-resource-dict-options";
import { toneToBadgeVariant } from "@/low-code/utils/dict-display";
import { resolveDictStatusLabel } from "@/low-code/utils/detail-field-display";
import type { ResourceRecord } from "@/low-code/types";
import type { EngineListQuery } from "@/low-code/types";
import { useResourceForm } from "@/low-code/hooks/use-resource-form";
import { useResourcePage } from "@/low-code/hooks/use-resource-page";
import { useConfirmAction } from "@/low-code/hooks/use-confirm-action";
import { useDrawerDetailLoader } from "@/low-code/hooks/use-drawer-detail-loader";
import { setValueAtPath } from "@/low-code/utils/object-path";
import { RemoteModelDiscoveryPanel } from "./components/RemoteModelDiscoveryPanel";

type LlmProviderRecord = ResourceRecord;
type LlmModelRecord = ResourceRecord;

async function fetchLlmModelsByProvider(
  providerId: string | number,
  query: EngineListQuery,
) {
  const payloadFilters = [
    ...(query.filters ?? []).filter((filter) => filter.field !== "providerId"),
    { field: "providerId", op: "eq" as const, value: String(providerId) },
  ];
  return fetchEngineList<ResourceRecord>(llmModelsResource, {
    ...query,
    filters: payloadFilters,
  });
}

function providerSummary(record: LlmProviderRecord | null): string {
  if (!record) {
    return "请先在左侧选择一个LLM 提供商";
  }
  return `${String(record.providerName ?? record.providerCode ?? "已选字典")} 下的LLM 模型`;
}

function LlmStatusBadge({
  value,
  dictCode,
  dictOptions,
}: {
  value: unknown;
  dictCode: string;
  dictOptions: Record<string, import("@/low-code/schema/types").OptionItem[]>;
}) {
  const resolved = resolveDictStatusLabel(value, dictCode, dictOptions);
  return <Badge variant={toneToBadgeVariant(resolved.tone)}>{resolved.label}</Badge>;
}

function getTotalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function SystemLlmWorkbenchPage() {
  const providerState = useResourcePage(llmProvidersResource, 20);
  const modelState = useResourcePage(llmModelsResource, 20);
  const workbenchRef = useRef<HTMLDivElement | null>(null);

  const [providers, setDictTypes] = useState<LlmProviderRecord[]>([]);
  const [providersTotal, setDictTypesTotal] = useState(0);
  const [providersLoading, setDictTypesLoading] = useState(false);

  const [models, setDictItems] = useState<LlmModelRecord[]>([]);
  const [modelsTotal, setDictItemsTotal] = useState(0);
  const [modelsLoading, setDictItemsLoading] = useState(false);
  const [modelsRefreshing, setDictItemsRefreshing] = useState(false);
  const modelsHasLoadedRef = useRef(false);
  const pendingStatusTogglesRef = useRef(new Map<string | number, string>());

  const [selectedProvider, setSelectedProvider] = useState<LlmProviderRecord | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileModelsOpen, setMobileModelsOpen] = useState(false);

  const [providerDetail, setDictTypeDetail] = useState<LlmProviderRecord | null>(null);
  const [modelDetail, setDictItemDetail] = useState<LlmModelRecord | null>(null);
  const confirmAction = useConfirmAction();
  const providerDrawerLoader = useDrawerDetailLoader();
  const modelDrawerLoader = useDrawerDetailLoader();
  const providersDictOptions = useResourceDictOptions(llmProvidersResource);
  const modelsDictOptions = useResourceDictOptions(llmModelsResource);

  const providerForm = useResourceForm(
    llmProvidersResource,
    providerState.drawerMode === "edit" ? "edit" : "create",
    providerState.selectedRecord,
    providerState.drawerMode === "create" || providerState.drawerMode === "edit",
  );
  const modelForm = useResourceForm(
    llmModelsResource,
    modelState.drawerMode === "edit" ? "edit" : "create",
    modelState.selectedRecord,
    modelState.drawerMode === "create" || modelState.drawerMode === "edit",
  );

  const activeProviderId = selectedProvider?.[llmProvidersResource.idKey] as string | number | undefined;
  const providerTotalPages = getTotalPages(providersTotal, providerState.pageSize);
  const modelTotalPages = getTotalPages(modelsTotal, modelState.pageSize);

  function mergePendingStatusToggles(items: LlmModelRecord[]): LlmModelRecord[] {
    const pending = pendingStatusTogglesRef.current;
    if (pending.size === 0) {
      return items;
    }
    return items.map((item) => {
      const recordId = item[llmModelsResource.idKey] as string | number;
      const nextStatus = pending.get(recordId);
      return nextStatus ? { ...item, status: nextStatus } : item;
    });
  }

  const modelListQuery = useMemo<EngineListQuery>(
    () => ({
      ...modelState.listQuery,
      filters: [
        ...(modelState.listQuery.filters ?? []).filter((filter) => filter.field !== "providerId"),
        ...(activeProviderId != null ? [{ field: "providerId", op: "eq" as const, value: String(activeProviderId) }] : []),
      ],
    }),
    [activeProviderId, modelState.listQuery],
  );

  useEffect(() => {
    const workbench = workbenchRef.current;
    if (!workbench) {
      return;
    }

    const update = () => {
      const nextIsMobile = workbench.clientWidth < 640;
      setIsMobile((current) => {
        if (current === nextIsMobile) {
          return current;
        }
        return nextIsMobile;
      });
      if (!nextIsMobile) {
        setMobileModelsOpen(false);
      }
    };

    update();
    const resizeObserver = new ResizeObserver(() => {
      update();
    });
    resizeObserver.observe(workbench);
    window.addEventListener("resize", update);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadProviders() {
      setDictTypesLoading(true);
      try {
        const result = await fetchEngineList<LlmProviderRecord>(llmProvidersResource, providerState.listQuery);
        if (!active) {
          return;
        }
        setDictTypes(result.data);
        setDictTypesTotal(result.total);
        setSelectedProvider((current) => {
          if (!result.data.length) {
            return null;
          }
          if (current) {
            const matched = result.data.find(
              (item) => item[llmProvidersResource.idKey] === current[llmProvidersResource.idKey],
            );
            if (matched) {
              return matched;
            }
          }
          return result.data[0];
        });
      } finally {
        if (active) {
          setDictTypesLoading(false);
        }
      }
    }
    void loadProviders();
    return () => {
      active = false;
    };
  }, [providerState.listQuery, providerState.reloadToken]);


  useEffect(() => {
    modelsHasLoadedRef.current = false;
    pendingStatusTogglesRef.current.clear();
  }, [activeProviderId]);

  useEffect(() => {
    if (activeProviderId == null) {
      setDictItems([]);
      setDictItemsTotal(0);
      setDictItemsLoading(false);
      setDictItemsRefreshing(false);
      return;
    }
    const currentTypeId = activeProviderId;
    let active = true;
    async function loadModels() {
      const blocking = !modelsHasLoadedRef.current;
      if (blocking) {
        setDictItemsLoading(true);
      } else {
        setDictItemsRefreshing(true);
      }
      try {
        const result = await fetchLlmModelsByProvider(currentTypeId, modelListQuery);
        if (!active) {
          return;
        }
        setDictItems(mergePendingStatusToggles(result.data));
        setDictItemsTotal(result.total);
        modelsHasLoadedRef.current = true;
      } catch {
        if (active && blocking) {
          setDictItems([]);
          setDictItemsTotal(0);
        }
      } finally {
        if (active) {
          setDictItemsLoading(false);
          setDictItemsRefreshing(false);
        }
      }
    }
    void loadModels();
    return () => {
      active = false;
    };
  }, [activeProviderId, modelListQuery, modelState.reloadToken]);

  useEffect(() => {
    modelState.setPage(1);
  }, [activeProviderId]);

  async function openProviderDetail(record: LlmProviderRecord) {
    providerState.setSelectedRecord(record);
    setDictTypeDetail(null);
    providerState.setDrawerMode("detail");
    try {
      const detail = await providerDrawerLoader.load(() =>
        fetchDetail<LlmProviderRecord>(llmProvidersResource, record[llmProvidersResource.idKey] as string | number),
      );
      if (!detail) {
        return;
      }
      setDictTypeDetail(detail);
      providerState.setSelectedRecord(detail);
    } catch (error) {
      appMessage.errorFrom(error, "加载详情失败");
      providerState.setDrawerMode(null);
      providerState.setSelectedRecord(null);
      setDictTypeDetail(null);
    }
  }

  async function openProviderEdit(record: LlmProviderRecord) {
    providerState.setSelectedRecord(record);
    providerState.setDrawerMode("edit");
    try {
      const detail = await providerDrawerLoader.load(() =>
        fetchDetail<LlmProviderRecord>(llmProvidersResource, record[llmProvidersResource.idKey] as string | number),
      );
      if (!detail) {
        return;
      }
      providerState.setSelectedRecord(detail);
    } catch (error) {
      appMessage.errorFrom(error, "加载编辑数据失败");
      providerState.setDrawerMode(null);
      providerState.setSelectedRecord(null);
    }
  }

  async function openModelDetail(record: LlmModelRecord) {
    modelState.setSelectedRecord(record);
    setDictItemDetail(null);
    modelState.setDrawerMode("detail");
    try {
      const detail = await modelDrawerLoader.load(() =>
        fetchDetail<LlmModelRecord>(llmModelsResource, record[llmModelsResource.idKey] as string | number),
      );
      if (!detail) {
        return;
      }
      setDictItemDetail(detail);
      modelState.setSelectedRecord(detail);
    } catch (error) {
      appMessage.errorFrom(error, "加载详情失败");
      modelState.setDrawerMode(null);
      modelState.setSelectedRecord(null);
      setDictItemDetail(null);
    }
  }

  async function openModelEdit(record: LlmModelRecord) {
    modelState.setSelectedRecord(record);
    modelState.setDrawerMode("edit");
    try {
      const detail = await modelDrawerLoader.load(() =>
        fetchDetail<LlmModelRecord>(llmModelsResource, record[llmModelsResource.idKey] as string | number),
      );
      if (!detail) {
        return;
      }
      modelState.setSelectedRecord(detail);
    } catch (error) {
      appMessage.errorFrom(error, "加载编辑数据失败");
      modelState.setDrawerMode(null);
      modelState.setSelectedRecord(null);
    }
  }

  async function submitProviderForm() {
    if (providerState.drawerMode === "edit" && providerState.selectedRecord) {
      await updateRecord<LlmProviderRecord>(
        llmProvidersResource,
        providerState.selectedRecord[llmProvidersResource.idKey] as string | number,
        providerForm.values,
      );
    } else {
      await createRecord<LlmProviderRecord>(llmProvidersResource, providerForm.values);
    }
    providerState.setDrawerMode(null);
    providerState.setSelectedRecord(null);
    providerState.reload();
  }

  async function submitModelForm() {
    const nextValues = setValueAtPath(
      modelForm.values,
      "providerId",
      String(activeProviderId ?? modelForm.values.providerId ?? ""),
    );
    if (modelState.drawerMode === "edit" && modelState.selectedRecord) {
      await updateRecord<LlmModelRecord>(
        llmModelsResource,
        modelState.selectedRecord[llmModelsResource.idKey] as string | number,
        nextValues,
      );
    } else {
      await createRecord<LlmModelRecord>(llmModelsResource, nextValues);
    }
    modelState.setDrawerMode(null);
    modelState.setSelectedRecord(null);
    modelState.reload();
  }

  async function removeProvider(record: LlmProviderRecord) {
    await deleteRecord(
      llmProvidersResource,
      record[llmProvidersResource.idKey] as string | number,
    );
    setSelectedProvider((current) =>
      current?.[llmProvidersResource.idKey] === record[llmProvidersResource.idKey] ? null : current,
    );
    providerState.reload();
  }

  async function removeModel(record: LlmModelRecord) {
    await deleteRecord(
      llmModelsResource,
      record[llmModelsResource.idKey] as string | number,
    );
    modelState.reload();
  }

  async function toggleModelStatus(record: LlmModelRecord, actionKey: "enable" | "disable") {
    const action = llmModelsResource.actions?.find((item) => item.key === actionKey);
    if (!action) {
      return;
    }

    const recordId = record[llmModelsResource.idKey] as string | number;
    const nextStatus = actionKey === "enable" ? "ACTIVE" : "DISABLED";
    let rollbackItems: LlmModelRecord[] = [];

    pendingStatusTogglesRef.current.set(recordId, nextStatus);
    setDictItems((current) => {
      rollbackItems = current;
      return current.map((item) =>
        item[llmModelsResource.idKey] === recordId ? { ...item, status: nextStatus } : item,
      );
    });

    try {
      await runResourceAction({
        resource: llmModelsResource,
        action,
        record,
      });
      pendingStatusTogglesRef.current.delete(recordId);
    } catch (error) {
      pendingStatusTogglesRef.current.delete(recordId);
      setDictItems(rollbackItems);
      appMessage.errorFrom(error, actionKey === "enable" ? "启用失败" : "禁用失败");
    }
  }

  function openMobileModelsPanel(record: LlmProviderRecord) {
    setSelectedProvider(record);
    setMobileModelsOpen(true);
  }

  const modelWorkspaceNode = (
    <section className="lh-dict-item-workspace">
      <div className="lh-dict-item-workspace-header">
        <div className="lh-dict-section-heading">
          <h2>LLM 模型</h2>
          <p>{providerSummary(selectedProvider)}</p>
        </div>
        <div className="lh-dict-item-workspace-actions">
          <button
            type="button"
            className="lh-primary-button"
            disabled={!selectedProvider}
            onClick={() => {
              if (!selectedProvider) {
                appMessage.info("请先选择一个LLM 提供商");
                return;
              }
              modelState.setSelectedRecord({
                providerId: String(selectedProvider[llmProvidersResource.idKey]),
              });
              modelState.setDrawerMode("create");
            }}
          >
            新建LLM 模型
          </button>
        </div>
      </div>

      <div className="lh-dict-workbench-query">
        <LHQueryBar
          schema={llmModelsResource.filters}
          values={modelState.filters}
          loading={modelsLoading}
          autoSubmit
          loadRemoteOptions={(source, keyword) => fetchRemoteOptions(llmModelsResource, source, keyword)}
          onChange={(key: string, value: unknown) => {
            modelState.setFilters((current) => ({ ...current, [key]: value }));
          }}
          onSubmit={(nextValues) => {
            modelState.submitFilters(nextValues);
          }}
        />
      </div>

      <div className={`lh-dict-items-table-shell${modelsRefreshing ? " is-refreshing" : ""}`}>
        {modelsRefreshing ? <div className="lh-table-refresh-bar" aria-hidden /> : null}
        <table className="lh-dict-items-table">
          <thead>
            <tr>
              <th>模型编码</th>
              <th>模型名称</th>
              <th>模型类型</th>
              <th>上下文窗口</th>
              <th>最大输出 Token</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {modelsLoading ? (
              <tr>
                <td colSpan={7}>加载中...</td>
              </tr>
            ) : models.length === 0 ? (
              <tr>
                <td colSpan={7}>当前LLM 提供商下暂无LLM 模型</td>
              </tr>
            ) : (
              models.map((record) => (
                <tr key={String(record[llmModelsResource.idKey])}>
                  <td title={String(record.modelCode ?? "")}>{String(record.modelCode ?? "-")}</td>
                  <td title={String(record.modelName ?? "")}>{String(record.modelName ?? "-")}</td>
                  <td title={String(record.modelType ?? "")}>{String(record.modelType ?? "-")}</td>
                  <td>{String(record.contextWindow ?? "-")}</td>
                  <td>{String(record.maxOutputTokens ?? "-")}</td>
                  <td>
                    <LlmStatusBadge
                      value={record.status}
                      dictCode="provider_status"
                      dictOptions={modelsDictOptions}
                    />
                  </td>
                  <td>
                    <div className="lh-dict-item-row-actions">
                      <button
                        type="button"
                        className="lh-secondary-button"
                        onClick={() => {
                          void openModelDetail(record);
                        }}
                      >
                        详情
                      </button>
                      <button
                        type="button"
                        className="lh-primary-button"
                        onClick={() => {
                          void openModelEdit(record);
                        }}
                      >
                        编辑
                      </button>
                      {record.status === "ACTIVE" ? (
                        <button
                          type="button"
                          className="lh-secondary-button"
                          onClick={() => {
                            void toggleModelStatus(record, "disable");
                          }}
                        >
                          禁用
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="lh-secondary-button"
                          onClick={() => {
                            void toggleModelStatus(record, "enable");
                          }}
                        >
                          启用
                        </button>
                      )}
                      <button
                        type="button"
                        className="lh-action-button danger"
                        onClick={() => {
                          void confirmAction.openOrRunAction(
                            llmModelsResource.actions?.find((item) => item.key === "delete")!,
                            async () => {
                              await appMessage.promise(removeModel(record), {
                                loading: "删除中...",
                                success: "删除成功",
                                error: "删除失败",
                              });
                            },
                            record,
                          );
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="lh-table-footer">
        <div className="lh-table-footer-summary">
          <span>第 {modelState.page} / {modelTotalPages} 页</span>
          <span>共 {modelsTotal} 条</span>
        </div>
        <div className="lh-table-footer-actions">
          <button
            type="button"
            className="lh-secondary-button"
            disabled={modelState.page <= 1}
            onClick={() => modelState.setPage(modelState.page - 1)}
          >
            上一页
          </button>
          <button
            type="button"
            className="lh-secondary-button"
            disabled={modelState.page >= modelTotalPages}
            onClick={() => modelState.setPage(modelState.page + 1)}
          >
            下一页
          </button>
        </div>
      </div>
    </section>
  );

  return (
    <AppPageContainer
      title="LLM 模型目录"
      description="左侧选择LLM 提供商，右侧同步维护该类型下的LLM 模型。编辑与详情仍统一走抽屉，避免在多个页面之间来回跳转。"
     >
      <div ref={workbenchRef} className="lh-dict-workbench">
        <section className="lh-dict-type-rail">
          <div className="lh-dict-type-rail-header">
            <div className="lh-dict-section-heading">
              <h2>LLM 提供商</h2>
              <p>点击左侧条目，右侧LLM 模型会立即同步。</p>
            </div>
            <button
              type="button"
              className="lh-primary-button lh-dict-type-create-button"
              onClick={() => {
                providerState.setSelectedRecord(null);
                providerState.setDrawerMode("create");
              }}
            >
              新建提供商
            </button>
          </div>

          <div className="lh-dict-workbench-query">
            <LHQueryBar
              schema={llmProvidersResource.filters}
              values={providerState.filters}
              loading={providersLoading}
              autoSubmit
              loadRemoteOptions={(source, keyword) => fetchRemoteOptions(llmProvidersResource, source, keyword)}
              onChange={(key: string, value: unknown) => {
                providerState.setFilters((current) => ({ ...current, [key]: value }));
              }}
              onSubmit={(nextValues) => {
                providerState.submitFilters(nextValues);
              }}
            />
          </div>

          <div className="lh-dict-type-list">
            {providersLoading ? <div className="lh-dict-type-empty">加载中...</div> : null}
            {!providersLoading && providers.length === 0 ? <div className="lh-dict-type-empty">暂无LLM 提供商</div> : null}
            {!providersLoading
              ? providers.map((record) => {
                  const selected =
                    selectedProvider?.[llmProvidersResource.idKey] === record[llmProvidersResource.idKey];
                  return (
                    <div
                      key={String(record[llmProvidersResource.idKey])}
                      role="button"
                      tabIndex={0}
                      className={`lh-dict-type-item ${selected ? "is-active" : ""}`}
                      onClick={() => {
                        if (isMobile) {
                          openMobileModelsPanel(record);
                          return;
                        }
                        setSelectedProvider(record);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") {
                          return;
                        }
                        event.preventDefault();
                        if (isMobile) {
                          openMobileModelsPanel(record);
                          return;
                        }
                        setSelectedProvider(record);
                      }}
                    >
                      <div className="lh-dict-type-item-main">
                        <div className="lh-dict-type-item-title-row">
                          <strong title={String(record.providerName ?? record.providerCode ?? "")}>
                            {String(record.providerName ?? record.providerCode ?? "-")}
                          </strong>
                          <LlmStatusBadge
                            value={record.status}
                            dictCode="provider_status"
                            dictOptions={providersDictOptions}
                          />
                        </div>
                        <span className="lh-dict-type-item-code" title={String(record.providerCode ?? "")}>
                          {String(record.providerCode ?? "-")}
                        </span>
                        <p title={String(record.baseUrl ?? "")}>
                          {String(record.baseUrl ?? "暂无备注")}
                        </p>
                      </div>
                      <div className="lh-dict-type-item-actions">
                        <button
                          type="button"
                          className="lh-secondary-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void openProviderDetail(record);
                          }}
                        >
                          详情
                        </button>
                        <button
                          type="button"
                          className="lh-primary-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void openProviderEdit(record);
                          }}
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          className="lh-action-button danger"
                          onClick={(event) => {
                            event.stopPropagation();
                            void confirmAction.openOrRunAction(
                              llmProvidersResource.actions?.find((item) => item.key === "delete")!,
                              async () => {
                                await appMessage.promise(removeProvider(record), {
                                  loading: "删除中...",
                                  success: "删除成功",
                                  error: "删除失败",
                                });
                              },
                              record,
                            );
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  );
                })
              : null}
          </div>

          <div className="lh-table-footer lh-dict-type-footer">
            <div className="lh-table-footer-summary">
              <span>第 {providerState.page} / {providerTotalPages} 页</span>
              <span>共 {providersTotal} 条</span>
            </div>
            <div className="lh-table-footer-actions">
              <button
                type="button"
                className="lh-secondary-button"
                disabled={providerState.page <= 1}
                onClick={() => providerState.setPage(providerState.page - 1)}
              >
                上一页
              </button>
              <button
                type="button"
                className="lh-secondary-button"
                disabled={providerState.page >= providerTotalPages}
                onClick={() => providerState.setPage(providerState.page + 1)}
              >
                下一页
              </button>
            </div>
          </div>
        </section>
        {!isMobile ? modelWorkspaceNode : null}
      </div>

      {isMobile ? (
        <aside
          className={`lh-mobile-dict-items-overlay ${mobileModelsOpen ? "" : "lh-mobile-dict-items-overlay--hidden"}`}
          onClick={() => setMobileModelsOpen(false)}
        >
          <section
            className={`lh-mobile-dict-items-panel ${mobileModelsOpen ? "" : "lh-mobile-dict-items-panel--hidden"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="lh-mobile-dict-items-panel-header">
              <button
                type="button"
                className="lh-secondary-button"
                onClick={() => setMobileModelsOpen(false)}
              >
                <ChevronLeft className="h-4 w-4" />
                返回
              </button>
              <div className="lh-mobile-dict-items-panel-heading">
                <strong>{String(selectedProvider?.providerName ?? selectedProvider?.providerCode ?? "LLM 模型")}</strong>
                <span>{providerSummary(selectedProvider)}</span>
              </div>
              <button
                type="button"
                className="lh-secondary-button"
                onClick={() => setMobileModelsOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="lh-mobile-dict-items-panel-body">
              {modelWorkspaceNode}
            </div>
          </section>
        </aside>
      ) : null}

      <LHFormDrawer
        resource={llmProvidersResource}
        mode={providerState.drawerMode === "edit" ? "edit" : "create"}
        open={providerState.drawerMode === "create" || providerState.drawerMode === "edit"}
        loading={providerState.drawerMode === "edit" && providerDrawerLoader.loading}
        values={providerForm.values}
        onChange={(key: string, value: unknown) =>
          providerForm.setValues((currentValues) => setValueAtPath(currentValues, key, value))
        }
        onClose={() => {
          providerDrawerLoader.cancel();
          providerState.setDrawerMode(null);
          providerState.setSelectedRecord(null);
        }}
        onSubmit={async () => {
          await appMessage.promise(submitProviderForm(), {
            loading: "提交中...",
            success: "保存成功",
            error: "保存失败",
          });
        }}
        prepend={
          providerState.drawerMode === "create" ? (
            <RemoteModelDiscoveryPanel
              baseUrl={String(providerForm.values.baseUrl ?? "")}
              apiKey={String(providerForm.values.apiKey ?? "")}
              providerCode={String(providerForm.values.providerCode ?? "")}
              onPick={() => {
                appMessage.info("请先保存提供商，再在右侧「新建 LLM 模型」中从列表选取模型");
              }}
            />
          ) : null
        }
        loadRemoteOptions={(source, keyword) => fetchRemoteOptions(llmProvidersResource, source, keyword)}
      />

      <LHFormDrawer
        resource={llmModelsResource}
        mode={modelState.drawerMode === "edit" ? "edit" : "create"}
        open={modelState.drawerMode === "create" || modelState.drawerMode === "edit"}
        loading={modelState.drawerMode === "edit" && modelDrawerLoader.loading}
        values={modelForm.values}
        onChange={(key: string, value: unknown) =>
          modelForm.setValues((currentValues) => setValueAtPath(currentValues, key, value))
        }
        onClose={() => {
          modelDrawerLoader.cancel();
          modelState.setDrawerMode(null);
          modelState.setSelectedRecord(null);
        }}
        onSubmit={async () => {
          await appMessage.promise(submitModelForm(), {
            loading: "提交中...",
            success: "保存成功",
            error: "保存失败",
          });
        }}
        prepend={
          modelState.drawerMode === "create" ? (
            <RemoteModelDiscoveryPanel
              providerId={
                activeProviderId ??
                (modelForm.values.providerId != null ? String(modelForm.values.providerId) : undefined)
              }
              onPick={(model) => {
                modelForm.setValues((currentValues) => ({
                  ...currentValues,
                  providerId: String(activeProviderId ?? currentValues.providerId ?? ""),
                  modelCode: model.modelCode,
                  modelName: model.modelName,
                  modelType: model.modelType,
                  status: currentValues.status ?? "ACTIVE",
                }));
                appMessage.success(`已填入模型 ${model.modelCode}`);
              }}
            />
          ) : null
        }
        loadRemoteOptions={(source, keyword) => fetchRemoteOptions(llmModelsResource, source, keyword)}
      />

      <LHDetailDrawer
        resource={llmProvidersResource}
        open={providerState.drawerMode === "detail"}
        loading={providerDrawerLoader.loading}
        record={providerDetail}
        onClose={() => {
          providerDrawerLoader.cancel();
          providerState.setDrawerMode(null);
          setDictTypeDetail(null);
        }}
      />

      <LHDetailDrawer
        resource={llmModelsResource}
        open={modelState.drawerMode === "detail"}
        loading={modelDrawerLoader.loading}
        record={modelDetail}
        onClose={() => {
          modelDrawerLoader.cancel();
          modelState.setDrawerMode(null);
          setDictItemDetail(null);
        }}
      />

      <LHConfirmDialog {...confirmAction.dialogProps} />
    </AppPageContainer>
  );
}
