import type { ComponentCategory } from "./component-renderer-map";
import { COMPONENT_RENDER_MAP } from "./component-renderer-map";

export interface ComponentTheme {
  iconColor: string;
  badgeVariant: "default" | "secondary" | "success" | "warning" | "destructive";
  borderColor: string;
  bgColor: string;
  textColor: string;
}

export const CATEGORY_THEMES: Record<ComponentCategory, ComponentTheme> = {
  basic: {
    iconColor: "text-primary",
    badgeVariant: "secondary",
    borderColor: "border-primary/30",
    bgColor: "bg-primary/5",
    textColor: "text-primary",
  },
  advanced: {
    iconColor: "text-primary/90",
    badgeVariant: "default",
    borderColor: "border-primary/25",
    bgColor: "bg-primary/5",
    textColor: "text-foreground",
  },
  display: {
    iconColor: "text-primary",
    badgeVariant: "success",
    borderColor: "border-primary/35",
    bgColor: "bg-card",
    textColor: "text-foreground",
  },
  assist: {
    iconColor: "text-primary/80",
    badgeVariant: "warning",
    borderColor: "border-primary/20",
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
  },
};

export function getComponentTheme(component: string): ComponentTheme {
  const config = COMPONENT_RENDER_MAP[component];
  return config ? CATEGORY_THEMES[config.category] : CATEGORY_THEMES.basic;
}
