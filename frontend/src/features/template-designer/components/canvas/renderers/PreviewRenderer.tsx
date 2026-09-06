import type { FormFieldSchema } from "@/low-code/schema/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Eye, AlertCircle, FolderOpen } from "lucide-react";
import { ShowItemFieldControl } from "@/low-code/components/fields/controls/ShowItemFieldControl";
import { ShowImageFieldControl } from "@/low-code/components/fields/controls/ShowImageFieldControl";
import { ShowFileFieldControl } from "@/low-code/components/fields/controls/ShowFileFieldControl";
import { ShowVideoFieldControl } from "@/low-code/components/fields/controls/ShowVideoFieldControl";
import {
  resolveShowAssetContentSource,
  resolveShowImageDisplayList,
  resolveShowFileDisplay,
  resolveShowVideoDisplay,
} from "@/low-code/components/fields/show-asset-utils";
import { getValueAtPath } from "@/low-code/utils/object-path";
import { generateComponentSummary } from "../../../utils/component-summary";
import { useDesignerEditorStore } from "../../../stores/designer-editor-store";
import { useSelectComponentTab } from "../utils/use-select-component-tab";
import type { ComponentRenderConfig } from "../utils/component-renderer-map";
import type { ComponentTheme } from "../utils/component-theme";

interface PreviewRendererProps {
  field: FormFieldSchema;
  config: ComponentRenderConfig;
  theme: ComponentTheme;
}

/** 设计器画布预览区限制图片高度，避免占用过多空间 */
const CANVAS_IMAGE_PREVIEW_MAX_HEIGHT = 96;

function toCanvasImagePreviewField(field: FormFieldSchema): FormFieldSchema {
  return {
    ...field,
    showImage: {
      ...field.showImage,
      contentSource: field.showImage?.contentSource ?? "payload",
      maxHeight: CANVAS_IMAGE_PREVIEW_MAX_HEIGHT,
      previewOnClick: false,
    },
  };
}

function useQuickConfig(field: FormFieldSchema) {
  const selectComponentTab = useSelectComponentTab();

  if (field.component === "showImage" || field.component === "showFile" || field.component === "showVideo") {
    return {
      label: "选择素材",
      icon: FolderOpen,
      onClick: (event: React.MouseEvent) => {
        selectComponentTab(field.key, event);
      },
    };
  }

  if (field.component === "showItem") {
    const source = field.showItem?.contentSource ?? "payload";
    if (source === "static" || source === "template") {
      return {
        label: source === "static" ? "配置内容" : "配置模板",
        icon: FolderOpen,
        onClick: (event: React.MouseEvent) => {
          selectComponentTab(field.key, event);
        },
      };
    }
  }

  return null;
}

function EmptyPreviewHint({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-muted-foreground">
      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <div className="text-xs space-y-1.5">
        <p className="font-medium">{title}</p>
        {children}
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          💡 提示：展示组件为只读展示，不参与标注提交。内容来源需在右侧「组件」Tab 中配置。
        </p>
      </div>
    </div>
  );
}

function renderFieldPreview(field: FormFieldSchema, previewValues: Record<string, unknown>) {
  const binding = field.path ?? field.key;

  switch (field.component) {
    case "showItem": {
      const source = field.showItem?.contentSource ?? "payload";
      const sampleValue = getValueAtPath(previewValues, binding);
      const hasSample =
        source === "static"
          ? Boolean(field.showItem?.staticContent?.trim())
          : source === "template"
            ? Boolean(field.showItem?.templateContent?.trim())
            : sampleValue !== undefined && sampleValue !== null && sampleValue !== "";

      if (hasSample) {
        return (
          <div className="max-h-16 overflow-hidden text-xs leading-5 [&_.lh-show-item-inline]:line-clamp-3 [&_.lh-show-item-inline]:text-xs [&_.prose]:line-clamp-3 [&_.prose]:text-xs">
            <ShowItemFieldControl
              field={field}
              value={sampleValue}
              formValues={previewValues}
              constrainHeight={false}
            />
          </div>
        );
      }

      return (
        <EmptyPreviewHint title="暂无预览数据">
          <p className="text-muted-foreground">
            {source === "payload" && (
              <>
                在左侧预览值中填入{" "}
                <span className="font-mono text-foreground/80">"{binding}"</span> 的数据
              </>
            )}
            {source === "static" && "在右侧「组件」Tab 填写固定文案"}
            {source === "template" && "在右侧「组件」Tab 填写模板内容"}
          </p>
        </EmptyPreviewHint>
      );
    }

    case "showImage": {
      const meta = field.showImage;
      const source = resolveShowAssetContentSource(meta);
      const sampleValue = source === "payload" ? getValueAtPath(previewValues, binding) : undefined;
      const items = resolveShowImageDisplayList(field, sampleValue);

      if (items.length > 0) {
        return (
          <ShowImageFieldControl
            field={toCanvasImagePreviewField(field)}
            value={sampleValue}
          />
        );
      }

      return (
        <EmptyPreviewHint title="暂无预览数据">
          <p className="text-muted-foreground">
            {source === "payload" && (
              <>
                在左侧预览值中填入{" "}
                <span className="font-mono text-foreground/80">"{binding}"</span> 的图片 URL 或文件 ID
              </>
            )}
            {source === "asset" && "在右侧「组件」Tab 从素材库选择图片，或点击右上角「选择素材」"}
            {source === "static" && "在右侧「组件」Tab 填写固定图片 URL"}
          </p>
        </EmptyPreviewHint>
      );
    }

    case "showFile": {
      const meta = field.showFile;
      const source = resolveShowAssetContentSource(meta);
      const sampleValue = source === "payload" ? getValueAtPath(previewValues, binding) : undefined;
      const resolved = resolveShowFileDisplay(field, sampleValue);

      if (resolved) {
        return <ShowFileFieldControl field={field} value={sampleValue} constrainHeight={false} />;
      }

      return (
        <EmptyPreviewHint title="暂无预览数据">
          <p className="text-muted-foreground">
            {source === "payload" && (
              <>
                在左侧预览值中填入{" "}
                <span className="font-mono text-foreground/80">"{binding}"</span> 的文件信息
              </>
            )}
            {source === "asset" && "在右侧「组件」Tab 从素材库选择文件，或点击右上角「选择素材」"}
            {source === "static" && "在右侧「组件」Tab 填写固定文件 URL"}
          </p>
        </EmptyPreviewHint>
      );
    }

    case "showVideo": {
      const meta = field.showVideo;
      const source = resolveShowAssetContentSource(meta);
      const sampleValue = source === "payload" ? getValueAtPath(previewValues, binding) : undefined;
      const resolved = resolveShowVideoDisplay(field, sampleValue);

      if (resolved) {
        return (
          <ShowVideoFieldControl
            field={{
              ...field,
              showVideo: {
                ...field.showVideo,
                contentSource: field.showVideo?.contentSource ?? "payload",
                maxHeight: 160,
              },
            }}
            value={sampleValue}
          />
        );
      }

      return (
        <EmptyPreviewHint title="暂无预览数据">
          <p className="text-muted-foreground">
            {source === "payload" && (
              <>
                在左侧预览值中填入{" "}
                <span className="font-mono text-foreground/80">"{binding}"</span> 的视频 URL 或文件 ID
              </>
            )}
            {source === "asset" && "在右侧「组件」Tab 从素材库选择视频，或点击右上角「选择素材」"}
            {source === "static" && "在右侧「组件」Tab 填写固定视频 URL"}
          </p>
        </EmptyPreviewHint>
      );
    }

    default:
      return null;
  }
}

function runtimeHeightHint(field: FormFieldSchema): string | null {
  switch (field.component) {
    case "showItem": {
      const showItem = field.showItem;
      if (!showItem) {
        return null;
      }
      const mode = showItem.heightMode ?? (showItem.maxHeight != null ? "fixed" : "auto");
      if (mode === "fixed" && showItem.maxHeight != null) {
        return `运行时固定高度 ${showItem.maxHeight}px`;
      }
      return "运行时自适应高度，可拖动调整";
    }
    case "showImage":
      return field.showImage?.maxHeight != null ? `运行时图片最大高度 ${field.showImage.maxHeight}px` : null;
    case "showVideo":
      return field.showVideo?.maxHeight != null ? `运行时视频最大高度 ${field.showVideo.maxHeight}px` : null;
    case "showFile":
      return field.showFile?.maxHeight != null ? `运行时展示区域高度 ${field.showFile.maxHeight}px` : null;
    default:
      return null;
  }
}

/**
 * 预览模式渲染器
 * 适用于：showItem, showImage, showFile, showVideo
 * 特点：显示实际的渲染效果，让用户直观看到组件的最终呈现
 */
export function PreviewRenderer({ field, config, theme }: PreviewRendererProps) {
  const Icon = config.icon;
  const previewValues = useDesignerEditorStore((state) => state.previewValues);
  const configHint = generateComponentSummary(field);
  const quickConfig = useQuickConfig(field);
  const heightHint = runtimeHeightHint(field);

  return (
    <div className="space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div
            className={cn(
              "mt-0.5 rounded-md p-1.5",
              theme.bgColor,
              "dark:bg-opacity-20"
            )}
          >
            <Icon className={cn("h-3.5 w-3.5", theme.iconColor)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">
                {field.label}
              </span>
              <Badge variant={theme.badgeVariant} className="text-xs font-normal">
                {field.component}
              </Badge>
              {configHint && field.component !== "showItem" && (
                <span className="text-xs text-muted-foreground">· {configHint}</span>
              )}
              {field.component === "showItem" && configHint && (
                <Badge variant="secondary" className="text-xs font-normal">
                  {configHint}
                </Badge>
              )}
            </div>
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

      <div
        className={cn(
          "rounded-lg border-2 border-dashed p-3 min-h-[64px]",
          (field.component === "showImage" || field.component === "showVideo") && "max-h-36 overflow-hidden",
          theme.borderColor,
          "bg-card",
          "dark:border-opacity-30"
        )}
      >
        <div className="flex items-start gap-2">
          <Eye className={cn("h-4 w-4 mt-0.5 flex-shrink-0", theme.iconColor)} />
          <div className="flex-1 min-w-0">
            {renderFieldPreview(field, previewValues)}
          </div>
        </div>
      </div>

      {heightHint ? (
        <p className="text-[11px] text-muted-foreground">{heightHint} · 在右侧「组件」Tab 配置</p>
      ) : null}

      {field.path && field.path !== field.key && (
        <div className="text-xs font-mono text-muted-foreground">
          path: {field.path}
        </div>
      )}
    </div>
  );
}
