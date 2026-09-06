"use client";

import { useEffect, useRef, useState } from "react";
import { dispatchMentionNotifications } from "@/features/notifications";
import { useAuthStore } from "@/stores/auth";
import { TextFieldControl } from "@/low-code/components/fields/controls/TextFieldControl";
import { TextareaFieldControl } from "@/low-code/components/fields/controls/TextareaFieldControl";
import { SelectFieldControl } from "@/low-code/components/fields/controls/SelectFieldControl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormFieldSchema, ShowItemFieldMeta, ShowItemHeightMode } from "@/low-code/schema/types";
import {
  buildShowItemAssetToken,
  buildShowItemVideoToken,
  clampShowItemDisplayHeight,
  resolveShowItemContentSource,
  resolveShowItemHeightMode,
  resolveShowItemRenderAs,
  SHOW_ITEM_DISPLAY_HEIGHT_BOUNDS,
} from "@/low-code/components/fields/show-item-utils";
import type { FileAssetSummary } from "@/features/assets/file-assets-api";
import { AssetLibraryPicker } from "@/features/assets/AssetLibraryPicker";
import { useDesignerEditorStore } from "../../stores/designer-editor-store";
import { withImportFieldMeta } from "@/low-code/schema/import-field-meta";

interface ShowItemMetaEditorProps {
  field: FormFieldSchema;
  onChange: (patch: Partial<FormFieldSchema>) => void;
}

const CONTENT_SOURCE_OPTIONS = [
  { label: "绑定题目数据（payload 列）", value: "payload" },
  { label: "固定文案", value: "static" },
  { label: "模板插值（{{列名}}）", value: "template" },
];

const RENDER_AS_OPTIONS = [
  { label: "纯文本", value: "text" },
  { label: "Markdown", value: "markdown" },
  { label: "JSON", value: "json" },
  { label: "HTML（净化后渲染）", value: "html" },
];

const LAYOUT_OPTIONS = [
  { label: "行内", value: "inline" },
  { label: "卡片", value: "card" },
  { label: "代码块", value: "pre" },
  { label: "表格", value: "table" },
];

const HEIGHT_MODE_OPTIONS = [
  { label: "自适应（可拖动）", value: "auto" },
  { label: "固定高度", value: "fixed" },
];

const DEFAULT_SHOW_ITEM: ShowItemFieldMeta = {
  contentSource: "payload",
  renderAs: "text",
  layout: "inline",
};

function syncImportMeta(field: FormFieldSchema, showItem: ShowItemFieldMeta): Partial<FormFieldSchema> {
  const source = showItem.contentSource ?? "payload";
  if (source === "payload") {
    return withImportFieldMeta({ ...field, showItem }, "display");
  }
  return withImportFieldMeta({ ...field, showItem }, "runtime");
}

function appendToContent(current: string, snippet: string): string {
  const trimmed = current.trimEnd();
  return trimmed ? `${trimmed}\n\n${snippet}` : snippet;
}

function formatMaxHeightDraft(maxHeight?: number): string {
  return maxHeight != null ? String(maxHeight) : "";
}

export function ShowItemMetaEditor({ field, onChange }: ShowItemMetaEditorProps) {
  const mentionTimerRef = useRef<number | null>(null);
  const currentUser = useAuthStore((state) => state.currentUser);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [videoPickerOpen, setVideoPickerOpen] = useState(false);
  const importContract = useDesignerEditorStore((state) => state.importContract);
  const config = { ...DEFAULT_SHOW_ITEM, ...field.showItem };
  const heightMode = resolveShowItemHeightMode({ ...field, showItem: config });
  const [maxHeightDraft, setMaxHeightDraft] = useState(() => formatMaxHeightDraft(config.maxHeight));
  const contentSource = resolveShowItemContentSource(field);
  const renderAs = resolveShowItemRenderAs(field);
  const binding = field.path ?? field.key;
  const lockedKeys = importContract?.requiredKeys ?? [];
  const isLockedBinding = contentSource === "payload" && lockedKeys.includes(binding);
  const canInsertFromLibrary =
    (contentSource === "static" || contentSource === "template") &&
    (renderAs === "markdown" || renderAs === "html");

  useEffect(
    () => () => {
      if (mentionTimerRef.current != null) {
        window.clearTimeout(mentionTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    setMaxHeightDraft(formatMaxHeightDraft(config.maxHeight));
  }, [field.key, config.maxHeight]);

  function patchShowItem(next: Partial<ShowItemFieldMeta>) {
    const showItem = { ...config, ...next };
    onChange(syncImportMeta(field, showItem));
  }

  function commitMaxHeightDraft() {
    const raw = maxHeightDraft.trim();
    if (!raw) {
      patchShowItem({ maxHeight: undefined });
      setMaxHeightDraft("");
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      setMaxHeightDraft(formatMaxHeightDraft(config.maxHeight));
      return;
    }
    const clamped = clampShowItemDisplayHeight(parsed);
    patchShowItem({ heightMode: "fixed", maxHeight: clamped });
    setMaxHeightDraft(String(clamped));
  }

  function scheduleMentionDispatch(text: string) {
    if (!text.includes("@")) {
      return;
    }
    if (mentionTimerRef.current != null) {
      window.clearTimeout(mentionTimerRef.current);
    }
    mentionTimerRef.current = window.setTimeout(() => {
      const senderName = currentUser?.displayName ?? currentUser?.username ?? "有人";
      void dispatchMentionNotifications({
        text,
        title: `${senderName} 在展示项中提到了你`,
        body: text,
        linkUrl: "/system/template-designer",
        bizType: "SHOW_ITEM",
        bizId: field.key,
      }).catch(() => undefined);
    }, 1000);
  }

  function insertMediaToken(asset: FileAssetSummary, kind: "image" | "video") {
    const token =
      kind === "video"
        ? buildShowItemVideoToken(asset.id, asset.originalName)
        : buildShowItemAssetToken(asset.id, asset.originalName);
    if (contentSource === "static") {
      patchShowItem({ staticContent: appendToContent(config.staticContent ?? "", token) });
      return;
    }
    patchShowItem({ templateContent: appendToContent(config.templateContent ?? "", token) });
  }

  return (
    <section className="space-y-3">
      <div>
        <h4 className="lh-designer-pane-title">展示配置</h4>
        <p className="lh-designer-pane-hint mt-1">
          导入后仍可在设计器修改。Markdown / HTML 支持图片{" "}
          <span className="font-mono">{`{{asset:ID|说明}}`}</span>、视频{" "}
          <span className="font-mono">{`{{video:ID|说明}}`}</span>，或 Markdown 语法{" "}
          <span className="font-mono">{`@[说明](url)`}</span> /{" "}
          <span className="font-mono">{`<video>`}</span>，运行时自动鉴权加载。
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-muted/80 p-3">
        <div className="space-y-1.5">
          <span className="lh-designer-pane-field-label">数据来源</span>
          <SelectFieldControl
            label="数据来源"
            value={contentSource}
            options={CONTENT_SOURCE_OPTIONS}
            onChange={(value) => {
              const source = value as ShowItemFieldMeta["contentSource"];
              patchShowItem({ contentSource: source ?? "payload" });
            }}
          />
        </div>

        {contentSource === "payload" ? (
          <div className="space-y-1.5">
            <span className="lh-designer-pane-field-label">绑定列 path</span>
            <TextFieldControl
              value={binding}
              disabled={isLockedBinding}
              onChange={(value) => onChange(syncImportMeta({ ...field, path: value }, config))}
            />
            <p className="lh-designer-pane-hint">
              {isLockedBinding
                ? `该列「${binding}」已被任务导入契约锁定，不可改名，但可调整渲染方式与布局。`
                : "题目列可存 Markdown/HTML、@用户，支持 {{asset:ID}}、{{video:ID}} 等。"}
            </p>
          </div>
        ) : null}

        {contentSource === "static" ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="lh-designer-pane-field-label">固定内容</span>
              {canInsertFromLibrary ? (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setImagePickerOpen(true)}>
                    插入图片
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setVideoPickerOpen(true)}>
                    插入视频
                  </Button>
                </div>
              ) : null}
            </div>
            <TextareaFieldControl
              value={config.staticContent ?? ""}
              rows={5}
              placeholder="支持 Markdown / HTML、@用户；图片 {{asset:12}}、视频 {{video:12}}"
              onChange={(value) => {
                patchShowItem({ staticContent: value });
                scheduleMentionDispatch(value);
              }}
            />
          </div>
        ) : null}

        {contentSource === "template" ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="lh-designer-pane-field-label">模板内容</span>
              {canInsertFromLibrary ? (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setImagePickerOpen(true)}>
                    插入图片
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setVideoPickerOpen(true)}>
                    插入视频
                  </Button>
                </div>
              ) : null}
            </div>
            <TextareaFieldControl
              value={config.templateContent ?? ""}
              rows={5}
              placeholder="例如：题目：{{prompt}}\n视频：{{video:12|演示}}"
              onChange={(value) => {
                patchShowItem({ templateContent: value });
                scheduleMentionDispatch(value);
              }}
            />
            <p className="lh-designer-pane-hint">
              使用 <span className="font-mono">{`{{列名}}`}</span> 引用 payload；图片/视频用{" "}
              <span className="font-mono">{`{{asset:ID}}`}</span> /{" "}
              <span className="font-mono">{`{{video:ID}}`}</span>。
            </p>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <span className="lh-designer-pane-field-label">渲染方式</span>
          <SelectFieldControl
            label="renderAs"
            value={config.renderAs ?? "text"}
            options={RENDER_AS_OPTIONS}
            onChange={(value) => patchShowItem({ renderAs: value as ShowItemFieldMeta["renderAs"] })}
          />
          {canInsertFromLibrary ? null : (
            <p className="lh-designer-pane-hint">
              选择 Markdown 或 HTML 后，可在固定/模板内容中从素材库插入图片。
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <span className="lh-designer-pane-field-label">布局</span>
          <SelectFieldControl
            label="layout"
            value={config.layout ?? "inline"}
            options={LAYOUT_OPTIONS}
            onChange={(value) => patchShowItem({ layout: value as ShowItemFieldMeta["layout"] })}
          />
        </div>

        <div className="space-y-1.5">
          <span className="lh-designer-pane-field-label">展示高度（运行时）</span>
          <SelectFieldControl
            label="heightMode"
            value={heightMode}
            options={HEIGHT_MODE_OPTIONS}
            onChange={(value) => {
              const mode = (value as ShowItemHeightMode) ?? "auto";
              if (mode === "fixed") {
                const nextHeight = config.maxHeight ?? 240;
                patchShowItem({ heightMode: "fixed", maxHeight: nextHeight });
                setMaxHeightDraft(String(nextHeight));
                return;
              }
              patchShowItem({ heightMode: "auto" });
            }}
          />
          {heightMode === "fixed" ? (
            <>
              <Input
                type="text"
                inputMode="numeric"
                value={maxHeightDraft}
                placeholder={`${SHOW_ITEM_DISPLAY_HEIGHT_BOUNDS.min}–${SHOW_ITEM_DISPLAY_HEIGHT_BOUNDS.max}`}
                onChange={(event) => setMaxHeightDraft(event.target.value)}
                onBlur={commitMaxHeightDraft}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    commitMaxHeightDraft();
                  }
                }}
              />
              <p className="lh-designer-pane-hint">
                固定展示区域高度，超出部分在区域内滚动。
              </p>
            </>
          ) : (
            <p className="lh-designer-pane-hint">
              短内容紧凑展示；长内容默认最高约 480px 并在区域内滚动。标注员可拖动右下角继续放大（最大{" "}
              {SHOW_ITEM_DISPLAY_HEIGHT_BOUNDS.max}px）。
            </p>
          )}
        </div>
      </div>

      <AssetLibraryPicker
        open={imagePickerOpen}
        onOpenChange={setImagePickerOpen}
        mimeTypePrefix="image/"
        categoryCode="asset"
        title="选择图片"
        onSelect={(asset) => insertMediaToken(asset, "image")}
      />
      <AssetLibraryPicker
        open={videoPickerOpen}
        onOpenChange={setVideoPickerOpen}
        mimeTypePrefix="video/"
        categoryCode="asset"
        title="选择视频"
        onSelect={(asset) => insertMediaToken(asset, "video")}
      />
    </section>
  );
}
