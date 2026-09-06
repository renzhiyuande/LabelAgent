"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchTemplateOptionSources } from "../../designer-api";
import { resolveRemoteTreeApi } from "@/low-code/adapters/tree-options";
import { SelectFieldControl } from "@/low-code/components/fields/controls/SelectFieldControl";
import { TextFieldControl } from "@/low-code/components/fields/controls/TextFieldControl";
import type { OptionSourceItem, RemoteOptionMeta } from "@/low-code/schema/types";
import { normalizeRemoteOptionMeta } from "@/low-code/utils/remote-option-query";
import { filterRemoteParamsForSource } from "@/low-code/utils/remote-source-params";
import {
  formatOptionSourceLabel,
  resolveOptionSourceProfile,
} from "../../utils/option-source-profiles";
import type { ConditionFieldOption } from "./ConditionListEditor";
import { CollaboratorRemoteParamsEditor } from "./CollaboratorRemoteParamsEditor";
import { FieldBindingRemoteParamsEditor } from "./FieldBindingRemoteParamsEditor";
import { RemoteParamsEditor } from "./RemoteParamsEditor";

interface RemoteMetaEditorProps {
  remote?: RemoteOptionMeta;
  fieldOptions: ConditionFieldOption[];
  fieldDefaultValues?: Record<string, unknown>;
  onChange: (next: RemoteOptionMeta | undefined) => void;
}

const VARIANT_OPTIONS = [
  { label: "平铺列表", value: "flat" },
  { label: "树形结构", value: "tree" },
];

function ensureCurrentOption(
  options: Array<{ label: string; value: string }>,
  currentValue: string | undefined,
): Array<{ label: string; value: string }> {
  if (!currentValue || options.some((option) => option.value === currentValue)) {
    return options;
  }
  return [{ label: `${currentValue}（当前值）`, value: currentValue }, ...options];
}

function buildDefaultTreeApi(source: string): string {
  if (!source || source.startsWith("dict:")) {
    return "字典数据源无树形接口";
  }
  return resolveRemoteTreeApi({ source, variant: "tree" });
}

export function RemoteMetaEditor({
  remote,
  fieldOptions,
  onChange,
}: RemoteMetaEditorProps) {
  const normalizedRemote = useMemo(() => normalizeRemoteOptionMeta(remote ?? { source: "" }), [remote]);
  const value: RemoteOptionMeta = normalizedRemote ?? { source: "" };
  const [optionSources, setOptionSources] = useState<OptionSourceItem[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setSourcesLoading(true);
    void fetchTemplateOptionSources()
      .then((sources) => {
        if (active) {
          setOptionSources(sources);
        }
      })
      .catch(() => {
        if (active) {
          setOptionSources([]);
        }
      })
      .finally(() => {
        if (active) {
          setSourcesLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const patch = (nextPatch: Partial<RemoteOptionMeta>) => {
    const merged = { ...value, ...nextPatch };
    if (nextPatch.source != null && nextPatch.source !== value.source) {
      merged.params = filterRemoteParamsForSource(nextPatch.source, value.params);
      const nextProfile = resolveOptionSourceProfile(nextPatch.source);
      if (!nextProfile.showSearchParam) {
        merged.searchParam = undefined;
      }
      if (!nextProfile.supportsTree) {
        merged.variant = undefined;
        merged.treeApi = undefined;
      }
    }
    onChange(normalizeRemoteOptionMeta(merged));
  };

  const sourceCatalogLabel = useMemo(
    () => optionSources.find((item) => item.key === value.source)?.label,
    [optionSources, value.source],
  );

  const profile = useMemo(() => resolveOptionSourceProfile(value.source), [value.source]);

  const sourceOptions = useMemo(
    () =>
      ensureCurrentOption(
        optionSources.map((item) => ({ label: item.label, value: item.key })),
        value.source || undefined,
      ),
    [optionSources, value.source],
  );

  const defaultTreeApi = useMemo(() => buildDefaultTreeApi(value.source), [value.source]);

  const treeApiOptions = useMemo(() => {
    if (!value.source || value.source.startsWith("dict:")) {
      return ensureCurrentOption([], value.treeApi);
    }
    const options = [
      {
        label: `跟随 source 默认（${defaultTreeApi}）`,
        value: "",
      },
    ];
    const seen = new Set<string>([defaultTreeApi]);
    for (const item of optionSources) {
      const treeApi = buildDefaultTreeApi(item.key);
      if (seen.has(treeApi)) {
        continue;
      }
      seen.add(treeApi);
      options.push({
        label: `${item.label} · ${treeApi}`,
        value: treeApi,
      });
    }
    return ensureCurrentOption(options, value.treeApi);
  }, [defaultTreeApi, optionSources, value.source, value.treeApi]);

  const showAdvancedKeys = profile.kind === "custom";
  const showVariant = profile.supportsTree && !value.source.startsWith("dict:");
  const showSearchParam = profile.showSearchParam;

  return (
    <section className="space-y-3">
      <div>
        <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100">远程选项</h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{profile.description}</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-slate-600 dark:text-slate-300">数据源</label>
        <SelectFieldControl
          label="数据源"
          value={value.source}
          options={sourceOptions}
          placeholder={sourcesLoading ? "加载数据源..." : "选择远程数据源"}
          disabled={sourcesLoading}
          emptyLabel="请选择数据源"
          onChange={(source) => patch({ source })}
        />
        {value.source ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            当前：{formatOptionSourceLabel(value.source, sourceCatalogLabel)}
          </p>
        ) : null}
      </div>

      {showAdvancedKeys ? (
        <>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-600 dark:text-slate-300">labelKey</label>
            <TextFieldControl
              value={value.labelKey ?? ""}
              placeholder="默认 label"
              onChange={(labelKey) => patch({ labelKey: labelKey || undefined })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-600 dark:text-slate-300">valueKey</label>
            <TextFieldControl
              value={value.valueKey ?? ""}
              placeholder="默认 value"
              onChange={(valueKey) => patch({ valueKey: valueKey || undefined })}
            />
          </div>
        </>
      ) : null}

      {profile.kind === "collaborators" ? (
        <CollaboratorRemoteParamsEditor
          params={value.params}
          fieldOptions={fieldOptions}
          onChange={(next) => patch(next)}
        />
      ) : null}

      {profile.kind === "taskBound" ? (
        <FieldBindingRemoteParamsEditor
          source={value.source}
          paramName="taskId"
          title="关联任务字段"
          description="选择表单中的任务字段；远程选项会随该字段取值刷新。"
          params={value.params}
          fieldOptions={fieldOptions}
          onChange={(next) => patch(next)}
        />
      ) : null}

      {profile.kind === "resourceTypeBound" ? (
        <FieldBindingRemoteParamsEditor
          source={value.source}
          paramName="resourceType"
          title="关联资源类型字段"
          description="选择表单中的资源类型字段，用于加载对应的范围类型选项。"
          params={value.params}
          fieldOptions={fieldOptions}
          onChange={(next) => patch(next)}
        />
      ) : null}

      {profile.kind === "custom" ? (
        <RemoteParamsEditor
          params={value.params}
          searchParam={value.searchParam}
          fieldOptions={fieldOptions}
          onChange={(next) => patch(next)}
        />
      ) : null}

      {showSearchParam ? (
        <div className="space-y-1.5">
          <label className="text-xs text-slate-600 dark:text-slate-300">搜索参数名</label>
          <TextFieldControl
            value={value.searchParam ?? ""}
            placeholder="默认 keyword"
            onChange={(searchParam) => patch({ searchParam: searchParam.trim() || undefined })}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            用户在下拉中输入搜索词时，会作为 query 参数传给后端。
          </p>
        </div>
      ) : null}

      {showVariant ? (
        <div className="space-y-1.5">
          <label className="text-xs text-slate-600 dark:text-slate-300">展示结构</label>
          <SelectFieldControl
            label="variant"
            value={value.variant ?? "flat"}
            options={VARIANT_OPTIONS}
            onChange={(variant) => patch({ variant: variant as RemoteOptionMeta["variant"] })}
          />
        </div>
      ) : null}

      {showVariant && value.variant === "tree" && value.source && !value.source.startsWith("dict:") ? (
        <div className="space-y-1.5">
          <label className="text-xs text-slate-600 dark:text-slate-300">treeApi</label>
          <SelectFieldControl
            label="treeApi"
            value={value.treeApi ?? ""}
            options={treeApiOptions}
            emptyLabel={`跟随 source 默认（${defaultTreeApi}）`}
            onChange={(treeApi) => patch({ treeApi: treeApi || undefined })}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            留空时前端按约定解析：/api/v1/admin/&#123;source&#125;/tree
          </p>
        </div>
      ) : null}
    </section>
  );
}
