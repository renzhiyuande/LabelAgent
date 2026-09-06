import { ChevronRight, FolderTree, MoreHorizontal, Plus } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppPageContainer } from "../../app/layout/AppPageContainer";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { appMessage } from "../../lib/message";
import {
  createRecord,
  fetchDetail,
  fetchEngineList,
  fetchRemoteOptions,
  LHConfirmDialog,
  LHDetailDrawer,
  LHFormDrawer,
  LHPagination,
  runResourceAction,
  updateRecord,
} from "@/low-code";
import { useResourcePage } from "@/low-code/hooks/use-resource-page";
import { useConfirmAction } from "@/low-code/hooks/use-confirm-action";
import { useDrawerDetailLoader } from "@/low-code/hooks/use-drawer-detail-loader";
import { useResourceForm } from "@/low-code/hooks/use-resource-form";
import type { ActionSchema, ResourceMeta, TableColumnSchema } from "@/low-code/schema/types";
import type { ResourceRecord } from "@/low-code/types";
import { formatFieldValue } from "@/low-code/utils/formatters";
import { findDictOption, resolveDictLabel, resolveDictTagClassName, toneToBadgeVariant } from "@/low-code/utils/dict-display";
import { setValueAtPath } from "@/low-code/utils/object-path";
import { useResourceDictOptions } from "@/low-code/hooks/use-resource-dict-options";
import { hasPermission } from "@/low-code/utils/permissions";
import { evaluateConditions } from "@/low-code/utils/visibility";
import { resolveTableColumnCellClassName, resolveTableColumnStyle } from "@/low-code/utils/table-column-style";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../stores/auth";

type TreeNodeRecord = ResourceRecord & {
  id: string | number;
  children: TreeNodeRecord[];
  depth: number;
};

function flattenNestedRecords(records: ResourceRecord[]): ResourceRecord[] {
  const result: ResourceRecord[] = [];
  function visit(record: ResourceRecord) {
    result.push({ ...record, children: [] });
    const children = Array.isArray(record.children) ? (record.children as ResourceRecord[]) : [];
    for (const child of children) {
      visit(child);
    }
  }
  for (const record of records) {
    visit(record);
  }
  return result;
}

function buildTree(records: ResourceRecord[], resource: ResourceMeta): TreeNodeRecord[] {
  const treeConfig = resource.page?.tree;
  if (!treeConfig) {
    return [];
  }

  const idKey = resource.idKey;
  const parentField = treeConfig.parentField;
  const nodeMap = new Map<string, TreeNodeRecord>();

  for (const record of records) {
    const id = record[idKey];
    if (id == null) {
      continue;
    }
    nodeMap.set(String(id), {
      ...record,
      id: id as string | number,
      children: [],
      depth: 0,
    });
  }

  const roots: TreeNodeRecord[] = [];
  for (const record of records) {
    const id = record[idKey];
    if (id == null) {
      continue;
    }
    const node = nodeMap.get(String(id));
    if (!node) {
      continue;
    }
    const parentId = record[parentField];
    const parent = parentId == null || parentId === "" || Number(parentId) <= 0
      ? null
      : nodeMap.get(String(parentId));
    if (!parent) {
      roots.push(node);
      continue;
    }
    node.depth = parent.depth + 1;
    parent.children.push(node);
  }

  function sortNodes(nodes: TreeNodeRecord[]) {
    const defaultSort = resource.table!.defaultSort;
    nodes.sort((left, right) => {
      if (defaultSort) {
        const leftValue = left[defaultSort.field];
        const rightValue = right[defaultSort.field];
        if (leftValue !== rightValue) {
          const delta = Number(leftValue ?? 0) - Number(rightValue ?? 0);
          return defaultSort.order === "desc" ? -delta : delta;
        }
      }
      return String(left[idKey] ?? "").localeCompare(String(right[idKey] ?? ""));
    });
    for (const node of nodes) {
      for (const child of node.children) {
        child.depth = node.depth + 1;
      }
      sortNodes(node.children);
    }
  }

  sortNodes(roots);
  return roots;
}

function flattenVisibleTree(nodes: TreeNodeRecord[], expandedKeys: Set<string>): TreeNodeRecord[] {
  const result: TreeNodeRecord[] = [];
  function visit(node: TreeNodeRecord) {
    result.push(node);
    if (!node.children.length || !expandedKeys.has(String(node.id))) {
      return;
    }
    for (const child of node.children) {
      visit(child);
    }
  }
  for (const node of nodes) {
    visit(node);
  }
  return result;
}

function toneForStatus(value: unknown): "success" | "secondary" {
  return value === "ACTIVE" ? "success" : "secondary";
}

function resolveStatusCell(
  column: TableColumnSchema,
  rawValue: unknown,
  dictOptions: Record<string, import("@/low-code/schema/types").OptionItem[]>,
) {
  if (column.dict) {
    const matched = findDictOption(dictOptions[column.dict], rawValue);
    return (
      <span className={resolveDictTagClassName(matched)}>
        {resolveDictLabel(matched, rawValue)}
      </span>
    );
  }
  if (column.enum?.length) {
    const matched = column.enum.find((item) => String(item.value) === String(rawValue ?? ""));
    if (matched) {
      return <Badge variant={toneToBadgeVariant(matched.tone)}>{matched.label}</Badge>;
    }
  }
  return <Badge variant={toneForStatus(rawValue)}>{String(rawValue ?? "-")}</Badge>;
}

interface TreeRowActionItem {
  key: string;
  label: string;
  variant: "default" | "outline" | "ghost";
  onClick: () => void;
}

function TreeRowActions({ actions }: { actions: TreeRowActionItem[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const measureMoreButtonRef = useRef<HTMLButtonElement | null>(null);
  const [inlineCount, setInlineCount] = useState(actions.length);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const measure = () => {
      if (actions.length === 0) {
        setInlineCount(0);
        return;
      }

      const measureRoot = measureRef.current;
      const nextWidth = Math.floor(container.getBoundingClientRect().width);
      if (!measureRoot || nextWidth <= 0) {
        return;
      }

      const gap = Number.parseFloat(window.getComputedStyle(measureRoot).gap || "8") || 8;
      const widths = actions.map((action) => {
        const element = measureRoot.querySelector<HTMLElement>(`[data-measure-action="${action.key}"]`);
        return Math.ceil(element?.getBoundingClientRect().width ?? 0);
      });
      const moreWidth = Math.ceil(
        measureMoreButtonRef.current?.getBoundingClientRect().width
          ?? moreButtonRef.current?.getBoundingClientRect().width
          ?? 40,
      );
      const SAFETY = 8;

      let used = 0;
      let count = 0;
      for (let index = 0; index < widths.length; index += 1) {
        const width = widths[index];
        const remaining = widths.length - (index + 1);
        const needMoreButton = remaining > 0;
        const nextUsed = used + (count > 0 ? gap : 0) + width;
        const reserved = needMoreButton ? gap + moreWidth : 0;
        if (nextUsed + reserved + SAFETY > nextWidth) {
          break;
        }
        used = nextUsed;
        count += 1;
      }

      if (count === 0 && actions.length > 0) {
        setInlineCount(1);
        return;
      }
      setInlineCount(count);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [actions]);

  const inlineActions = actions.slice(0, inlineCount);
  const overflowActions = actions.slice(inlineCount);

  return (
    <>
      <div ref={containerRef} className="lh-action-group flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-hidden">
        {inlineActions.map((action) => (
          <Button
            key={action.key}
            type="button"
            variant={action.variant}
            size="sm"
            className="shrink-0 whitespace-nowrap"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
        {overflowActions.length ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button ref={moreButtonRef} type="button" variant="outline" size="icon" className="shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {overflowActions.map((action) => (
                <DropdownMenuItem key={action.key} onClick={action.onClick}>
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <div ref={measureRef} className="pointer-events-none absolute -left-[9999px] top-0 flex gap-2 opacity-0">
        {actions.map((action) => (
          <Button
            key={action.key}
            type="button"
            variant={action.variant}
            size="sm"
            className="shrink-0 whitespace-nowrap"
            data-measure-action={action.key}
            tabIndex={-1}
          >
            {action.label}
          </Button>
        ))}
        <Button
          ref={measureMoreButtonRef}
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          tabIndex={-1}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}

export function SystemTreeResourcePage({
  resource,
  reloadToken = 0,
}: {
  resource: ResourceMeta;
  reloadToken?: number;
}) {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.currentUser);
  const treeConfig = resource.page?.tree;
  const state = useResourcePage(resource, 20);
  const [records, setRecords] = useState<ResourceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [detailRecord, setDetailRecord] = useState<ResourceRecord | null>(null);
  const confirmAction = useConfirmAction();
  const drawerLoader = useDrawerDetailLoader();
  const form = useResourceForm(
    resource,
    state.drawerMode === "edit" ? "edit" : "create",
    state.selectedRecord,
    state.drawerMode === "create" || state.drawerMode === "edit",
  );
  const dictOptions = useResourceDictOptions(resource);

  const tree = useMemo(() => buildTree(records, resource), [records, resource]);
  const visibleNodes = useMemo(() => flattenVisibleTree(tree, expandedKeys), [expandedKeys, tree]);

  useEffect(() => {
    let active = true;
    async function loadRecords() {
      setLoading(true);
      try {
        const result = await fetchEngineList<ResourceRecord>(resource, {
          page: state.page,
          pageSize: state.pageSize,
          filters: state.listQuery.filters ?? [],
          sort: state.listQuery.sort ?? [],
        });
        if (!active) {
          return;
        }
        const nextRecords = flattenNestedRecords(result.data);
        setRecords(nextRecords);
        setTotal(result.total);
        setExpandedKeys(
          treeConfig?.defaultExpanded === false
            ? new Set()
            : new Set(nextRecords.map((item) => String(item[resource.idKey]))),
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    void loadRecords();
    return () => {
      active = false;
    };
  }, [resource, state.listQuery.filters, state.listQuery.sort, state.page, state.pageSize, state.reloadToken, reloadToken, treeConfig?.defaultExpanded]);

  if (!treeConfig) {
    return null;
  }

  if (!hasPermission(currentUser, resource.permissions?.page)) {
    navigate("/", { replace: true });
    return null;
  }

  const treePageConfig = treeConfig;
  const canCreate = resource.capabilities?.create !== false;
  const canEdit = resource.capabilities?.edit !== false && resource.form.sections.length > 0;
  const canDetail = resource.capabilities?.detail !== false && Boolean(resource.detail);
  const visibleColumns = resource.table!.columns.filter(
    (column) => column.visible !== false && hasPermission(currentUser, column.permission),
  );

  async function openCreate(parent?: ResourceRecord | null) {
    state.setSelectedRecord(
      parent
        ? {
            [treePageConfig.parentField]: parent[resource.idKey],
          }
        : {
            [treePageConfig.parentField]: 0,
          },
    );
    state.setDrawerMode("create");
  }

  async function openEdit(record: ResourceRecord) {
    state.setSelectedRecord(record);
    state.setDrawerMode("edit");
    try {
      const detail = await drawerLoader.load(() =>
        fetchDetail<ResourceRecord>(resource, record[resource.idKey] as string | number),
      );
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

  async function openDetail(record: ResourceRecord) {
    state.setSelectedRecord(record);
    setDetailRecord(null);
    state.setDrawerMode("detail");
    try {
      const detail = await drawerLoader.load(() =>
        fetchDetail<ResourceRecord>(resource, record[resource.idKey] as string | number),
      );
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

  async function submitForm() {
    if (state.drawerMode === "edit" && state.selectedRecord) {
      await updateRecord<ResourceRecord>(
        resource,
        state.selectedRecord[resource.idKey] as string | number,
        form.values,
      );
    } else {
      await createRecord<ResourceRecord>(resource, form.values);
    }
    state.setDrawerMode(null);
    state.setSelectedRecord(null);
    state.reload();
  }

  async function handleAction(action: ActionSchema, record: ResourceRecord) {
    await confirmAction.openOrRunAction(action, async () => {
      await runResourceAction({ resource, action, record });
      state.reload();
    }, record);
  }

  const treeColumnKey = treeConfig.treeColumnKey;
  const treeColumn = visibleColumns.find((column) => column.key === treeColumnKey) ?? visibleColumns[0];

  function renderCell(column: TableColumnSchema, node: TreeNodeRecord) {
    if (!evaluateConditions(node, column.visibleWhen)) {
      return "-";
    }
    const rawValue = node[column.key];
    if (column.type === "status") {
      return resolveStatusCell(column, rawValue, dictOptions);
    }
    if (column.dict) {
      const matched = findDictOption(dictOptions[column.dict], rawValue);
      return <span className="truncate">{resolveDictLabel(matched, rawValue)}</span>;
    }
    if (column.key === treeColumn.key) {
      return (
        <div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: `${node.depth * 18}px` }}>
          {node.children.length ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => {
                setExpandedKeys((current) => {
                  const next = new Set(current);
                  const key = String(node.id);
                  if (next.has(key)) {
                    next.delete(key);
                  } else {
                    next.add(key);
                  }
                  return next;
                });
              }}
            >
              <ChevronRight
                className={cn("h-4 w-4 transition-transform", expandedKeys.has(String(node.id)) ? "rotate-90" : "")}
              />
            </Button>
          ) : (
            <span className="inline-flex h-7 w-7 items-center justify-center text-slate-300">•</span>
          )}
          <span className="truncate font-medium text-slate-900 dark:text-slate-100">
            {formatFieldValue({ type: column.type, formatter: column.formatter }, rawValue)}
          </span>
        </div>
      );
    }
    return <span className="truncate">{formatFieldValue({ type: column.type, formatter: column.formatter }, rawValue)}</span>;
  }

  return (
    <AppPageContainer
      title={`${resource.label}管理`}
      description={`当前资源使用树形页面渲染，复用 ${resource.resource} 的标准 lowcode query/action/options 与表单 schema。`}
      extra={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => appMessage.info("树页来自 resource.page.tree 配置，默认资源页仍然走通用表格。")}
          >
            查看说明
          </Button>
          {canCreate ? (
            <Button size="sm" onClick={() => void openCreate(null)}>
              <Plus className="mr-2 h-4 w-4" />
              新建{resource.label}
            </Button>
          ) : null}
        </div>
      }
    >
      <Card className="flex min-h-0 flex-1 flex-col rounded-[28px] border-white/70 bg-white/82 shadow-[0_18px_45px_rgba(148,163,184,0.14)] dark:border-border/70 dark:bg-card/72 dark:shadow-[0_18px_45px_hsl(var(--background)/0.42)]">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-blue-500" />
                {resource.label}树
              </CardTitle>
              <CardDescription>树形表格完整复用 `table.columns`，仅由一列负责层级展开。</CardDescription>
            </div>
            <Badge variant="secondary">{records.length} 个节点</Badge>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-auto p-0">
          <div className="min-w-[1080px]">
            {loading ? (
              <div className="px-6 py-8 text-sm text-slate-500">加载中...</div>
            ) : !visibleNodes.length ? (
              <div className="px-6 py-8 text-sm text-slate-500">暂无数据</div>
            ) : (
              <table className="lh-table">
                <thead>
                  <tr>
                    {visibleColumns.map((column) => (
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
                            if (column.sortable) {
                              state.setSort((current) => {
                                const active = current[0];
                                if (!active || active.field !== column.key) {
                                  return [{ field: column.key, order: "asc" }];
                                }
                                return [{ field: column.key, order: active.order === "asc" ? "desc" : "asc" }];
                              });
                            }
                          }}
                        >
                          <span>{column.title}</span>
                        </Button>
                      </th>
                    ))}
                    <th className="lh-table-actions-column">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleNodes.map((node) => (
                    (() => {
                      const rowActions: Array<{
                        key: string;
                        label: string;
                        variant: "default" | "outline" | "ghost";
                        onClick: () => void;
                      }> = [];

                      if (canDetail) {
                        rowActions.push({
                          key: "detail",
                          label: "详情",
                          variant: "outline",
                          onClick: () => void openDetail(node),
                        });
                      }

                      if (canEdit) {
                        rowActions.push({
                          key: "edit",
                          label: "编辑",
                          variant: "default",
                          onClick: () => void openEdit(node),
                        });
                      }

                      if (canCreate) {
                        rowActions.push({
                          key: "create-child",
                          label: "新增子节点",
                          variant: "outline",
                          onClick: () => void openCreate(node),
                        });
                      }

                      for (const action of (resource.actions ?? [])
                        .filter((action: ActionSchema) => action.key !== "create")
                        .filter((action: ActionSchema) => hasPermission(currentUser, action.permission))
                        .filter((action: ActionSchema) => evaluateConditions(node, action.visibleWhen))) {
                        rowActions.push({
                          key: action.key,
                          label: action.label,
                          variant: action.kind === "danger" ? "outline" : "ghost",
                          onClick: () => void handleAction(action, node),
                        });
                      }

                      return (
                        <tr key={String(node.id)}>
                          {visibleColumns.map((column) => (
                            <td
                              key={column.key}
                              className={resolveTableColumnCellClassName(column)}
                              style={resolveTableColumnStyle(column)}
                            >
                              {renderCell(column, node)}
                            </td>
                          ))}
                          <td className="lh-table-actions-column">
                            <TreeRowActions actions={rowActions} />
                          </td>
                        </tr>
                      );
                    })()
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
        {resource.table!.pagination ? (
          <LHPagination
            total={total}
            page={state.page}
            pageSize={state.pageSize}
            onPageChange={state.setPage}
            onPageSizeChange={state.setPageSize}
          />
        ) : null}
      </Card>

      <LHFormDrawer
        resource={resource}
        mode={state.drawerMode === "edit" ? "edit" : "create"}
        open={state.drawerMode === "create" || state.drawerMode === "edit"}
        loading={state.drawerMode === "edit" && drawerLoader.loading}
        values={form.values}
        onChange={(key, value) => {
          form.setValues((current) => setValueAtPath(current, key, value));
        }}
        onClose={() => {
          drawerLoader.cancel();
          state.setDrawerMode(null);
          state.setSelectedRecord(null);
        }}
        onSubmit={async () => {
          await appMessage.promise(submitForm(), {
            loading: "保存中...",
            success: "保存成功",
            error: "保存失败",
          });
        }}
        loadRemoteOptions={(source, keyword) => fetchRemoteOptions(resource, source, keyword)}
      />

      <LHDetailDrawer
        resource={resource}
        open={state.drawerMode === "detail"}
        loading={drawerLoader.loading}
        record={detailRecord}
        onClose={() => {
          drawerLoader.cancel();
          state.setDrawerMode(null);
          setDetailRecord(null);
        }}
      />

      <LHConfirmDialog {...confirmAction.dialogProps} />
    </AppPageContainer>
  );
}
