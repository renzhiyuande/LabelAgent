"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import {
  filterMenuTree,
  loadAssignmentAssigned,
  loadAssignmentCandidates,
  mergeAssignmentOptions,
  normalizeSelectedIds,
  type AssignmentOption,
} from "../../../adapters/assignment";
import type { AssignmentFieldMeta, FormFieldSchema, OptionItem, ResourceMeta } from "../../../schema/types";
import { AssignmentOptionList } from "./AssignmentOptionList";

interface AssignmentPickerFieldControlProps {
  field: FormFieldSchema;
  config: AssignmentFieldMeta;
  assignedApi: string;
  recordId: string | number;
  resource: ResourceMeta;
  value: unknown;
  disabled?: boolean;
  loadRemoteOptions: (source: string, query?: string | import("../../../schema/types").RemoteOptionQuery) => Promise<OptionItem[]>;
  onChange: (value: number[]) => void;
  /** 批量场景不读取已分配项，仅展示候选列表 */
  skipAssignedLoad?: boolean;
}

export function AssignmentPickerFieldControl({
  field,
  config,
  assignedApi,
  recordId,
  resource,
  value,
  disabled,
  loadRemoteOptions,
  onChange,
  skipAssignedLoad = false,
}: AssignmentPickerFieldControlProps) {
  const [keyword, setKeyword] = useState("");
  const [baseOptions, setBaseOptions] = useState<AssignmentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [resourceTypeFilter, setResourceTypeFilter] = useState("ALL");
  const selectedIds = normalizeSelectedIds(Array.isArray(value) ? (value as number[]) : []);
  const menuMode = config.variant === "tree";

  useEffect(() => {
    let disposed = false;
    setLoading(true);
    const loadAssigned = skipAssignedLoad
      ? Promise.resolve([] as AssignmentOption[])
      : loadAssignmentAssigned(resource, recordId, config, assignedApi);

    void Promise.all([
      loadAssignmentCandidates(resource, config, "", loadRemoteOptions),
      loadAssigned,
    ])
      .then(([candidates, assigned]) => {
        if (disposed) {
          return;
        }
        setBaseOptions(mergeAssignmentOptions(candidates, assigned, config.variant));
        if (!skipAssignedLoad) {
          onChange(normalizeSelectedIds(assigned.map((item) => item.id)));
        }
      })
      .finally(() => {
        if (!disposed) {
          setLoading(false);
        }
      });
    return () => {
      disposed = true;
    };
  }, [assignedApi, recordId, resource, config, loadRemoteOptions, skipAssignedLoad]);

  const visibleOptions = useMemo(() => {
    const keywordFiltered = menuMode
      ? filterMenuTree(baseOptions, keyword)
      : baseOptions.filter((item) => !keyword || item.label.includes(keyword) || String(item.description ?? "").includes(keyword));
    if (!config.resourceTypeFilter || resourceTypeFilter === "ALL") {
      return keywordFiltered;
    }
    return keywordFiltered.filter((item) => item.resourceType === resourceTypeFilter);
  }, [baseOptions, config.resourceTypeFilter, keyword, menuMode, resourceTypeFilter]);

  const resourceTypeOptions = useMemo(() => {
    if (!config.resourceTypeFilter) {
      return [];
    }
    return Array.from(new Set(baseOptions.map((item) => item.resourceType).filter(Boolean) as string[]))
      .sort((left, right) => left.localeCompare(right));
  }, [baseOptions, config.resourceTypeFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={keyword}
          disabled={disabled}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder={config.searchPlaceholder ?? field.placeholder ?? (menuMode ? "搜索菜单名称 / 路径" : "搜索名称 / 编码")}
        />
        {config.resourceTypeFilter ? (
          <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter} disabled={disabled}>
            <SelectTrigger className="sm:w-[220px]">
              <SelectValue placeholder="筛选资源类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部资源</SelectItem>
              {resourceTypeOptions.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>
      <AssignmentOptionList
        options={visibleOptions}
        selectedIds={selectedIds}
        loading={loading}
        menuMode={menuMode}
        onChange={(nextIds) => {
          if (!disabled) {
            onChange(nextIds);
          }
        }}
      />
    </div>
  );
}
