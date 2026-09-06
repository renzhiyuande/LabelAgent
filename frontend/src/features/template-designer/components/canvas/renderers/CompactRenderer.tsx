import type { FormFieldSchema } from "@/low-code/schema/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ComponentRenderConfig } from "../utils/component-renderer-map";
import type { ComponentTheme } from "../utils/component-theme";

interface CompactRendererProps {
  field: FormFieldSchema;
  config: ComponentRenderConfig;
  theme: ComponentTheme;
}

/**
 * 紧凑模式渲染器
 * 适用于：text, textarea, richText, switch, jsonEditor
 * 特点：单行显示，最小化空间占用，适合配置简单的组件
 */
export function CompactRenderer({ field, config, theme }: CompactRendererProps) {
  const Icon = config.icon;

  // 生成额外的元信息提示
  const metaInfo: string[] = [];

  if (field.required) {
    metaInfo.push("必填");
  }

  if (field.placeholder) {
    metaInfo.push(`提示: ${field.placeholder}`);
  }

  // switch 组件显示默认值
  if (field.component === "switch" && field.defaultValue !== undefined) {
    metaInfo.push(`默认: ${field.defaultValue ? "开启" : "关闭"}`);
  }

  // textarea 和 richText 的提示
  if (field.component === "textarea") {
    metaInfo.push("多行文本");
  }

  if (field.component === "richText") {
    metaInfo.push("富文本");
    if (field.richText?.enableAssetLibrary) {
      metaInfo.push("素材库插入");
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4 flex-shrink-0", theme.iconColor)} />
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {field.label}
        </span>
        <Badge variant={theme.badgeVariant} className="text-xs font-normal">
          {field.component}
        </Badge>
        {field.required && (
          <span className="text-xs font-medium text-red-500">*</span>
        )}
      </div>

      {metaInfo.length > 0 && (
        <div className="pl-5 text-xs text-muted-foreground">
          {metaInfo.join(" · ")}
        </div>
      )}

      {/* 显示字段路径（如果与 key 不同） */}
      {field.path && field.path !== field.key && (
        <div className="pl-5 text-xs font-mono text-muted-foreground">
          path: {field.path}
        </div>
      )}
    </div>
  );
}
