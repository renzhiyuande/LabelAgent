import type { FormFieldSchema } from "@/low-code/schema/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Settings, List } from "lucide-react";
import { generateComponentSummary } from "../../../utils/component-summary";
import { useSelectComponentTab } from "../utils/use-select-component-tab";
import type { ComponentRenderConfig } from "../utils/component-renderer-map";
import type { ComponentTheme } from "../utils/component-theme";

interface InfoRendererProps {
  field: FormFieldSchema;
  config: ComponentRenderConfig;
  theme: ComponentTheme;
}

/**
 * 获取快捷配置操作
 */
function useQuickConfig(field: FormFieldSchema): {
  label: string;
  icon: typeof Settings;
  onClick: (event: React.MouseEvent) => void;
} | null {
  const selectComponentTab = useSelectComponentTab();

  // 带选项的组件提供"配置选项"快捷操作
  const hasOptions = [
    "select",
    "multiSelect",
    "tags",
    "radioGroup",
    "checkboxGroup",
  ].includes(field.component);

  // remoteSelect 提供"配置数据源"快捷操作
  const isRemote = field.component === "remoteSelect";

  if (hasOptions || isRemote) {
    return {
      label: isRemote ? "配置数据源" : "配置选项",
      icon: isRemote ? Settings : List,
      onClick: (event) => {
        selectComponentTab(field.key, event);
      },
    };
  }

  return null;
}

/**
 * 信息模式渲染器
 * 适用于：select, multiSelect, tags, radioGroup, checkboxGroup, remoteSelect
 * 特点：显示配置摘要信息（选项列表、数据源等）+ 快捷配置按钮
 */
export function InfoRenderer({ field, config, theme }: InfoRendererProps) {
  const Icon = config.icon;
  const summary = generateComponentSummary(field);
  const quickConfig = useQuickConfig(field);

  // 生成额外的配置信息
  const configInfo: string[] = [];

  if (field.required) {
    configInfo.push("必填");
  }

  // 多选组件提示
  if (field.component === "multiSelect" || field.component === "checkboxGroup") {
    configInfo.push("多选");
  }

  // tags 组件提示
  if (field.component === "tags") {
    configInfo.push("标签输入");
  }

  // remoteSelect 显示数据源
  if (field.component === "remoteSelect" && field.remote) {
    configInfo.push("远程数据");
  }

  // 生成状态标签
  const statusBadges: Array<{ label: string; variant: "default" | "secondary" | "success" | "warning" }> = [];

  // 显示选项数量
  if (field.options && field.options.length > 0) {
    statusBadges.push({ label: `${field.options.length} 项`, variant: "secondary" });
  }

  return (
    <div className="space-y-2.5">
      {/* 头部：图标 + 标题 + 快捷配置 */}
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
              {field.required && (
                <span className="text-xs font-medium text-red-500">*</span>
              )}
              {statusBadges.map((badge, index) => (
                <Badge key={index} variant={badge.variant} className="text-xs font-normal">
                  {badge.label}
                </Badge>
              ))}
            </div>
            {configInfo.length > 0 && (
              <div className="mt-1 text-xs text-muted-foreground">
                {configInfo.join(" · ")}
              </div>
            )}
          </div>
        </div>

        {quickConfig && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-xs flex-shrink-0"
            onClick={quickConfig.onClick}
          >
            <quickConfig.icon className="h-3 w-3" />
            {quickConfig.label}
          </Button>
        )}
      </div>

      {/* 选项摘要或数据源信息 */}
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
            <List className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span className="flex-1">{summary}</span>
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
