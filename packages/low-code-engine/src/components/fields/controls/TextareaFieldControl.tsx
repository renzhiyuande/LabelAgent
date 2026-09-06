"use client";

import { Textarea } from '../../../components/ui/textarea';
import type { OptionItem } from "../../../schema/types";
import { UserMentionTextareaFieldControl } from "./UserMentionTextareaFieldControl";

interface TextareaFieldControlProps {
  value: unknown;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
  /** 外部候选（如 collaborators 远程选项）；配合 onMentionSearch 使用 */
  mentionOptions?: OptionItem[];
  onMentionSearch?: (keyword: string) => void;
  /** 默认开启 @用户 */
  enableUserMention?: boolean;
  onChange: (value: string) => void;
}

export function TextareaFieldControl({
  value,
  placeholder,
  disabled,
  rows,
  className,
  mentionOptions,
  onMentionSearch,
  enableUserMention = true,
  onChange,
}: TextareaFieldControlProps) {
  if (!enableUserMention) {
    return (
      <Textarea
        rows={rows}
        className={className}
        value={String(value ?? "")}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <UserMentionTextareaFieldControl
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      className={className}
      mentionOptions={mentionOptions}
      onMentionSearch={onMentionSearch}
      onChange={onChange}
    />
  );
}
