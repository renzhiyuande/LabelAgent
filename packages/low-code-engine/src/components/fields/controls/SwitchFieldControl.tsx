"use client";

import { Switch } from '../../../components/ui/switch';

interface SwitchFieldControlProps {
  value: unknown;
  disabled?: boolean;
  compact?: boolean;
  onChange: (value: boolean) => void;
}

export function SwitchFieldControl({ value, disabled, compact = false, onChange }: SwitchFieldControlProps) {
  const checked = Boolean(value);

  if (compact) {
    return (
      <div className="lh-table-switch-cell">
        <Switch checked={checked} disabled={disabled} onCheckedChange={(next) => onChange(Boolean(next))} />
        <span className="lh-table-switch-label">{checked ? "开" : "关"}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
      <Switch checked={checked} disabled={disabled} onCheckedChange={(next) => onChange(Boolean(next))} />
      <span className="text-sm text-foreground">{checked ? "已启用" : "已禁用"}</span>
    </div>
  );
}
