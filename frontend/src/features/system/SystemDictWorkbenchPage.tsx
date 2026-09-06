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
import { dictItemsResource, dictTypesResource } from "@/low-code-resources";
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

type DictTypeRecord = ResourceRecord;
type DictItemRecord = ResourceRecord;

async function fetchDictItemsByType(
  dictTypeId: string | number,
  query: EngineListQuery,
) {
  const payloadFilters = [
    ...(query.filters ?? []).filter((filter) => filter.field !== "dictTypeId"),
    { field: "dictTypeId", op: "eq" as const, value: String(dictTypeId) },
  ];
  return fetchEngineList<ResourceRecord>(dictItemsResource, {
    ...query,
    filters: payloadFilters,
  });
}

function dictTypeSummary(record: DictTypeRecord | null): string {
  if (!record) {
    return "请先在左侧选择一个字典类型";
  }
  return `${String(record.dictName ?? record.dictCode ?? "已选字典")} 下的字典项`;
}

function DictStatusBadge({
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

export function SystemDictWorkbenchPage() {
  const dictTypeState = useResourcePage(dictTypesResource, 20);
  const dictItemState = useResourcePage(dictItemsResource, 20);
  const workbenchRef = useRef<HTMLDivElement | null>(null);

  const [dictTypes, setDictTypes] = useState<DictTypeRecord[]>([]);
  const [dictTypesTotal, setDictTypesTotal] = useState(0);
  const [dictTypesLoading, setDictTypesLoading] = useState(false);

  const [dictItems, setDictItems] = useState<DictItemRecord[]>([]);
  const [dictItemsTotal, setDictItemsTotal] = useState(0);
  const [dictItemsLoading, setDictItemsLoading] = useState(false);
  const [dictItemsRefreshing, setDictItemsRefreshing] = useState(false);
  const dictItemsHasLoadedRef = useRef(false);
  const pendingStatusTogglesRef = useRef(new Map<string | number, string>());

  const [selectedDictType, setSelectedDictType] = useState<DictTypeRecord | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileItemsOpen, setMobileItemsOpen] = useState(false);

  const [dictTypeDetail, setDictTypeDetail] = useState<DictTypeRecord | null>(null);
  const [dictItemDetail, setDictItemDetail] = useState<DictItemRecord | null>(null);
  const confirmAction = useConfirmAction();
  const dictTypeDrawerLoader = useDrawerDetailLoader();
  const dictItemDrawerLoader = useDrawerDetailLoader();
  const dictTypesDictOptions = useResourceDictOptions(dictTypesResource);
  const dictItemsDictOptions = useResourceDictOptions(dictItemsResource);

  const dictTypeForm = useResourceForm(
    dictTypesResource,
    dictTypeState.drawerMode === "edit" ? "edit" : "create",
    dictTypeState.selectedRecord,
    dictTypeState.drawerMode === "create" || dictTypeState.drawerMode === "edit",
  );
  const dictItemForm = useResourceForm(
    dictItemsResource,
    dictItemState.drawerMode === "edit" ? "edit" : "create",
    dictItemState.selectedRecord,
    dictItemState.drawerMode === "create" || dictItemState.drawerMode === "edit",
  );

  const activeTypeId = selectedDictType?.[dictTypesResource.idKey] as string | number | undefined;
  const dictTypeTotalPages = getTotalPages(dictTypesTotal, dictTypeState.pageSize);
  const dictItemTotalPages = getTotalPages(dictItemsTotal, dictItemState.pageSize);

  function mergePendingStatusToggles(items: DictItemRecord[]): DictItemRecord[] {
    const pending = pendingStatusTogglesRef.current;
    if (pending.size === 0) {
      return items;
    }
    return items.map((item) => {
      const recordId = item[dictItemsResource.idKey] as string | number;
      const nextStatus = pending.get(recordId);
      return nextStatus ? { ...item, status: nextStatus } : item;
    });
  }

  const dictItemListQuery = useMemo<EngineListQuery>(
    () => ({
      ...dictItemState.listQuery,
      filters: [
        ...(dictItemState.listQuery.filters ?? []).filter((filter) => filter.field !== "dictTypeId"),
        ...(activeTypeId != null ? [{ field: "dictTypeId", op: "eq" as const, value: String(activeTypeId) }] : []),
      ],
    }),
    [activeTypeId, dictItemState.listQuery],
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
        setMobileItemsOpen(false);
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
    async function loadDictTypes() {
      setDictTypesLoading(true);
      try {
        const result = await fetchEngineList<DictTypeRecord>(dictTypesResource, dictTypeState.listQuery);
        if (!active) {
          return;
        }
        setDictTypes(result.data);
        setDictTypesTotal(result.total);
        setSelectedDictType((current) => {
          if (!result.data.length) {
            return null;
          }
          if (current) {
            const matched = result.data.find(
              (item) => item[dictTypesResource.idKey] === current[dictTypesResource.idKey],
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
    void loadDictTypes();
    return () => {
      active = false;
    };
  }, [dictTypeState.listQuery, dictTypeState.reloadToken]);


  useEffect(() => {
    dictItemsHasLoadedRef.current = false;
    pendingStatusTogglesRef.current.clear();
  }, [activeTypeId]);

  useEffect(() => {
    if (activeTypeId == null) {
      setDictItems([]);
      setDictItemsTotal(0);
      setDictItemsLoading(false);
      setDictItemsRefreshing(false);
      return;
    }
    const currentTypeId = activeTypeId;
    let active = true;
    async function loadDictItems() {
      const blocking = !dictItemsHasLoadedRef.current;
      if (blocking) {
        setDictItemsLoading(true);
      } else {
        setDictItemsRefreshing(true);
      }
      try {
        const result = await fetchDictItemsByType(currentTypeId, dictItemListQuery);
        if (!active) {
          return;
        }
        setDictItems(mergePendingStatusToggles(result.data));
        setDictItemsTotal(result.total);
        dictItemsHasLoadedRef.current = true;
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
    void loadDictItems();
    return () => {
      active = false;
    };
  }, [activeTypeId, dictItemListQuery, dictItemState.reloadToken]);

  useEffect(() => {
    dictItemState.setPage(1);
  }, [activeTypeId]);

  async function openDictTypeDetail(record: DictTypeRecord) {
    dictTypeState.setSelectedRecord(record);
    setDictTypeDetail(null);
    dictTypeState.setDrawerMode("detail");
    try {
      const detail = await dictTypeDrawerLoader.load(() =>
        fetchDetail<DictTypeRecord>(dictTypesResource, record[dictTypesResource.idKey] as string | number),
      );
      if (!detail) {
        return;
      }
      setDictTypeDetail(detail);
      dictTypeState.setSelectedRecord(detail);
    } catch (error) {
      appMessage.errorFrom(error, "加载详情失败");
      dictTypeState.setDrawerMode(null);
      dictTypeState.setSelectedRecord(null);
      setDictTypeDetail(null);
    }
  }

  async function openDictTypeEdit(record: DictTypeRecord) {
    dictTypeState.setSelectedRecord(record);
    dictTypeState.setDrawerMode("edit");
    try {
      const detail = await dictTypeDrawerLoader.load(() =>
        fetchDetail<DictTypeRecord>(dictTypesResource, record[dictTypesResource.idKey] as string | number),
      );
      if (!detail) {
        return;
      }
      dictTypeState.setSelectedRecord(detail);
    } catch (error) {
      appMessage.errorFrom(error, "加载编辑数据失败");
      dictTypeState.setDrawerMode(null);
      dictTypeState.setSelectedRecord(null);
    }
  }

  async function openDictItemDetail(record: DictItemRecord) {
    dictItemState.setSelectedRecord(record);
    setDictItemDetail(null);
    dictItemState.setDrawerMode("detail");
    try {
      const detail = await dictItemDrawerLoader.load(() =>
        fetchDetail<DictItemRecord>(dictItemsResource, record[dictItemsResource.idKey] as string | number),
      );
      if (!detail) {
        return;
      }
      setDictItemDetail(detail);
      dictItemState.setSelectedRecord(detail);
    } catch (error) {
      appMessage.errorFrom(error, "加载详情失败");
      dictItemState.setDrawerMode(null);
      dictItemState.setSelectedRecord(null);
      setDictItemDetail(null);
    }
  }

  async function openDictItemEdit(record: DictItemRecord) {
    dictItemState.setSelectedRecord(record);
    dictItemState.setDrawerMode("edit");
    try {
      const detail = await dictItemDrawerLoader.load(() =>
        fetchDetail<DictItemRecord>(dictItemsResource, record[dictItemsResource.idKey] as string | number),
      );
      if (!detail) {
        return;
      }
      dictItemState.setSelectedRecord(detail);
    } catch (error) {
      appMessage.errorFrom(error, "加载编辑数据失败");
      dictItemState.setDrawerMode(null);
      dictItemState.setSelectedRecord(null);
    }
  }

  async function submitDictTypeForm() {
    if (dictTypeState.drawerMode === "edit" && dictTypeState.selectedRecord) {
      await updateRecord<DictTypeRecord>(
        dictTypesResource,
        dictTypeState.selectedRecord[dictTypesResource.idKey] as string | number,
        dictTypeForm.values,
      );
    } else {
      await createRecord<DictTypeRecord>(dictTypesResource, dictTypeForm.values);
    }
    dictTypeState.setDrawerMode(null);
    dictTypeState.setSelectedRecord(null);
    dictTypeState.reload();
  }

  async function submitDictItemForm() {
    const nextValues = setValueAtPath(
      dictItemForm.values,
      "dictTypeId",
      String(activeTypeId ?? dictItemForm.values.dictTypeId ?? ""),
    );
    if (dictItemState.drawerMode === "edit" && dictItemState.selectedRecord) {
      await updateRecord<DictItemRecord>(
        dictItemsResource,
        dictItemState.selectedRecord[dictItemsResource.idKey] as string | number,
        nextValues,
      );
    } else {
      await createRecord<DictItemRecord>(dictItemsResource, nextValues);
    }
    dictItemState.setDrawerMode(null);
    dictItemState.setSelectedRecord(null);
    dictItemState.reload();
  }

  async function removeDictType(record: DictTypeRecord) {
    await deleteRecord(
      dictTypesResource,
      record[dictTypesResource.idKey] as string | number,
    );
    setSelectedDictType((current) =>
      current?.[dictTypesResource.idKey] === record[dictTypesResource.idKey] ? null : current,
    );
    dictTypeState.reload();
  }

  async function removeDictItem(record: DictItemRecord) {
    await deleteRecord(
      dictItemsResource,
      record[dictItemsResource.idKey] as string | number,
    );
    dictItemState.reload();
  }

  async function toggleDictItemStatus(record: DictItemRecord, actionKey: "enable" | "disable") {
    const action = dictItemsResource.actions?.find((item) => item.key === actionKey);
    if (!action) {
      return;
    }

    const recordId = record[dictItemsResource.idKey] as string | number;
    const nextStatus = actionKey === "enable" ? "ACTIVE" : "DISABLED";
    let rollbackItems: DictItemRecord[] = [];

    pendingStatusTogglesRef.current.set(recordId, nextStatus);
    setDictItems((current) => {
      rollbackItems = current;
      return current.map((item) =>
        item[dictItemsResource.idKey] === recordId ? { ...item, status: nextStatus } : item,
      );
    });

    try {
      await runResourceAction({
        resource: dictItemsResource,
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

  function openMobileItemsPanel(record: DictTypeRecord) {
    setSelectedDictType(record);
    setMobileItemsOpen(true);
  }

  const dictItemWorkspaceNode = (
    <section className="lh-dict-item-workspace">
      <div className="lh-dict-item-workspace-header">
        <div className="lh-dict-section-heading">
          <h2>字典项</h2>
          <p>{dictTypeSummary(selectedDictType)}</p>
        </div>
        <div className="lh-dict-item-workspace-actions">
          <button
            type="button"
            className="lh-primary-button"
            disabled={!selectedDictType}
            onClick={() => {
              if (!selectedDictType) {
                appMessage.info("请先选择一个字典类型");
                return;
              }
              dictItemState.setSelectedRecord({
                dictTypeId: String(selectedDictType[dictTypesResource.idKey]),
              });
              dictItemState.setDrawerMode("create");
            }}
          >
            新建字典项
          </button>
        </div>
      </div>

      <div className="lh-dict-workbench-query">
        <LHQueryBar
          schema={dictItemsResource.filters}
          values={dictItemState.filters}
          loading={dictItemsLoading}
          autoSubmit
          loadRemoteOptions={(source, keyword) => fetchRemoteOptions(dictItemsResource, source, keyword)}
          onChange={(key: string, value: unknown) => {
            dictItemState.setFilters((current) => ({ ...current, [key]: value }));
          }}
          onSubmit={(nextValues) => {
            dictItemState.submitFilters(nextValues);
          }}
        />
      </div>

      <div className={`lh-dict-items-table-shell${dictItemsRefreshing ? " is-refreshing" : ""}`}>
        {dictItemsRefreshing ? <div className="lh-table-refresh-bar" aria-hidden /> : null}
        <table className="lh-dict-items-table">
          <thead>
            <tr>
              <th>字典项编码</th>
              <th>字典项名称</th>
              <th>字典项值</th>
              <th>排序</th>
              <th>默认项</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {dictItemsLoading ? (
              <tr>
                <td colSpan={7}>加载中...</td>
              </tr>
            ) : dictItems.length === 0 ? (
              <tr>
                <td colSpan={7}>当前字典类型下暂无字典项</td>
              </tr>
            ) : (
              dictItems.map((record) => (
                <tr key={String(record[dictItemsResource.idKey])}>
                  <td title={String(record.itemCode ?? "")}>{String(record.itemCode ?? "-")}</td>
                  <td title={String(record.itemLabel ?? "")}>{String(record.itemLabel ?? "-")}</td>
                  <td title={String(record.itemValue ?? "")}>{String(record.itemValue ?? "-")}</td>
                  <td>{String(record.sortNo ?? "-")}</td>
                  <td>{record.isDefault ? "是" : "否"}</td>
                  <td>
                    <DictStatusBadge
                      value={record.status}
                      dictCode="common_status"
                      dictOptions={dictItemsDictOptions}
                    />
                  </td>
                  <td>
                    <div className="lh-dict-item-row-actions">
                      <button
                        type="button"
                        className="lh-secondary-button"
                        onClick={() => {
                          void openDictItemDetail(record);
                        }}
                      >
                        详情
                      </button>
                      <button
                        type="button"
                        className="lh-primary-button"
                        onClick={() => {
                          void openDictItemEdit(record);
                        }}
                      >
                        编辑
                      </button>
                      {record.status === "ACTIVE" ? (
                        <button
                          type="button"
                          className="lh-secondary-button"
                          onClick={() => {
                            void toggleDictItemStatus(record, "disable");
                          }}
                        >
                          禁用
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="lh-secondary-button"
                          onClick={() => {
                            void toggleDictItemStatus(record, "enable");
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
                            dictItemsResource.actions?.find((item) => item.key === "delete")!,
                            async () => {
                              await appMessage.promise(removeDictItem(record), {
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
          <span>第 {dictItemState.page} / {dictItemTotalPages} 页</span>
          <span>共 {dictItemsTotal} 条</span>
        </div>
        <div className="lh-table-footer-actions">
          <button
            type="button"
            className="lh-secondary-button"
            disabled={dictItemState.page <= 1}
            onClick={() => dictItemState.setPage(dictItemState.page - 1)}
          >
            上一页
          </button>
          <button
            type="button"
            className="lh-secondary-button"
            disabled={dictItemState.page >= dictItemTotalPages}
            onClick={() => dictItemState.setPage(dictItemState.page + 1)}
          >
            下一页
          </button>
        </div>
      </div>
    </section>
  );

  return (
    <AppPageContainer
      title="字典配置"
      description="左侧选择字典类型，右侧同步维护该类型下的字典项。编辑与详情仍统一走抽屉，避免在多个页面之间来回跳转。"
     >
      <div ref={workbenchRef} className="lh-dict-workbench">
        <section className="lh-dict-type-rail">
          <div className="lh-dict-type-rail-header">
            <div className="lh-dict-section-heading">
              <h2>字典类型</h2>
              <p>点击左侧条目，右侧字典项会立即同步。</p>
            </div>
            <button
              type="button"
              className="lh-primary-button lh-dict-type-create-button"
              onClick={() => {
                dictTypeState.setSelectedRecord(null);
                dictTypeState.setDrawerMode("create");
              }}
            >
              新建类型
            </button>
          </div>

          <div className="lh-dict-workbench-query">
            <LHQueryBar
              schema={dictTypesResource.filters}
              values={dictTypeState.filters}
              loading={dictTypesLoading}
              autoSubmit
              loadRemoteOptions={(source, keyword) => fetchRemoteOptions(dictTypesResource, source, keyword)}
              onChange={(key: string, value: unknown) => {
                dictTypeState.setFilters((current) => ({ ...current, [key]: value }));
              }}
              onSubmit={(nextValues) => {
                dictTypeState.submitFilters(nextValues);
              }}
            />
          </div>

          <div className="lh-dict-type-list">
            {dictTypesLoading ? <div className="lh-dict-type-empty">加载中...</div> : null}
            {!dictTypesLoading && dictTypes.length === 0 ? <div className="lh-dict-type-empty">暂无字典类型</div> : null}
            {!dictTypesLoading
              ? dictTypes.map((record) => {
                  const selected =
                    selectedDictType?.[dictTypesResource.idKey] === record[dictTypesResource.idKey];
                  return (
                    <div
                      key={String(record[dictTypesResource.idKey])}
                      role="button"
                      tabIndex={0}
                      className={`lh-dict-type-item ${selected ? "is-active" : ""}`}
                      onClick={() => {
                        if (isMobile) {
                          openMobileItemsPanel(record);
                          return;
                        }
                        setSelectedDictType(record);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") {
                          return;
                        }
                        event.preventDefault();
                        if (isMobile) {
                          openMobileItemsPanel(record);
                          return;
                        }
                        setSelectedDictType(record);
                      }}
                    >
                      <div className="lh-dict-type-item-main">
                        <div className="lh-dict-type-item-title-row">
                          <strong title={String(record.dictName ?? record.dictCode ?? "")}>
                            {String(record.dictName ?? record.dictCode ?? "-")}
                          </strong>
                          <DictStatusBadge
                            value={record.status}
                            dictCode="common_status"
                            dictOptions={dictTypesDictOptions}
                          />
                        </div>
                        <span className="lh-dict-type-item-code" title={String(record.dictCode ?? "")}>
                          {String(record.dictCode ?? "-")}
                        </span>
                        <p title={String(record.remark ?? "")}>
                          {String(record.remark ?? "暂无备注")}
                        </p>
                      </div>
                      <div className="lh-dict-type-item-actions">
                        <button
                          type="button"
                          className="lh-secondary-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void openDictTypeDetail(record);
                          }}
                        >
                          详情
                        </button>
                        <button
                          type="button"
                          className="lh-primary-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void openDictTypeEdit(record);
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
                              dictTypesResource.actions?.find((item) => item.key === "delete")!,
                              async () => {
                                await appMessage.promise(removeDictType(record), {
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
              <span>第 {dictTypeState.page} / {dictTypeTotalPages} 页</span>
              <span>共 {dictTypesTotal} 条</span>
            </div>
            <div className="lh-table-footer-actions">
              <button
                type="button"
                className="lh-secondary-button"
                disabled={dictTypeState.page <= 1}
                onClick={() => dictTypeState.setPage(dictTypeState.page - 1)}
              >
                上一页
              </button>
              <button
                type="button"
                className="lh-secondary-button"
                disabled={dictTypeState.page >= dictTypeTotalPages}
                onClick={() => dictTypeState.setPage(dictTypeState.page + 1)}
              >
                下一页
              </button>
            </div>
          </div>
        </section>
        {!isMobile ? dictItemWorkspaceNode : null}
      </div>

      {isMobile ? (
        <aside
          className={`lh-mobile-dict-items-overlay ${mobileItemsOpen ? "" : "lh-mobile-dict-items-overlay--hidden"}`}
          onClick={() => setMobileItemsOpen(false)}
        >
          <section
            className={`lh-mobile-dict-items-panel ${mobileItemsOpen ? "" : "lh-mobile-dict-items-panel--hidden"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="lh-mobile-dict-items-panel-header">
              <button
                type="button"
                className="lh-secondary-button"
                onClick={() => setMobileItemsOpen(false)}
              >
                <ChevronLeft className="h-4 w-4" />
                返回
              </button>
              <div className="lh-mobile-dict-items-panel-heading">
                <strong>{String(selectedDictType?.dictName ?? selectedDictType?.dictCode ?? "字典项")}</strong>
                <span>{dictTypeSummary(selectedDictType)}</span>
              </div>
              <button
                type="button"
                className="lh-secondary-button"
                onClick={() => setMobileItemsOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="lh-mobile-dict-items-panel-body">
              {dictItemWorkspaceNode}
            </div>
          </section>
        </aside>
      ) : null}

      <LHFormDrawer
        resource={dictTypesResource}
        mode={dictTypeState.drawerMode === "edit" ? "edit" : "create"}
        open={dictTypeState.drawerMode === "create" || dictTypeState.drawerMode === "edit"}
        loading={dictTypeState.drawerMode === "edit" && dictTypeDrawerLoader.loading}
        values={dictTypeForm.values}
        onChange={(key: string, value: unknown) =>
          dictTypeForm.setValues((currentValues) => setValueAtPath(currentValues, key, value))
        }
        onClose={() => {
          dictTypeDrawerLoader.cancel();
          dictTypeState.setDrawerMode(null);
          dictTypeState.setSelectedRecord(null);
        }}
        onSubmit={async () => {
          await appMessage.promise(submitDictTypeForm(), {
            loading: "提交中...",
            success: "保存成功",
            error: "保存失败",
          });
        }}
        loadRemoteOptions={(source, keyword) => fetchRemoteOptions(dictTypesResource, source, keyword)}
      />

      <LHFormDrawer
        resource={dictItemsResource}
        mode={dictItemState.drawerMode === "edit" ? "edit" : "create"}
        open={dictItemState.drawerMode === "create" || dictItemState.drawerMode === "edit"}
        loading={dictItemState.drawerMode === "edit" && dictItemDrawerLoader.loading}
        values={dictItemForm.values}
        onChange={(key: string, value: unknown) =>
          dictItemForm.setValues((currentValues) => setValueAtPath(currentValues, key, value))
        }
        onClose={() => {
          dictItemDrawerLoader.cancel();
          dictItemState.setDrawerMode(null);
          dictItemState.setSelectedRecord(null);
        }}
        onSubmit={async () => {
          await appMessage.promise(submitDictItemForm(), {
            loading: "提交中...",
            success: "保存成功",
            error: "保存失败",
          });
        }}
        loadRemoteOptions={(source, keyword) => fetchRemoteOptions(dictItemsResource, source, keyword)}
      />

      <LHDetailDrawer
        resource={dictTypesResource}
        open={dictTypeState.drawerMode === "detail"}
        loading={dictTypeDrawerLoader.loading}
        record={dictTypeDetail}
        onClose={() => {
          dictTypeDrawerLoader.cancel();
          dictTypeState.setDrawerMode(null);
          setDictTypeDetail(null);
        }}
      />

      <LHDetailDrawer
        resource={dictItemsResource}
        open={dictItemState.drawerMode === "detail"}
        loading={dictItemDrawerLoader.loading}
        record={dictItemDetail}
        onClose={() => {
          dictItemDrawerLoader.cancel();
          dictItemState.setDrawerMode(null);
          setDictItemDetail(null);
        }}
      />

      <LHConfirmDialog {...confirmAction.dialogProps} />
    </AppPageContainer>
  );
}
