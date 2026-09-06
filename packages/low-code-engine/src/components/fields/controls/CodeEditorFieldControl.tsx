"use client";

import { Textarea } from '../../../components/ui/textarea';

interface CodeEditorFieldControlProps {
  value: unknown;
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function CodeEditorFieldControl({
  value,
  placeholder,
  disabled,
  onChange,
}: CodeEditorFieldControlProps) {
  return (
    <Textarea
      rows={10}
      className="lh-form-control--textarea font-mono text-xs"
      value={String(value ?? "")}
      placeholder={placeholder ?? "请输入代码内容"}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
