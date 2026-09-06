import { useMemo } from "react";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { Checkbox } from '../../../components/ui/checkbox';
import { ScrollArea } from '../../../components/ui/scroll-area';
import type { AssignmentOption } from "../../../adapters/assignment";

interface AssignmentOptionListProps {
  options: AssignmentOption[];
  selectedIds: number[];
  loading: boolean;
  menuMode?: boolean;
  onChange: (selectedIds: number[]) => void;
}

function optionId(id: number): number {
  return Number(id);
}

function flattenOptions(options: AssignmentOption[]): AssignmentOption[] {
  return options.flatMap((option) => [option, ...flattenOptions(option.children ?? [])]);
}

function collectDescendantIds(option: AssignmentOption): number[] {
  return [optionId(option.id), ...(option.children ?? []).flatMap(collectDescendantIds)];
}

function collectAncestorIds(targetId: number, options: AssignmentOption[], trail: number[] = []): number[] {
  for (const option of options) {
    if (optionId(option.id) === targetId) {
      return trail;
    }
    const nested = collectAncestorIds(targetId, option.children ?? [], [...trail, optionId(option.id)]);
    if (nested.length > 0) {
      return nested;
    }
  }
  return [];
}

function toggleFlatSelection(selectedIds: number[], optionIdValue: number, checked: boolean): number[] {
  if (checked) {
    return selectedIds.includes(optionIdValue) ? selectedIds : [...selectedIds, optionIdValue];
  }
  return selectedIds.filter((item) => item !== optionIdValue);
}

function OptionRow({
  option,
  checked,
  depth = 0,
  onCheckedChange,
}: {
  option: AssignmentOption;
  checked: CheckedState;
  depth?: number;
  onCheckedChange: (checked: CheckedState) => void;
}) {
  return (
    <label
      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card px-3 py-3 text-sm transition-colors hover:border-primary/20 hover:bg-primary/10"
      style={depth > 0 ? { marginLeft: `${depth * 18}px` } : undefined}
    >
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      <div className="min-w-0">
        <div className="font-medium text-foreground">{option.label}</div>
        {option.description ? (
          <div className="mt-1 break-all text-xs text-slate-500">{option.description}</div>
        ) : null}
      </div>
    </label>
  );
}

function FlatOptionList({
  options,
  selectedIds,
  onChange,
}: {
  options: AssignmentOption[];
  selectedIds: number[];
  onChange: (selectedIds: number[]) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((option) => {
        const id = optionId(option.id);
        return (
          <OptionRow
            key={option.id}
            option={option}
            checked={selectedIds.includes(id)}
            onCheckedChange={(nextValue) => onChange(toggleFlatSelection(selectedIds, id, nextValue === true))}
          />
        );
      })}
    </div>
  );
}

function MenuTreeList({
  options,
  selectedIds,
  onChange,
}: {
  options: AssignmentOption[];
  selectedIds: number[];
  onChange: (selectedIds: number[]) => void;
}) {
  const selectedSet = useMemo(() => new Set(selectedIds.map(optionId)), [selectedIds]);

  function handleNodeChange(option: AssignmentOption, checked: CheckedState) {
    const branchIds = collectDescendantIds(option);
    const branchIdSet = new Set(branchIds);
    if (checked) {
      const ancestorIds = collectAncestorIds(optionId(option.id), options);
      onChange(Array.from(new Set([...selectedIds, ...ancestorIds, ...branchIds])));
      return;
    }
    onChange(selectedIds.filter((id) => !branchIdSet.has(optionId(id))));
  }

  function nodeState(option: AssignmentOption): CheckedState {
    const branchIds = collectDescendantIds(option);
    const selectedCount = branchIds.filter((id) => selectedSet.has(id)).length;
    if (selectedCount === 0) {
      return false;
    }
    if (selectedCount === branchIds.length) {
      return true;
    }
    return "indeterminate";
  }

  function renderNodes(nodes: AssignmentOption[], depth = 0) {
    return (
      <div className="space-y-2">
        {nodes.map((option) => (
          <div key={option.id} className="space-y-2">
            <OptionRow
              option={option}
              depth={depth}
              checked={nodeState(option)}
              onCheckedChange={(nextValue) => handleNodeChange(option, nextValue)}
            />
            {(option.children?.length ?? 0) > 0 ? renderNodes(option.children ?? [], depth + 1) : null}
          </div>
        ))}
      </div>
    );
  }

  return renderNodes(options);
}

export function AssignmentOptionList({
  options,
  selectedIds,
  loading,
  menuMode = false,
  onChange,
}: AssignmentOptionListProps) {
  const flatOptions = useMemo(() => flattenOptions(options), [options]);
  const selectedSet = useMemo(() => new Set(selectedIds.map(optionId)), [selectedIds]);
  const visibleOptions = menuMode ? options : flatOptions;
  const hasVisibleSelection = visibleOptions.some((option) => {
    if (selectedSet.has(optionId(option.id))) {
      return true;
    }
    return (option.children ?? []).some((child) => selectedSet.has(optionId(child.id)));
  });

  return (
    <ScrollArea className="max-h-[420px] rounded-2xl border border-border p-3">
      {loading ? (
        <div className="py-6 text-center text-sm text-slate-500">加载中...</div>
      ) : options.length === 0 ? (
        <div className="py-6 text-center text-sm text-slate-500">
          {hasVisibleSelection ? "当前关键字下无匹配项，但已选内容会保留。" : "暂无可选项"}
        </div>
      ) : menuMode ? (
        <MenuTreeList options={options} selectedIds={selectedIds} onChange={onChange} />
      ) : (
        <FlatOptionList options={flatOptions} selectedIds={selectedIds} onChange={onChange} />
      )}
    </ScrollArea>
  );
}
