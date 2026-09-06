"use client";

import {
  Bold,
  Code,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  MoreHorizontal,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { cn } from "../../../lib/utils";
import type { RichTextFieldMeta } from "../../../schema/types";
import { fetchAuthenticatedFileBlobUrl, revokeAuthenticatedFileBlobUrl, uploadFileAsset } from "../../../adapters/asset-adapter";
import { AssetLibraryPicker } from "../../../adapters/asset-adapter";
import type { UploadResult } from "../../../adapters/interfaces";
import {
  applyRichTextImageStylesToRoot,
  buildRichTextAssetImageHtml,
  prepareRichTextDisplayHtml,
  resolveRichTextImageDisplay,
} from "../show-item-utils";
import { LINK_URL_PROMPT } from "../../../constants/prompt-form-presets";
import { openPromptForm } from "../../../utils/prompt-form-bridge";
import { useRichTextAssetImageDragResize } from "./RichTextAssetImageResize";
import {
  EMPTY_RICH_TEXT_ACTIVE_FORMATS,
  hasRichTextContent,
  normalizeRichTextOutput,
  queryActiveRichTextFormats,
  RICH_TEXT_EDITOR_CONTENT_CLASS,
  wrapSelectionWithInlineCode,
  type RichTextActiveFormats,
} from "./rich-text-editor-support";

interface RichTextFieldControlProps {
  value: unknown;
  placeholder?: string;
  disabled?: boolean;
  richText?: RichTextFieldMeta;
  onChange: (value: string) => void;
}

function normalizeHtml(value: unknown): string {
  return typeof value === "string" ? value : value != null ? String(value) : "";
}

async function hydrateEditorAssetImages(
  root: HTMLElement,
  richText?: RichTextFieldMeta,
): Promise<() => void> {
  applyRichTextImageStylesToRoot(root, resolveRichTextImageDisplay(richText));
  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img[data-lh-file-id]"));
  const loadedIds: string[] = [];

  await Promise.all(
    images.map(async (img) => {
      const fileId = img.getAttribute("data-lh-file-id");
      if (!fileId || img.src.startsWith("blob:")) {
        return;
      }
      try {
        const blobUrl = await fetchAuthenticatedFileBlobUrl(fileId);
        if (blobUrl) {
          img.src = blobUrl;
          loadedIds.push(fileId);
        }
      } catch {
        img.alt = img.alt || "图片加载失败";
      }
    }),
  );

  return () => {
    for (const fileId of loadedIds) {
      revokeAuthenticatedFileBlobUrl(fileId);
    }
  };
}

function ToolbarDivider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden />;
}

function ToolbarButton({
  active,
  title,
  disabled,
  onClick,
  children,
}: {
  active?: boolean;
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={title}
      aria-label={title}
      aria-pressed={active ?? false}
      disabled={disabled}
      className={cn(
        "h-8 w-8 shrink-0 rounded-lg",
        active && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
      )}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function RichTextPreviewSurface({
  html,
  richText,
  onChange,
  previewImageResize,
}: {
  html: string;
  richText?: RichTextFieldMeta;
  onChange: (value: string) => void;
  previewImageResize: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const imageDisplay = resolveRichTextImageDisplay(richText);
  const displayHtml = prepareRichTextDisplayHtml(html, richText);
  const resizeEnabled = previewImageResize;

  useRichTextAssetImageDragResize({
    rootRef,
    enabled: resizeEnabled,
    config: imageDisplay,
    onContentChange: () => {
      const next = rootRef.current?.innerHTML ?? "";
      onChange(normalizeRichTextOutput(next));
    },
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root || document.activeElement === root) {
      return;
    }
    if (root.innerHTML !== displayHtml) {
      root.innerHTML = displayHtml;
    }
  }, [displayHtml]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    let cancelled = false;
    void hydrateEditorAssetImages(root, richText).then((cleanup) => {
      if (cancelled) {
        cleanup();
        return;
      }
      cleanupRef.current?.();
      cleanupRef.current = cleanup;
    });
    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [displayHtml, richText]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "lh-rich-text-preview rounded-[0.85rem] border border-border bg-card px-3 py-2.5",
        RICH_TEXT_EDITOR_CONTENT_CLASS,
        resizeEnabled && "[&_img[data-lh-file-id]]:select-none",
      )}
    />
  );
}

export function RichTextFieldControl({
  value,
  placeholder,
  disabled,
  richText,
  onChange,
}: RichTextFieldControlProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeFormats, setActiveFormats] = useState<RichTextActiveFormats>(EMPTY_RICH_TEXT_ACTIVE_FORMATS);
  const html = normalizeHtml(value);
  const assetLibraryEnabled = richText?.enableAssetLibrary === true;
  const previewImageResize = assetLibraryEnabled && richText?.previewImageResize !== false;
  const imageDisplay = resolveRichTextImageDisplay(richText);

  const refreshActiveFormats = useCallback(() => {
    setActiveFormats(queryActiveRichTextFormats(editorRef.current));
  }, []);

  useRichTextAssetImageDragResize({
    rootRef: editorRef,
    enabled: previewImageResize && !disabled,
    config: imageDisplay,
    onContentChange: () => {
      const next = editorRef.current?.innerHTML ?? "";
      onChange(normalizeRichTextOutput(next));
    },
  });

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) {
      return;
    }
    if (editor.innerHTML !== html) {
      editor.innerHTML = html;
    }
  }, [html]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || disabled) {
      return;
    }
    let cancelled = false;
    void hydrateEditorAssetImages(editor, richText).then((cleanup) => {
      if (cancelled) {
        cleanup();
        return;
      }
      cleanupRef.current?.();
      cleanupRef.current = cleanup;
    });
    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [html, disabled, richText]);

  useEffect(() => {
    if (disabled) {
      return;
    }
    document.addEventListener("selectionchange", refreshActiveFormats);
    return () => document.removeEventListener("selectionchange", refreshActiveFormats);
  }, [disabled, refreshActiveFormats]);

  function syncValue() {
    const next = editorRef.current?.innerHTML ?? "";
    onChange(normalizeRichTextOutput(next));
    if (editorRef.current) {
      applyRichTextImageStylesToRoot(editorRef.current, imageDisplay);
    }
    refreshActiveFormats();
  }

  function runCommand(command: string, commandValue?: string) {
    if (disabled) {
      return;
    }
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    syncValue();
  }

  function runFormatBlock(tag: string) {
    runCommand("formatBlock", tag);
  }

  async function handleLink() {
    if (disabled) {
      return;
    }
    const result = await openPromptForm(LINK_URL_PROMPT);
    const url = String(result?.url ?? "").trim();
    if (!url) {
      return;
    }
    runCommand("createLink", url);
  }

  function handleInlineCode() {
    if (disabled) {
      return;
    }
    editorRef.current?.focus();
    if (wrapSelectionWithInlineCode(editorRef.current)) {
      syncValue();
    }
  }

  function insertAsset(asset: UploadResult) {
    if (disabled) {
      return;
    }
    if (asset.id == null) {
      return;
    }
    const snippet = buildRichTextAssetImageHtml(asset.id, asset.originalName ?? asset.name ?? "图片", imageDisplay);
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, snippet);
    syncValue();
    if (editorRef.current) {
      void hydrateEditorAssetImages(editorRef.current, richText).then((cleanup) => {
        cleanupRef.current?.();
        cleanupRef.current = cleanup;
      });
    }
    setPickerOpen(false);
  }

  async function handleLocalImageUpload() {
    if (disabled || !assetLibraryEnabled) {
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener(
      "change",
      () => {
        const file = input.files?.[0];
        input.remove();
        if (!file) {
          return;
        }
        void uploadFileAsset(file, "asset")
          .then((asset) => {
            if (asset?.id != null) {
              insertAsset(asset);
            }
          })
          .catch(() => {
            /* host messageService handles upload errors */
          });
      },
      { once: true },
    );
    input.click();
  }

  function openAssetPicker() {
    setPickerOpen(true);
  }

  if (disabled) {
    if (!hasRichTextContent(html)) {
      return <p className="lh-detail-empty-hint">暂无内容</p>;
    }
    return (
      <RichTextPreviewSurface
        html={html}
        richText={richText}
        onChange={onChange}
        previewImageResize={previewImageResize}
      />
    );
  }

  return (
    <div className="rounded-[0.85rem] border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-1.5">
        {/* 窄屏 / 宽屏均显示：核心排版 + 图片 */}
        <ToolbarButton title="撤销 (Ctrl+Z)" onClick={() => runCommand("undo")}>
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="重做 (Ctrl+Y)" onClick={() => runCommand("redo")}>
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton title="加粗 (Ctrl+B)" active={activeFormats.bold} onClick={() => runCommand("bold")}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="斜体 (Ctrl+I)" active={activeFormats.italic} onClick={() => runCommand("italic")}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="下划线 (Ctrl+U)" active={activeFormats.underline} onClick={() => runCommand("underline")}>
          <Underline className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="无序列表"
          active={activeFormats.unorderedList}
          onClick={() => runCommand("insertUnorderedList")}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="插入链接 (Ctrl+K)" onClick={() => void handleLink()}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>

        {assetLibraryEnabled ? (
          <>
            <ToolbarDivider />
            <ToolbarButton title="从素材库插入图片" onClick={openAssetPicker}>
              <ImagePlus className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="上传本地图片" onClick={() => void handleLocalImageUpload()}>
              <Upload className="h-4 w-4" />
            </ToolbarButton>
          </>
        ) : null}

        {/* 宽屏：完整工具栏 */}
        <div className="hidden flex-wrap items-center gap-0.5 lg:flex">
          <ToolbarDivider />

          <ToolbarButton
            title="标题 2"
            active={activeFormats.blockFormat === "h2"}
            onClick={() => runFormatBlock("h2")}
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="标题 3"
            active={activeFormats.blockFormat === "h3"}
            onClick={() => runFormatBlock("h3")}
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="正文段落"
            active={activeFormats.blockFormat === "p" || activeFormats.blockFormat === "div"}
            onClick={() => runFormatBlock("p")}
          >
            <Pilcrow className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            title="删除线"
            active={activeFormats.strikeThrough}
            onClick={() => runCommand("strikeThrough")}
          >
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="有序列表"
            active={activeFormats.orderedList}
            onClick={() => runCommand("insertOrderedList")}
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="引用块"
            active={activeFormats.blockFormat === "blockquote"}
            onClick={() => runFormatBlock("blockquote")}
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="代码块"
            active={activeFormats.blockFormat === "pre"}
            onClick={() => runFormatBlock("pre")}
          >
            <Code className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title="行内代码" onClick={handleInlineCode}>
            <span className="font-mono text-xs font-semibold">{"{}"}</span>
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton title="移除链接" onClick={() => runCommand("unlink")}>
            <Unlink className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton title="分隔线" onClick={() => runCommand("insertHorizontalRule")}>
            <Minus className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* 窄屏：更多排版 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-lg lg:hidden"
              title="更多排版"
              aria-label="更多排版"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => runFormatBlock("h2")}>标题 2</DropdownMenuItem>
            <DropdownMenuItem onClick={() => runFormatBlock("h3")}>标题 3</DropdownMenuItem>
            <DropdownMenuItem onClick={() => runFormatBlock("p")}>正文段落</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => runCommand("strikeThrough")}>删除线</DropdownMenuItem>
            <DropdownMenuItem onClick={() => runCommand("insertOrderedList")}>有序列表</DropdownMenuItem>
            <DropdownMenuItem onClick={() => runFormatBlock("blockquote")}>引用块</DropdownMenuItem>
            <DropdownMenuItem onClick={() => runFormatBlock("pre")}>代码块</DropdownMenuItem>
            <DropdownMenuItem onClick={handleInlineCode}>行内代码</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => runCommand("unlink")}>移除链接</DropdownMenuItem>
            <DropdownMenuItem onClick={() => runCommand("insertHorizontalRule")}>分隔线</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder ?? "输入富文本内容，可使用上方工具栏排版…"}
        className={cn(
          "lh-rich-text-editor min-h-[180px] max-h-[min(480px,60vh)] overflow-y-auto px-3 py-2.5 outline-none",
          RICH_TEXT_EDITOR_CONTENT_CLASS,
          "empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
          "[&_img[data-lh-file-id]]:my-2 [&_img[data-lh-file-id]]:rounded-md [&_img[data-lh-file-id]]:border [&_img[data-lh-file-id]]:border-border",
          previewImageResize && "[&_img[data-lh-file-id]]:select-none",
        )}
        onInput={syncValue}
        onBlur={syncValue}
        onKeyUp={refreshActiveFormats}
        onMouseUp={refreshActiveFormats}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
            event.preventDefault();
            void handleLink();
          }
        }}
      />

      <div className="border-t border-border/80 bg-muted/20 px-3 py-1.5 text-[11px] text-muted-foreground">
        窄屏显示常用工具；宽屏展示完整排版。快捷键 Ctrl+B / I / U / K
      </div>

      {assetLibraryEnabled ? (
        <AssetLibraryPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          mimeTypePrefix="image/"
          categoryCode="asset"
          title="插入图片"
          onSelect={insertAsset}
        />
      ) : null}
    </div>
  );
}
