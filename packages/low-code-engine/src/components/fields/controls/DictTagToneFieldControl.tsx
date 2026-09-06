"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { DICT_TAG_TONE_OPTIONS, resolvePreviewTagClassName } from "../../../utils/dict-tag-style";

interface DictTagToneFieldControlProps {
  value: unknown;
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}

const EMPTY_VALUE = "__lh_dict_tag_tone_empty__";

export function DictTagToneFieldControl({
  value,
  disabled,
  placeholder,
  onChange,
}: DictTagToneFieldControlProps) {
  const selected = value == null ? "" : String(value);
  const selectValue = selected === "" ? EMPTY_VALUE : selected;

  return (
    <Select
      value={selectValue}
      disabled={disabled}
      onValueChange={(nextValue) => {
        onChange(nextValue === EMPTY_VALUE ? "" : nextValue);
      }}
    >
      <SelectTrigger className="min-h-10">
        {selected ? (
          <span className="flex items-center gap-2">
            <span className={resolvePreviewTagClassName(selected)}>示例</span>
            <span className="text-slate-500">{selected}</span>
          </span>
        ) : (
          <SelectValue placeholder={placeholder ?? "选择标签色调"} />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={EMPTY_VALUE}>无（使用默认 neutral）</SelectItem>
        {DICT_TAG_TONE_OPTIONS.map((option) => {
          const tone = String(option.value);
          return (
            <SelectItem key={tone} value={tone}>
              <span className="flex items-center gap-2">
                <span className={resolvePreviewTagClassName(tone)}>示例</span>
                <span>{option.label}</span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
