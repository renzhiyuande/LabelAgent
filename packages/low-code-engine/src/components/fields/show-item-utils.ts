import DOMPurify from "dompurify";
import { formatFieldValue } from "../../utils/formatters";
import { getValueAtPath } from "../../utils/object-path";
import type {
  FormFieldSchema,
  RichTextFieldMeta,
  ShowItemFieldMeta,
  ShowItemHeightMode,
  ShowItemRenderAs,
} from "../../schema/types";

/** 素材库占位：{{asset:文件ID}} 或 {{asset:文件ID|说明文字}} */
export const SHOW_ITEM_ASSET_TOKEN_REGEX =
  /\{\{\s*asset\s*:\s*(\d+)\s*(?:\|\s*([^}]*?))?\s*\}\}/gi;

/** 视频素材占位：{{video:文件ID}} 或 {{video:文件ID|说明文字}} */
export const SHOW_ITEM_VIDEO_TOKEN_REGEX =
  /\{\{\s*video\s*:\s*(\d+)\s*(?:\|\s*([^}]*?))?\s*\}\}/gi;

export const SHOW_ITEM_DISPLAY_HEIGHT_BOUNDS = {
  min: 64,
  max: 2400,
} as const;

/** 自适应模式：短内容随内容收缩；长内容初始高度上限（超出在区域内滚动，可拖动放大） */
export const SHOW_ITEM_AUTO_INITIAL_MAX = 480;

/** 自适应外壳最小高度（仅保证边框可点，不强行撑大短文案） */
export const SHOW_ITEM_AUTO_SHELL_MIN = 32;

/** showItem / llmSuggest 等 Markdown 富文本展示共用 prose 样式 */
export const SHOW_ITEM_MARKDOWN_PROSE_CLASS =
  "lh-show-item-value prose prose-sm max-w-none dark:prose-invert [&_.lh-show-item-md-table]:w-full [&_.lh-show-item-md-table_th]:border [&_.lh-show-item-md-table_td]:border [&_.lh-show-item-md-table_th]:border-border [&_.lh-show-item-md-table_td]:border-border [&_.lh-show-item-md-table_th]:bg-muted [&_.lh-show-item-md-table_th]:px-3 [&_.lh-show-item-md-table_th]:py-2 [&_.lh-show-item-md-table_td]:px-3 [&_.lh-show-item-md-table_td]:py-2 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]";

export function resolveShowItemAutoShellHeight(contentScrollHeight: number, shellPadding = 16): number {
  const natural = contentScrollHeight + shellPadding;
  const capped = Math.min(natural, SHOW_ITEM_AUTO_INITIAL_MAX);
  return Math.max(
    SHOW_ITEM_AUTO_SHELL_MIN,
    Math.min(SHOW_ITEM_DISPLAY_HEIGHT_BOUNDS.max, Math.round(capped)),
  );
}

export function resolveShowItemHeightMode(field?: FormFieldSchema): ShowItemHeightMode {
  const showItem = field?.showItem;
  if (showItem?.heightMode === "fixed" || showItem?.heightMode === "auto") {
    return showItem.heightMode;
  }
  if (showItem?.maxHeight != null && showItem.maxHeight > 0) {
    return "fixed";
  }
  return "auto";
}

export function clampShowItemDisplayHeight(height: number): number {
  const { min, max } = SHOW_ITEM_DISPLAY_HEIGHT_BOUNDS;
  return Math.max(min, Math.min(max, Math.round(height)));
}

const SHOW_ITEM_ASSET_IMG_CLASS =
  "max-w-full rounded-md border border-slate-200 my-2 dark:border-slate-700";

const SHOW_ITEM_ASSET_VIDEO_CLASS =
  "max-w-full rounded-md border border-slate-200 my-2 dark:border-slate-700";

export interface RichTextImageDisplayConfig {
  maxHeight: number;
  fit: "contain" | "cover";
}

export function resolveRichTextImageDisplay(meta?: RichTextFieldMeta): RichTextImageDisplayConfig {
  return {
    maxHeight: Math.max(80, Math.min(640, meta?.imageMaxHeight ?? 240)),
    fit: meta?.imageFit === "cover" ? "cover" : "contain",
  };
}

export function richTextAssetImageStyle(config: RichTextImageDisplayConfig): string {
  return `max-height:${config.maxHeight}px;max-width:100%;width:auto;height:auto;object-fit:${config.fit};`;
}

function resolveRichTextImageStyleForAttrs(
  attrs: string,
  fallback: RichTextImageDisplayConfig,
): string {
  const customMatch = attrs.match(/\bdata-lh-max-height\s*=\s*"(\d+)"/);
  const maxHeight = customMatch
    ? Math.max(80, Math.min(640, Number(customMatch[1])))
    : fallback.maxHeight;
  return richTextAssetImageStyle({ maxHeight, fit: fallback.fit });
}

export function readRichTextImageHeight(
  img: HTMLImageElement,
  config: RichTextImageDisplayConfig,
): number {
  const custom = img.getAttribute("data-lh-max-height");
  if (custom) {
    const parsed = Number(custom);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.max(80, Math.min(640, parsed));
    }
  }
  return config.maxHeight;
}

export function setRichTextImageHeight(
  img: HTMLImageElement,
  maxHeight: number,
  config: RichTextImageDisplayConfig,
): void {
  const clamped = Math.max(80, Math.min(640, Math.round(maxHeight)));
  img.setAttribute("data-lh-max-height", String(clamped));
  img.style.cssText = richTextAssetImageStyle({ maxHeight: clamped, fit: config.fit });
}

export function resetRichTextImageHeight(
  img: HTMLImageElement,
  config: RichTextImageDisplayConfig,
): void {
  img.removeAttribute("data-lh-max-height");
  img.style.cssText = richTextAssetImageStyle(config);
}

export function applyRichTextImageStylesToRoot(
  root: ParentNode,
  config: RichTextImageDisplayConfig,
): void {
  root.querySelectorAll<HTMLImageElement>("img[data-lh-file-id]").forEach((img) => {
    const custom = img.getAttribute("data-lh-max-height");
    if (custom) {
      setRichTextImageHeight(img, Number(custom), config);
      return;
    }
    img.style.cssText = richTextAssetImageStyle(config);
  });
}

export function prepareRichTextDisplayHtml(html: string, meta?: RichTextFieldMeta): string {
  const imageDisplay = resolveRichTextImageDisplay(meta);
  const expanded = expandShowItemAssetTokens(html, "html", imageDisplay);
  const sanitized = sanitizeShowItemHtml(expanded);
  return sanitized.replace(
    /<img\b([^>]*\bdata-lh-file-id\s*=\s*"[^"]*"[^>]*)>/gi,
    (_match, attrs: string) => {
      const style = resolveRichTextImageStyleForAttrs(attrs, imageDisplay);
      if (/\bstyle\s*=/.test(attrs)) {
        return `<img${attrs.replace(/\bstyle="[^"]*"/, `style="${style}"`)}>`;
      }
      return `<img${attrs} style="${style}">`;
    },
  );
}

export function buildShowItemAssetToken(fileId: number | string, alt?: string): string {
  const label = alt?.trim();
  return label ? `{{asset:${fileId}|${label}}}` : `{{asset:${fileId}}}`;
}

export function buildShowItemVideoToken(fileId: number | string, alt?: string): string {
  const label = alt?.trim();
  return label ? `{{video:${fileId}|${label}}}` : `{{video:${fileId}}}`;
}

function isVideoMediaUrl(target: string): boolean {
  const trimmed = target.trim();
  if (/^__LH_VIDEO_ASSET_\d+__$/.test(trimmed)) {
    return true;
  }
  return /\.(mp4|webm|ogg|mov|m4v|mkv)(\?|#|$)/i.test(trimmed);
}

export function buildRichTextAssetImageHtml(
  fileId: number | string,
  alt?: string,
  imageDisplay?: RichTextImageDisplayConfig,
): string {
  const safeAlt = escapeHtml((alt ?? "image").trim());
  const style = richTextAssetImageStyle(imageDisplay ?? resolveRichTextImageDisplay());
  return `<img data-lh-file-id="${fileId}" alt="${safeAlt}" class="${SHOW_ITEM_ASSET_IMG_CLASS}" style="${style}" />`;
}

function expandVideoTokens(content: string, renderAs: ShowItemRenderAs): string {
  if (renderAs === "html") {
    return content.replace(SHOW_ITEM_VIDEO_TOKEN_REGEX, (_match, id: string, alt?: string) => {
      const safeTitle = escapeHtml((alt ?? "video").trim());
      return `<video data-lh-file-id="${id}" controls playsinline preload="metadata" title="${safeTitle}" class="${SHOW_ITEM_ASSET_VIDEO_CLASS}"></video>`;
    });
  }
  if (renderAs === "markdown") {
    return content.replace(SHOW_ITEM_VIDEO_TOKEN_REGEX, (_match, id: string, alt?: string) => {
      const label = (alt ?? "video").trim().replace(/\]/g, "\\]");
      return `@[${label}](__LH_VIDEO_ASSET_${id}__)`;
    });
  }
  return content.replace(SHOW_ITEM_VIDEO_TOKEN_REGEX, (_match, id: string, alt?: string) => {
    const label = (alt ?? "video").trim();
    return `[${label} #${id}]`;
  });
}

export function expandShowItemAssetTokens(
  content: string,
  renderAs: ShowItemRenderAs,
  imageDisplay?: RichTextImageDisplayConfig,
): string {
  let expanded = content;
  if (content.includes("{{")) {
    if (renderAs === "html") {
      const style = richTextAssetImageStyle(imageDisplay ?? resolveRichTextImageDisplay());
      expanded = expanded.replace(SHOW_ITEM_ASSET_TOKEN_REGEX, (_match, id: string, alt?: string) => {
        const safeAlt = escapeHtml((alt ?? "image").trim());
        return `<img data-lh-file-id="${id}" alt="${safeAlt}" class="${SHOW_ITEM_ASSET_IMG_CLASS}" style="${style}" />`;
      });
    } else if (renderAs === "markdown") {
      expanded = expanded.replace(SHOW_ITEM_ASSET_TOKEN_REGEX, (_match, id: string, alt?: string) => {
        const label = (alt ?? "image").trim().replace(/\]/g, "\\]");
        return `![${label}](__LH_ASSET_${id}__)`;
      });
    } else {
      expanded = expanded.replace(SHOW_ITEM_ASSET_TOKEN_REGEX, (_match, id: string, alt?: string) => {
        const label = (alt ?? "image").trim();
        return `[${label} #${id}]`;
      });
    }
    expanded = expandVideoTokens(expanded, renderAs);
  }
  return expanded;
}

export function resolveShowItemContentSource(field: FormFieldSchema): NonNullable<ShowItemFieldMeta["contentSource"]> {
  return field.showItem?.contentSource ?? "payload";
}

export function resolveShowItemRenderAs(field: FormFieldSchema): ShowItemRenderAs {
  if (field.showItem?.renderAs) {
    return field.showItem.renderAs;
  }
  if (field.formatter === "json" || field.displayType === "json") {
    return "json";
  }
  if (field.displayType === "richText") {
    return "html";
  }
  return "text";
}

function formatTemplateValue(value: unknown): string {
  if (value == null || value === "") {
    return "";
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function interpolateShowItemTemplate(
  template: string,
  context: Record<string, unknown>,
): string {
  return template.replace(/\{\{\s*([^{}\s]+)\s*\}\}/g, (_match, key: string) => {
    const value = getValueAtPath(context, key);
    return formatTemplateValue(value);
  });
}

export function resolveShowItemRawContent(
  field: FormFieldSchema,
  options: {
    boundValue?: unknown;
    formValues?: Record<string, unknown>;
    payload?: Record<string, unknown>;
  } = {},
): unknown {
  const source = resolveShowItemContentSource(field);
  const context = {
    ...(options.payload ?? {}),
    ...(options.formValues ?? {}),
  };

  if (source === "static") {
    return field.showItem?.staticContent ?? "";
  }

  if (source === "template") {
    const template = field.showItem?.templateContent ?? "";
    return interpolateShowItemTemplate(template, context);
  }

  const binding = field.path ?? field.key;
  if (options.boundValue !== undefined) {
    return options.boundValue;
  }
  if (binding in context) {
    return context[binding];
  }
  return getValueAtPath(context, binding);
}

const SHOW_ITEM_SANITIZE_ALLOWED_TAGS = [
  "a",
  "br",
  "code",
  "div",
  "em",
  "figure",
  "h1",
  "h2",
  "h3",
  "img",
  "li",
  "ol",
  "p",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
  "video",
];

const SHOW_ITEM_SANITIZE_ALLOWED_ATTR = [
  "alt",
  "class",
  "controls",
  "data-lh-file-id",
  "href",
  "playsinline",
  "preload",
  "src",
  "style",
  "title",
];

function rewriteAuthenticatedFileMediaTag(
  tag: "img" | "video",
  before: string,
  id: string,
  after: string,
): string {
  const merged = `${before} ${after}`;
  if (/\bdata-lh-file-id\s*=/.test(merged)) {
    return `<${tag}${before} src="" data-lh-file-id="${id}"${after}>`;
  }
  return `<${tag}${before} data-lh-file-id="${id}" src=""${after}>`;
}

function rewriteAuthenticatedFileMediaUrls(html: string): string {
  return html
    .replace(
      /<img\b([^>]*)\bsrc\s*=\s*["'](\/api\/v1\/files\/(\d+)\/download)["']([^>]*)>/gi,
      (_m, before: string, _src: string, id: string, after: string) =>
        rewriteAuthenticatedFileMediaTag("img", before, id, after),
    )
    .replace(
      /<video\b([^>]*)\bsrc\s*=\s*["'](\/api\/v1\/files\/(\d+)\/download)["']([^>]*)>/gi,
      (_m, before: string, _src: string, id: string, after: string) =>
        rewriteAuthenticatedFileMediaTag("video", before, id, after),
    );
}

export function sanitizeShowItemHtml(html: string): string {
  const rewritten = rewriteAuthenticatedFileMediaUrls(html);
  return DOMPurify.sanitize(rewritten, {
    ALLOWED_TAGS: SHOW_ITEM_SANITIZE_ALLOWED_TAGS,
    ALLOWED_ATTR: SHOW_ITEM_SANITIZE_ALLOWED_ATTR,
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 轻量 JSON 语法高亮（纯展示，不执行脚本） */
export function highlightJsonHtml(json: string): string {
  let result = escapeHtml(json);
  result = result.replace(
    /&quot;([^&]*?)&quot;(\s*:)/g,
    '<span class="text-primary dark:text-primary/70">&quot;$1&quot;</span>$2',
  );
  result = result.replace(
    /:\s*&quot;([^&]*?)&quot;/g,
    ': <span class="text-emerald-600 dark:text-emerald-400">&quot;$1&quot;</span>',
  );
  result = result.replace(
    /:\s*(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    ': <span class="text-amber-600 dark:text-amber-400">$1</span>',
  );
  result = result.replace(
    /\b(true|false|null)\b/g,
    '<span class="text-violet-600 dark:text-violet-400">$1</span>',
  );
  return result;
}

const SHOW_ITEM_MD_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;
const SHOW_ITEM_MD_VIDEO_REGEX = /@\[([^\]]*)\]\(([^)]+)\)/g;
const SHOW_ITEM_HTML_VIDEO_BLOCK_REGEX = /^<video\b[\s\S]*<\/video>$/i;

function renderMarkdownVideo(alt: string, target: string): string {
  const trimmed = target.trim();
  const assetMatch = trimmed.match(/^__LH_VIDEO_ASSET_(\d+)__$/);
  if (assetMatch) {
    const safeTitle = escapeHtml(alt);
    return `<video data-lh-file-id="${assetMatch[1]}" controls playsinline preload="metadata" title="${safeTitle}" class="${SHOW_ITEM_ASSET_VIDEO_CLASS}"></video>`;
  }
  const apiMatch = trimmed.match(/^\/api\/v1\/files\/(\d+)\/download$/);
  if (apiMatch) {
    const safeTitle = escapeHtml(alt);
    return `<video data-lh-file-id="${apiMatch[1]}" controls playsinline preload="metadata" title="${safeTitle}" class="${SHOW_ITEM_ASSET_VIDEO_CLASS}"></video>`;
  }
  const safeTitle = escapeHtml(alt);
  const safeSrc = escapeHtml(trimmed);
  return `<video src="${safeSrc}" controls playsinline preload="metadata" title="${safeTitle}" class="${SHOW_ITEM_ASSET_VIDEO_CLASS}"></video>`;
}

function renderMarkdownImage(alt: string, target: string): string {
  const trimmed = target.trim();
  if (isVideoMediaUrl(trimmed)) {
    return renderMarkdownVideo(alt, trimmed);
  }
  const assetMatch = trimmed.match(/^__LH_ASSET_(\d+)__$/);
  if (assetMatch) {
    const safeAlt = escapeHtml(alt);
    return `<img data-lh-file-id="${assetMatch[1]}" alt="${safeAlt}" class="${SHOW_ITEM_ASSET_IMG_CLASS}" />`;
  }
  const apiMatch = trimmed.match(/^\/api\/v1\/files\/(\d+)\/download$/);
  if (apiMatch) {
    const safeAlt = escapeHtml(alt);
    return `<img data-lh-file-id="${apiMatch[1]}" alt="${safeAlt}" class="${SHOW_ITEM_ASSET_IMG_CLASS}" />`;
  }
  const safeAlt = escapeHtml(alt);
  const safeSrc = escapeHtml(trimmed);
  return `<img src="${safeSrc}" alt="${safeAlt}" class="${SHOW_ITEM_ASSET_IMG_CLASS}" />`;
}

function renderInlineMarkdown(text: string): string {
  return text
    .replace(SHOW_ITEM_MD_VIDEO_REGEX, (_m, alt: string, target: string) =>
      renderMarkdownVideo(alt, target.trim()),
    )
    .replace(SHOW_ITEM_MD_IMAGE_REGEX, (_m, alt: string, target: string) => renderMarkdownImage(alt, target.trim()))
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function isSeparatorRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("|") && !trimmed.includes("-")) {
    return false;
  }
  const cells = parseTableCells(trimmed);
  return cells.length > 0 && cells.every((cell) => /^:?-{1,}:?$/.test(cell));
}

function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.includes("|") && !isSeparatorRow(trimmed);
}

function parseTableCells(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith("|")) {
    trimmed = trimmed.slice(1);
  }
  if (trimmed.endsWith("|")) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed.split("|").map((cell) => cell.trim());
}

function buildMarkdownTableHtml(headers: string[], rows: string[][]): string {
  const head = headers
    .map((header) => `<th>${renderInlineMarkdown(escapeHtml(header))}</th>`)
    .join("");
  const body = rows
    .map((row) => {
      const cells = row
        .map((cell) => `<td>${renderInlineMarkdown(escapeHtml(cell))}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  return `<div class="lh-show-item-md-table-wrap overflow-x-auto my-2"><table class="lh-show-item-md-table min-w-full border-collapse text-sm"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function tryParseTableAt(lines: string[], start: number): { html: string; consumed: number } | null {
  if (start + 1 >= lines.length) {
    return null;
  }
  const headerLine = lines[start]?.trim() ?? "";
  const separatorLine = lines[start + 1]?.trim() ?? "";
  if (!isTableRow(headerLine) || !isSeparatorRow(separatorLine)) {
    return null;
  }

  const headers = parseTableCells(headerLine);
  if (headers.length === 0) {
    return null;
  }

  const rows: string[][] = [];
  let index = start + 2;
  while (index < lines.length) {
    const line = lines[index]?.trim() ?? "";
    if (!line || !isTableRow(line)) {
      break;
    }
    rows.push(parseTableCells(line));
    index += 1;
  }

  return {
    html: buildMarkdownTableHtml(headers, rows),
    consumed: index - start,
  };
}

export function renderShowItemMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  const paragraph: string[] = [];
  let index = 0;

  function flushParagraph() {
    if (paragraph.length === 0) {
      return;
    }
    const text = paragraph.join("\n");
    blocks.push(`<p>${renderInlineMarkdown(escapeHtml(text).replace(/\n/g, "<br />"))}</p>`);
    paragraph.length = 0;
  }

  while (index < lines.length) {
    const table = tryParseTableAt(lines, index);
    if (table) {
      flushParagraph();
      blocks.push(table.html);
      index += table.consumed;
      continue;
    }

    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      index += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${renderInlineMarkdown(escapeHtml(headingMatch[2]))}</h${level}>`);
      index += 1;
      continue;
    }

    const videoOnly = trimmed.match(/^@\[([^\]]*)\]\(([^)]+)\)$/);
    if (videoOnly) {
      flushParagraph();
      blocks.push(
        `<figure class="my-2">${renderMarkdownVideo(videoOnly[1], videoOnly[2].trim())}</figure>`,
      );
      index += 1;
      continue;
    }

    const imageOnly = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageOnly) {
      flushParagraph();
      blocks.push(
        `<figure class="my-2">${renderMarkdownImage(imageOnly[1], imageOnly[2].trim())}</figure>`,
      );
      index += 1;
      continue;
    }

    if (SHOW_ITEM_HTML_VIDEO_BLOCK_REGEX.test(trimmed)) {
      flushParagraph();
      blocks.push(`<figure class="my-2">${sanitizeShowItemHtml(trimmed)}</figure>`);
      index += 1;
      continue;
    }

    paragraph.push(line);
    index += 1;
  }

  flushParagraph();
  return blocks.join("");
}

export function formatShowItemDisplayText(field: FormFieldSchema, raw: unknown): string {
  const renderAs = resolveShowItemRenderAs(field);
  if (renderAs === "json") {
    return formatFieldValue({ formatter: "json", type: "json" }, raw);
  }
  if (renderAs === "html") {
    return typeof raw === "string" ? raw : formatFieldValue({ formatter: "json", type: "json" }, raw);
  }
  if (renderAs === "markdown") {
    return typeof raw === "string" ? raw : formatFieldValue({ formatter: "json", type: "json" }, raw);
  }
  return formatFieldValue({ formatter: field.formatter, type: field.displayType }, raw);
}

export function shouldUseShowItemPre(field: FormFieldSchema): boolean {
  return resolveShowItemRenderAs(field) === "json" || field.showItem?.layout === "pre";
}

export function buildShowItemTableRows(raw: unknown): Array<{ key: string; value: string }> {
  if (Array.isArray(raw)) {
    return raw.map((item, index) => ({
      key: String(index + 1),
      value: formatFieldValue({ formatter: "json", type: "json" }, item),
    }));
  }
  if (raw && typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>).map(([key, value]) => ({
      key,
      value: formatFieldValue({ formatter: "json", type: "json" }, value),
    }));
  }
  return [{ key: "value", value: formatFieldValue({ type: "text" }, raw) }];
}
