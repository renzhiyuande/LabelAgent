import type { FormFieldSchema } from "@/low-code/schema/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Settings, Edit, FolderOpen, Sparkles } from "lucide-react";
import { generateComponentSummary } from "../../../utils/component-summary";
import { useSelectComponentTab } from "../utils/use-select-component-tab";
import { useDesignerEditorStore } from "../../../stores/designer-editor-store";
import type { ComponentRenderConfig } from "../utils/component-renderer-map";
import type { ComponentTheme } from "../utils/component-theme";

interface FunctionalRendererProps {
  field: FormFieldSchema;
  config: ComponentRenderConfig;
  theme: ComponentTheme;
}

interface QuickAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: (event: React.MouseEvent) => void;
}

function useQuickAction(field: FormFieldSchema): QuickAction | null {
  const selectComponentTab = useSelectComponentTab();
  const enterArrayScope = useDesignerEditorStore((state) => state.enterArrayScope);

  switch (field.component) {
    case "imageUpload":
    case "fileUpload":
      return {
        label: "配置上传",
        icon: Settings,
        onClick: (event) => {
          selectComponentTab(field.key, event);
        },
      };

    case "array":
      return {
        label: "进入编辑",
        icon: FolderOpen,
        onClick: (event) => {
          event.stopPropagation();
          enterArrayScope(field.key);
        },
      };

    case "llmSuggest":
      return {
        label: "编辑提示词",
        icon: Sparkles,
        onClick: (event) => {
          selectComponentTab(field.key, event);
        },
      };

    default:
      return null;
  }
}

/**
 * 功能模式渲染器
 * 适用于：imageUpload, fileUpload, array, llmSuggest
 * 特点：显示配置信息 + 快捷操作按钮，适合复杂的功能性组件
 */
export function FunctionalRenderer({ field, config, theme }: FunctionalRendererProps) {
  const Icon = config.icon;
  const summary = generateComponentSummary(field);
  const quickAction = useQuickAction(field);

  // 生成状态标签
  const statusBadges: Array<{ label: string; variant: "default" | "secondary" | "success" | "warning" }> = [];

  if (field.required) {
    statusBadges.push({ label: "必填", variant: "warning" });
  }

  // array 组件显示子字段数量
  if (field.component === "array") {
    const fieldCount = field.fields?.length || 0;
    if (fieldCount > 0) {
      statusBadges.push({ label: `${fieldCount} 个子字段`, variant: "secondary" });
    }
  }

  // llmSuggest 显示 AI 标识
  if (field.component === "llmSuggest" && field.llm) {
    statusBadges.push({ label: "AI 辅助", variant: "default" });
  }

  return (
    <div className="space-y-2.5">
      {/* 头部：图标 + 标题 + 快捷操作 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div
            className={cn(
              "mt-0.5 rounded-md p-1.5",
              theme.bgColor,
              "dark:bg-opacity-20"
            )}
          >
            <Icon className={cn("h-4 w-4", theme.iconColor)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {field.label}
              </span>
              <Badge variant={theme.badgeVariant} className="text-xs font-normal">
                {field.component}
              </Badge>
              {statusBadges.map((badge, index) => (
                <Badge key={index} variant={badge.variant} className="text-xs font-normal">
                  {badge.label}
                </Badge>
              ))}
            </div>
            {field.description && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {field.description}
              </p>
            )}
          </div>
        </div>

        {quickAction && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-xs flex-shrink-0"
            onClick={quickAction.onClick}
          >
            <quickAction.icon className="h-3 w-3" />
            {quickAction.label}
          </Button>
        )}
      </div>

      {/* 配置摘要 */}
      {summary && (
        <div
          className={cn(
            "rounded-md border px-3 py-2 text-xs",
            theme.borderColor,
            theme.bgColor,
            theme.textColor,
            "dark:border-opacity-50 dark:bg-opacity-20"
          )}
        >
          <div className="flex items-start gap-2">
            <Settings className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>{summary}</span>
          </div>
        </div>
      )}

      {/* 显示字段路径（如果与 key 不同） */}
      {field.path && field.path !== field.key && (
        <div className="text-xs font-mono text-muted-foreground">
          path: {field.path}
        </div>
      )}
    </div>
  );
}
