import type { FormFieldSchema } from "@/low-code/schema/types";
import {
  formatCollaboratorRoleSummary,
  formatFieldBindingSummary,
  formatOptionSourceLabel,
  resolveOptionSourceProfile,
} from "./option-source-profiles";

const SHOW_ITEM_SOURCE_LABELS: Record<string, string> = {
  payload: "绑定数据",
  static: "固定文案",
  template: "模板",
};

const SHOW_ITEM_RENDER_LABELS: Record<string, string> = {
  text: "纯文本",
  markdown: "Markdown",
  json: "JSON",
  html: "HTML",
};

const SHOW_ITEM_LAYOUT_LABELS: Record<string, string> = {
  inline: "行内",
  card: "卡片",
  pre: "代码块",
  table: "表格",
};

export function generateComponentSummary(field: FormFieldSchema): string {
  switch (field.component) {
    case "select":
    case "multiSelect":
    case "tags":
    case "radioGroup":
    case "checkboxGroup": {
      const options = field.options || [];
      if (options.length === 0) return "未配置选项";
      const preview = options.slice(0, 3).map((opt) => opt.label).join("、");
      const more = options.length > 3 ? `等 ${options.length} 项` : `(${options.length} 项)`;
      return `${preview} ${more}`;
    }

    case "remoteSelect":
    case "remoteTreeSelect": {
      const remote = field.remote;
      const source = remote?.source;
      if (!source) {
        return "未配置数据源";
      }
      const profile = resolveOptionSourceProfile(source);
      const sourceLabel = formatOptionSourceLabel(source);
      const parts = [sourceLabel];
      if (profile.kind === "collaborators") {
        parts.push(formatCollaboratorRoleSummary(remote?.params));
      } else if (profile.kind === "taskBound") {
        const binding = formatFieldBindingSummary(remote?.params, "taskId", "任务");
        if (binding) {
          parts.push(binding);
        }
      } else if (profile.kind === "resourceTypeBound") {
        const binding = formatFieldBindingSummary(remote?.params, "resourceType", "资源类型");
        if (binding) {
          parts.push(binding);
        }
      } else if (profile.kind === "dict") {
        parts.push("字典项");
      } else if (profile.kind === "searchable") {
        parts.push("可搜索");
      }
      if (remote?.variant === "tree" || field.component === "remoteTreeSelect") {
        parts.push("树形");
      }
      return parts.join(" · ");
    }

    case "imageUpload":
    case "fileUpload": {
      const upload = field.upload;
      if (!upload) return "未配置上传限制";
      const parts = [];
      if (upload.maxCount) parts.push(`最多 ${upload.maxCount} 个`);
      if (upload.maxSizeMb) parts.push(`每个 ≤ ${upload.maxSizeMb}MB`);
      if (upload.accept) {
        const formats = upload.accept
          .split(",")
          .map((f) => f.trim().replace(".", ""))
          .join("/");
        parts.push(formats);
      }
      return parts.join(" · ") || "未配置限制";
    }

    case "array": {
      const fields = field.fields || [];
      return fields.length === 0 ? "未配置子字段" : `包含 ${fields.length} 个子字段`;
    }

    case "llmSuggest": {
      const llm = field.llm;
      if (!llm) return "未配置 LLM";
      const parts = [llm.buttonLabel || "获取建议"];
      if (llm.contextFields?.length) {
        parts.push(`上下文 ${llm.contextFields.length} 项`);
      }
      return parts.join(" · ");
    }

    case "richText": {
      const meta = field.richText;
      if (!meta?.enableAssetLibrary) return "";
      const count = meta.assets?.length ?? 0;
      const height = meta.imageMaxHeight ?? 240;
      const sizeHint = `≤${height}px`;
      return count > 0 ? `素材库 · ${count} 张 · ${sizeHint}` : `素材库 · ${sizeHint}`;
    }

    case "showItem": {
      const showItem = field.showItem;
      if (!showItem) return "";
      const source = showItem.contentSource ?? "payload";
      const renderAs = showItem.renderAs ?? "text";
      const layout = showItem.layout ?? "inline";
      const parts = [SHOW_ITEM_SOURCE_LABELS[source] ?? source];

      if (renderAs !== "text") {
        parts.push(SHOW_ITEM_RENDER_LABELS[renderAs] ?? renderAs);
      }
      if (layout !== "inline") {
        parts.push(SHOW_ITEM_LAYOUT_LABELS[layout] ?? layout);
      }
      const heightMode = showItem.heightMode ?? (showItem.maxHeight != null ? "fixed" : "auto");
      if (heightMode === "fixed" && showItem.maxHeight != null) {
        parts.push(`固定 ${showItem.maxHeight}px`);
      } else if (heightMode === "auto") {
        parts.push("自适应");
      }

      return parts.join(" · ");
    }

    case "showImage": {
      const meta = field.showImage;
      if (!meta) return "未配置";
      const source = meta.contentSource ?? "payload";
      if (source === "asset") {
        const count =
          meta.assets?.length ?? (meta.asset?.fileId ? 1 : 0);
        return count > 0 ? `素材库 · ${count} 张` : "素材库 · 未选择";
      }
      if (source === "static") {
        const urls = meta.staticUrls?.length
          ? meta.staticUrls
          : meta.staticUrl?.trim()
            ? [meta.staticUrl.trim()]
            : [];
        return urls.length > 0 ? `固定 URL · ${urls.length} 张` : "固定 URL · 未填写";
      }
      const height = meta.maxHeight;
      const base = "绑定数据";
      return height != null ? `${base} · ${height}px` : base;
    }

    case "showFile": {
      const meta = field.showFile;
      if (!meta) return "未配置";
      const source = meta.contentSource ?? "payload";
      if (source === "asset") {
        return meta.asset?.fileId ? `素材库 · ${meta.asset.name}` : "素材库 · 未选择";
      }
      if (source === "static") {
        return meta.staticUrl?.trim() ? "固定 URL" : "固定 URL · 未填写";
      }
      return "绑定数据";
    }

    case "showVideo": {
      const meta = field.showVideo;
      if (!meta) return "未配置";
      const source = meta.contentSource ?? "payload";
      if (source === "asset") {
        return meta.asset?.fileId ? `素材库 · ${meta.asset.name}` : "素材库 · 未选择";
      }
      if (source === "static") {
        return meta.staticUrl?.trim() ? "固定 URL" : "固定 URL · 未填写";
      }
      return "绑定数据";
    }

    default:
      return "";
  }
}
