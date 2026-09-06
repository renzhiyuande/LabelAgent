import type { FormFieldSchema } from "@/low-code/schema/types";
import { Badge } from "@/components/ui/badge";
import { COMPONENT_RENDER_MAP } from "./utils/component-renderer-map";
import { getComponentTheme } from "./utils/component-theme";
import { CompactRenderer } from "./renderers/CompactRenderer";
import { InfoRenderer } from "./renderers/InfoRenderer";
import { FunctionalRenderer } from "./renderers/FunctionalRenderer";
import { PreviewRenderer } from "./renderers/PreviewRenderer";
import { CanvasArrayShell } from "./CanvasArrayShell";
import { useDesignerEditorStore } from "../../stores/designer-editor-store";

interface CanvasFieldPreviewProps {
  field: FormFieldSchema;
}

/**
 * 默认渲染器 - 用于未配置的组件类型
 */
function DefaultRenderer({ field }: { field: FormFieldSchema }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
          {field.label}
          {field.required ? <span className="ml-0.5 text-red-500">*</span> : null}
        </span>
        <Badge variant="secondary" className="text-xs font-normal">
          {field.component}
        </Badge>
      </div>
      <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        {field.placeholder || `字段 key: ${field.key}`}
        {field.path && field.path !== field.key ? ` · path: ${field.path}` : ""}
      </div>
    </div>
  );
}

export function CanvasFieldPreview({ field }: CanvasFieldPreviewProps) {
  const enterArrayScope = useDesignerEditorStore((state) => state.enterArrayScope);

  // array 组件使用特殊的 CanvasArrayShell 渲染
  // 保留原有的实现，因为它有特殊的交互逻辑
  if (field.component === "array") {
    return (
      <CanvasArrayShell
        field={field}
        variant="main"
        onEnterSubCanvas={() => enterArrayScope(field.key)}
      />
    );
  }

  // 获取组件的渲染配置和主题
  const config = COMPONENT_RENDER_MAP[field.component];
  const theme = getComponentTheme(field.component);

  // 如果没有配置，使用默认渲染器
  if (!config) {
    return <DefaultRenderer field={field} />;
  }

  // 根据渲染模式选择对应的渲染器
  switch (config.mode) {
    case "compact":
      return <CompactRenderer field={field} config={config} theme={theme} />;
    case "info":
      return <InfoRenderer field={field} config={config} theme={theme} />;
    case "functional":
      return <FunctionalRenderer field={field} config={config} theme={theme} />;
    case "preview":
      return <PreviewRenderer field={field} config={config} theme={theme} />;
    default:
      return <DefaultRenderer field={field} />;
  }
}
