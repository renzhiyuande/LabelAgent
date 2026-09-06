/** 富文本编辑区 / 只读预览共用排版样式 */
export const RICH_TEXT_EDITOR_CONTENT_CLASS =
  "lh-rich-text-editor-content text-sm leading-7 text-foreground " +
  "[&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:leading-7 " +
  "[&_h3]:mb-1.5 [&_h3]:mt-2.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:leading-6 " +
  "[&_p]:my-1.5 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 " +
  "[&_li]:my-0.5 [&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 " +
  "[&_blockquote]:bg-muted/40 [&_blockquote]:py-1 [&_blockquote]:pl-3 [&_blockquote]:pr-2 [&_blockquote]:text-muted-foreground " +
  "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted/80 " +
  "[&_pre]:p-2.5 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:leading-5 " +
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] " +
  "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 " +
  "[&_hr]:my-3 [&_hr]:border-border";

export interface RichTextActiveFormats {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  unorderedList: boolean;
  orderedList: boolean;
  blockFormat: string;
}

export const EMPTY_RICH_TEXT_ACTIVE_FORMATS: RichTextActiveFormats = {
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  unorderedList: false,
  orderedList: false,
  blockFormat: "p",
};

export function normalizeRichTextOutput(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) {
    return "";
  }
  const text = trimmed.replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").trim();
  if (text.length > 0) {
    return html;
  }
  if (/<img\b/i.test(trimmed) || /<(?:ul|ol|li|table|blockquote|a|div|p|br|hr|pre|h[1-6])\b/i.test(trimmed)) {
    return html;
  }
  return "";
}

export function hasRichTextContent(html: string): boolean {
  return normalizeRichTextOutput(html).length > 0;
}

export function queryActiveRichTextFormats(editor: HTMLElement | null): RichTextActiveFormats {
  if (!editor || !editor.contains(document.getSelection()?.anchorNode ?? null)) {
    return EMPTY_RICH_TEXT_ACTIVE_FORMATS;
  }

  let blockFormat = "p";
  try {
    const raw = document.queryCommandValue("formatBlock");
    if (typeof raw === "string" && raw.length > 0) {
      blockFormat = raw.replace(/[<>]/g, "").toLowerCase() || "p";
    }
  } catch {
    blockFormat = "p";
  }

  return {
    bold: document.queryCommandState("bold"),
    italic: document.queryCommandState("italic"),
    underline: document.queryCommandState("underline"),
    strikeThrough: document.queryCommandState("strikeThrough"),
    unorderedList: document.queryCommandState("insertUnorderedList"),
    orderedList: document.queryCommandState("insertOrderedList"),
    blockFormat,
  };
}

export function wrapSelectionWithInlineCode(editor: HTMLElement | null): boolean {
  const selection = window.getSelection();
  if (!editor || !selection || selection.rangeCount === 0) {
    return false;
  }
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) {
    return false;
  }

  const code = document.createElement("code");
  if (range.collapsed) {
    code.textContent = "code";
    range.insertNode(code);
    range.setStart(code.firstChild ?? code, 0);
    range.setEnd(code.firstChild ?? code, code.textContent?.length ?? 0);
  } else {
    code.appendChild(range.extractContents());
    range.insertNode(code);
    range.selectNodeContents(code);
  }
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}
