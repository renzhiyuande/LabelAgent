"use client";

import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import type { FilterSchema, OptionItem } from "../../schema/types";
import { hasPermission } from "../../utils/permissions";
import type { AuthenticatedUser } from "../../lib/types";
import { SharedField } from "../fields/SharedField";
import { defaultFilterValue, toQueryFieldViewModel } from "../fields/adapters/query-field";

interface QueryBarProps {
  schema: FilterSchema;
  currentUser?: AuthenticatedUser | null;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onSubmit: (nextValues?: Record<string, unknown>) => void;
  loadRemoteOptions?: (source: string, keyword?: string) => Promise<OptionItem[]>;
  loading?: boolean;
  autoSubmit?: boolean;
  hideFilters?: string[];
}

function sameStringArray(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function renderField(
  field: FilterSchema["fields"][number],
  options: OptionItem[],
  searchValue: string,
  value: unknown,
  onChange: (value: unknown) => void,
  onSearchChange: (keyword: string) => void,
  props?: {
    hidden?: boolean;
    queryProps?: React.HTMLAttributes<HTMLDivElement> & {
      "data-query-field-key"?: string;
    };
  },
) {
  return (
    <SharedField
      key={field.key}
      model={toQueryFieldViewModel(field, value, options, searchValue)}
      className={props?.hidden ? "lh-query-item--hidden" : undefined}
      queryProps={props?.queryProps}
      handlers={{
        onChange,
        onSearchChange: field.component === "remoteSelect" ? onSearchChange : undefined,
      }}
    />
  );
}

export function LHQueryBar({
  schema,
  currentUser = null,
  values,
  onChange,
  onSubmit,
  loadRemoteOptions,
  loading = false,
  autoSubmit = false,
  hideFilters = [],
}: QueryBarProps) {
  const visibleFields = useMemo(() => {
    const hidden = new Set(hideFilters);
    return schema.fields.filter(
      (field) => !hidden.has(field.key) && hasPermission(currentUser, field.permission),
    );
  }, [currentUser, hideFilters, schema.fields]);
  const hasSearchFields = visibleFields.length > 0;
  const [mobileMode, setMobileMode] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopExpanded, setDesktopExpanded] = useState(false);
  const [desktopOverflow, setDesktopOverflow] = useState(false);
  const [collapsedFieldKeys, setCollapsedFieldKeys] = useState<string[]>([]);
  const [remoteOptions, setRemoteOptions] = useState<Record<string, OptionItem[]>>({});
  const [remoteKeywords, setRemoteKeywords] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement | null>(null);
  const suppressAutoSubmitRef = useRef(false);
  const skipInitialAutoSubmitRef = useRef(true);
  const measuringRef = useRef(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const collapsedFieldKeysRef = useRef<string[]>([]);
  const desktopOverflowRef = useRef(false);
  const loadRemoteOptionsRef = useRef(loadRemoteOptions);
  const onSubmitRef = useRef(onSubmit);

  loadRemoteOptionsRef.current = loadRemoteOptions;
  onSubmitRef.current = onSubmit;

  function submitExplicitly(nextValues?: Record<string, unknown>) {
    suppressAutoSubmitRef.current = true;
    onSubmit(nextValues);
  }

  const collapseConfig = useMemo(() => {
    if (schema.collapsible === false) {
      return null;
    }
    if (schema.collapsible === true || schema.collapsible == null) {
      return {
        mode: "auto" as const,
        defaultExpanded: false,
        collapsedRows: 1,
        collapsedFields: schema.primary ?? [],
      };
    }
    return {
      mode: schema.collapsible.mode ?? "auto",
      defaultExpanded: schema.collapsible.defaultExpanded ?? false,
      collapsedRows: schema.collapsible.collapsedRows ?? 1,
      collapsedFields: schema.collapsible.collapsedFields ?? schema.primary ?? [],
    };
  }, [schema.collapsible, schema.primary]);

  useEffect(() => {
    setDesktopExpanded(collapseConfig?.defaultExpanded ?? false);
  }, [collapseConfig?.defaultExpanded]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => {
      setMobileMode(media.matches);
      if (!media.matches) {
        setMobileOpen(false);
      }
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const fetcher = loadRemoteOptionsRef.current;
    if (!fetcher) {
      setRemoteOptions({});
      return;
    }
    const remoteFields = visibleFields.filter((field) => field.component === "remoteSelect" && field.remote?.source);
    const dictFields = visibleFields.filter((field) => field.dict);
    if (!remoteFields.length && !dictFields.length) {
      setRemoteOptions({});
      return;
    }
    let active = true;
    async function loadAll() {
      const doFetch = fetcher!;
      const entries = await Promise.all([
        ...remoteFields.map(async (field) => {
          const keyword = remoteKeywords[field.key];
          const options = await doFetch(field.remote!.source, keyword);
          return [field.key, options] as const;
        }),
        ...dictFields.map(async (field) => {
          const options = await doFetch(`dict:${field.dict}`, undefined);
          return [field.key, options] as const;
        }),
      ]);
      if (active) {
        setRemoteOptions(Object.fromEntries(entries));
      }
    }
    void loadAll();
    return () => {
      active = false;
    };
  }, [remoteKeywords, visibleFields]);

  useEffect(() => {
    if (!autoSubmit || mobileMode) {
      return;
    }
    if (suppressAutoSubmitRef.current) {
      suppressAutoSubmitRef.current = false;
      return;
    }
    if (skipInitialAutoSubmitRef.current) {
      skipInitialAutoSubmitRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      onSubmitRef.current();
    }, 260);
    return () => window.clearTimeout(timer);
  }, [autoSubmit, mobileMode, values]);

  useLayoutEffect(() => {
    if (mobileMode || !collapseConfig || !formRef.current) {
      desktopOverflowRef.current = false;
      collapsedFieldKeysRef.current = [];
      setDesktopOverflow((current) => (current ? false : current));
      setCollapsedFieldKeys((current) => (current.length === 0 ? current : []));
      return;
    }

    const applyMeasureResult = (overflow: boolean, nextCollapsedKeys: string[]) => {
      if (desktopOverflowRef.current !== overflow) {
        desktopOverflowRef.current = overflow;
        setDesktopOverflow(overflow);
      }
      if (!sameStringArray(collapsedFieldKeysRef.current, nextCollapsedKeys)) {
        collapsedFieldKeysRef.current = nextCollapsedKeys;
        setCollapsedFieldKeys(nextCollapsedKeys);
      }
    };

    const measure = () => {
      if (measuringRef.current) {
        return;
      }

      const form = formRef.current;
      if (!form) {
        return;
      }

      measuringRef.current = true;

      // 断开 ResizeObserver 避免 classList 切换导致自身递归 → 无限循环
      const ro = resizeObserverRef.current;
      if (ro) {
        ro.disconnect();
      }

      const hiddenElements = Array.from(form.querySelectorAll<HTMLElement>(".lh-query-item--hidden"));
      for (const element of hiddenElements) {
        element.classList.remove("lh-query-item--hidden");
      }

      try {
        const fieldElements = Array.from(form.querySelectorAll<HTMLElement>("[data-query-field-key]"));
        if (!fieldElements.length) {
          applyMeasureResult(false, []);
          return;
        }

        const topPositions = Array.from(new Set(fieldElements.map((element) => element.offsetTop))).sort(
          (a, b) => a - b,
        );
        const maxRows = Math.max(1, collapseConfig.collapsedRows);
        const hasOverflow = topPositions.length > maxRows;
        const nextOverflow = hasOverflow || collapseConfig.mode === "always";

        if (!hasOverflow && collapseConfig.mode !== "always") {
          applyMeasureResult(false, []);
          return;
        }

        const collapseTop = topPositions[Math.min(maxRows - 1, topPositions.length - 1)];
        const preferredKeys = new Set(collapseConfig.collapsedFields);
        const preferredCollapseKeys = fieldElements
          .filter((element) => !preferredKeys.has(element.dataset.queryFieldKey ?? ""))
          .map((element) => {
            const key = element.dataset.queryFieldKey;
            return key && element.offsetTop > collapseTop ? key : null;
          })
          .filter((key): key is string => Boolean(key));

        if (preferredKeys.size > 0) {
          const fallbackKeys = fieldElements
            .map((element) => {
              const key = element.dataset.queryFieldKey;
              return key && element.offsetTop > collapseTop ? key : null;
            })
            .filter((key): key is string => Boolean(key));
          applyMeasureResult(nextOverflow, preferredCollapseKeys.length ? preferredCollapseKeys : fallbackKeys);
          return;
        }

        applyMeasureResult(
          nextOverflow,
          fieldElements
            .map((element) => {
              const key = element.dataset.queryFieldKey;
              return key && element.offsetTop > collapseTop ? key : null;
            })
            .filter((key): key is string => Boolean(key)),
        );
      } finally {
        for (const element of hiddenElements) {
          element.classList.add("lh-query-item--hidden");
        }
        // classList 已恢复，重新连接 ResizeObserver
        if (ro) {
          const formEl = formRef.current;
          if (formEl) {
            const fieldsContainer = formEl.querySelector<HTMLElement>(".lh-query-fields");
            if (fieldsContainer) {
              ro.observe(fieldsContainer);
              for (const child of Array.from(fieldsContainer.children)) {
                ro.observe(child);
              }
            } else {
              ro.observe(formEl);
            }
          }
        }
        measuringRef.current = false;
      }
    };

    measure();

    const form = formRef.current;
    const fieldsContainer = form.querySelector<HTMLElement>(".lh-query-fields");
    const resizeObserver = new ResizeObserver(() => {
      measure();
    });
    resizeObserverRef.current = resizeObserver;
    if (fieldsContainer) {
      resizeObserver.observe(fieldsContainer);
      for (const child of Array.from(fieldsContainer.children)) {
        resizeObserver.observe(child);
      }
    } else {
      resizeObserver.observe(form);
    }
    window.addEventListener("resize", measure);
    return () => {
      resizeObserver.disconnect();
      resizeObserverRef.current = null;
      window.removeEventListener("resize", measure);
    };
  }, [collapseConfig, desktopExpanded, mobileMode, visibleFields]);

  const shouldShowDesktopCollapse = !mobileMode && collapseConfig && desktopOverflow;
  const isDesktopCollapsed = shouldShowDesktopCollapse && !desktopExpanded;
  const hiddenFieldKeys = isDesktopCollapsed ? new Set(collapsedFieldKeys) : new Set<string>();

  if (!hasSearchFields) {
    return null;
  }

  const formNode = (
    <form
      ref={formRef}
      className={cn("lh-query-bar", isDesktopCollapsed && "lh-query-bar--collapsed")}
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        submitExplicitly();
        setMobileOpen(false);
      }}
    >
      <div className="lh-query-fields">
        {visibleFields.map((field) =>
          renderField(
            field,
            remoteOptions[field.key] ?? field.options ?? [],
            remoteKeywords[field.key] ?? "",
            values[field.key],
            (value) => onChange(field.key, value),
            (keyword) => setRemoteKeywords((current) => ({ ...current, [field.key]: keyword })),
            {
              hidden: hiddenFieldKeys.has(field.key),
              queryProps: {
                "data-query-field-key": field.key,
              },
            },
          ),
        )}
      </div>
      <div className="lh-query-actions">
        {shouldShowDesktopCollapse ? (
          <Button
            type="button"
            variant="ghost"
            className="lh-query-expand-button"
            onClick={() => setDesktopExpanded((current) => !current)}
          >
            {desktopExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {desktopExpanded ? "收起" : "展开"}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const nextValues = { ...values };
            for (const field of visibleFields) {
              nextValues[field.key] = defaultFilterValue(field);
            }
            submitExplicitly(nextValues);
            setMobileOpen(false);
          }}
        >
          重置
        </Button>
        <Button type="submit" disabled={loading && !autoSubmit}>
          查询
        </Button>
      </div>
    </form>
  );

  if (!mobileMode) {
    return <div className="lh-query-shell">{formNode}</div>;
  }

  return (
    <div className="lh-query-shell">
      <button
        type="button"
        className="lh-query-collapse-toggle"
        onClick={() => setMobileOpen(true)}
      >
        <span className="lh-query-collapse-title">
          <Search className="h-4 w-4" />
          <span>搜索筛选</span>
        </span>
      </button>
      <aside
        className={`lh-query-drawer-overlay ${mobileOpen ? "" : "lh-query-drawer-overlay--hidden"}`}
        onClick={() => setMobileOpen(false)}
      >
        <section
          className={`lh-query-drawer ${mobileOpen ? "" : "lh-query-drawer--hidden"}`}
          onClick={(event) => event.stopPropagation()}
        >
          <header className="lh-query-drawer-header">
            <div>
              <h3>搜索筛选</h3>
              <p>设置筛选条件后刷新当前列表。</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="lh-drawer-close"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </header>
          <div className="lh-query-drawer-body">
            {formNode}
          </div>
        </section>
      </aside>
    </div>
  );
}
