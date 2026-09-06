"use client";

import { Input } from '../../../components/ui/input';

interface TextFieldControlProps {
  value: unknown;
  placeholder?: string;
  disabled?: boolean;
  inputType?: "text" | "number" | "password";
  onChange: (value: string) => void;
}

export function TextFieldControl({
  value,
  placeholder,
  disabled,
  inputType = "text",
  onChange,
}: TextFieldControlProps) {
  return (
    <Input
      type={inputType}
      value={String(value ?? "")}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
