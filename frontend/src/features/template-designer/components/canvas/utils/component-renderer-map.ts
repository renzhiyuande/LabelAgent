import {
  Type,
  AlignLeft,
  FileText,
  ToggleLeft,
  ChevronDown,
  ListChecks,
  Tags,
  Circle,
  CheckSquare,
  Link,
  Braces,
  Paperclip,
  Image,
  List,
  Eye,
  Video,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type RenderMode = "compact" | "info" | "functional" | "preview";

export type ComponentCategory = "basic" | "advanced" | "display" | "assist";

export interface ComponentRenderConfig {
  mode: RenderMode;
  category: ComponentCategory;
  icon: LucideIcon;
}

export const COMPONENT_RENDER_MAP: Record<string, ComponentRenderConfig> = {
  // 基础组件 - 紧凑模式
  text: { mode: "compact", category: "basic", icon: Type },
  textarea: { mode: "compact", category: "basic", icon: AlignLeft },
  richText: { mode: "compact", category: "basic", icon: FileText },
  switch: { mode: "compact", category: "basic", icon: ToggleLeft },

  // 基础组件 - 信息模式
  select: { mode: "info", category: "basic", icon: ChevronDown },
  multiSelect: { mode: "info", category: "basic", icon: ListChecks },
  tags: { mode: "info", category: "basic", icon: Tags },
  radioGroup: { mode: "info", category: "basic", icon: Circle },
  checkboxGroup: { mode: "info", category: "basic", icon: CheckSquare },

  // 高级组件
  remoteSelect: { mode: "info", category: "advanced", icon: Link },
  jsonEditor: { mode: "compact", category: "advanced", icon: Braces },
  fileUpload: { mode: "functional", category: "advanced", icon: Paperclip },
  imageUpload: { mode: "functional", category: "advanced", icon: Image },
  array: { mode: "functional", category: "advanced", icon: List },

  // 展示组件
  showItem: { mode: "preview", category: "display", icon: Eye },
  showImage: { mode: "preview", category: "display", icon: Image },
  showFile: { mode: "preview", category: "display", icon: FileText },
  showVideo: { mode: "preview", category: "display", icon: Video },

  // 智能辅助
  llmSuggest: { mode: "functional", category: "assist", icon: Sparkles },
};
