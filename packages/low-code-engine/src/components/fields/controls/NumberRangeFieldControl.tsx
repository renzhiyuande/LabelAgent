"use client";

import { Input } from '../../../components/ui/input';

interface NumberRangeFieldControlProps {
  value: [unknown, unknown];
  disabled?: boolean;
  onChange: (value: [string, string]) => void;
}

export function NumberRangeFieldControl({
  value,
  disabled,
  onChange,
}: NumberRangeFieldControlProps) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <Input
        inputMode="numeric"
        value={String(value[0] ?? "")}
        placeholder="最小值"
        disabled={disabled}
        onChange={(event) => onChange([event.target.value, String(value[1] ?? "")])}
      />
      <span className="text-xs text-slate-400">至</span>
      <Input
        inputMode="numeric"
        value={String(value[1] ?? "")}
        placeholder="最大值"
        disabled={disabled}
        onChange={(event) => onChange([String(value[0] ?? ""), event.target.value])}
      />
    </div>
  );
}
