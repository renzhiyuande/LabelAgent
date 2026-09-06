import type { OptionItem } from "../schema/types";

export const DICT_TAG_TONE_OPTIONS: OptionItem[] = [
  { label: "成功 success", value: "success", tone: "success" },
  { label: "警告 warning", value: "warning", tone: "warning" },
  { label: "危险 destructive", value: "destructive", tone: "destructive" },
  { label: "默认 neutral", value: "neutral", tone: "neutral" },
  { label: "弱化 muted", value: "muted", tone: "muted" },
];

export interface DictTagClassPreset {
  label: string;
  value: string;
  tone?: string;
}

export const DICT_TAG_CLASS_PRESETS: DictTagClassPreset[] = [
  { label: "自动", value: "" },
  { label: "success", value: "lh-tag success", tone: "success" },
  { label: "warning", value: "lh-tag warning", tone: "warning" },
  { label: "destructive", value: "lh-tag destructive", tone: "destructive" },
  { label: "neutral", value: "lh-tag neutral", tone: "neutral" },
  { label: "muted", value: "lh-tag muted", tone: "muted" },
];

export function resolvePreviewTagClassName(tone?: unknown, className?: unknown): string {
  const normalizedClassName = String(className ?? "").trim();
  if (normalizedClassName) {
    return normalizedClassName;
  }
  const normalizedTone = String(tone ?? "").trim();
  if (normalizedTone) {
    return `lh-tag ${normalizedTone}`;
  }
  return "lh-tag neutral";
}

export function resolvePreviewTagLabel(label?: unknown, fallback = "字典项名称"): string {
  const normalized = String(label ?? "").trim();
  return normalized || fallback;
}
