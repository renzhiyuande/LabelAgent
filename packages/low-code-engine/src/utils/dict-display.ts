import type { OptionItem } from "../schema/types";

export function findDictOption(options: OptionItem[] | undefined, value: unknown): OptionItem | undefined {
  if (!options?.length) {
    return undefined;
  }
  const normalized = String(value ?? "");
  return options.find((item) => String(item.value) === normalized);
}

export function resolveDictTagClassName(option: OptionItem | undefined): string {
  if (option?.className) {
    return option.className;
  }
  if (option?.tone) {
    return `lh-tag ${option.tone}`;
  }
  return "lh-tag neutral";
}

export function resolveDictLabel(option: OptionItem | undefined, value: unknown): string {
  if (option?.label) {
    return option.label;
  }
  if (value == null || value === "") {
    return "-";
  }
  return String(value);
}

export function toneToBadgeVariant(
  tone?: string,
): "default" | "secondary" | "destructive" | "success" | "warning" {
  switch (tone) {
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "destructive":
      return "destructive";
    default:
      return "secondary";
  }
}
