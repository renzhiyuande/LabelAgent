import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function resolveMaterialIcon(iconName: string): LucideIcon {
  const iconMap = Icons as unknown as Record<string, LucideIcon | undefined>;
  return iconMap[iconName] ?? Icons.Box;
}
