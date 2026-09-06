"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { TextFieldControl } from "@/low-code/components/fields/controls/TextFieldControl";
import { SelectFieldControl } from "@/low-code/components/fields/controls/SelectFieldControl";
import { SwitchFieldControl } from "@/low-code/components/fields/controls/SwitchFieldControl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FileAssetSummary } from "@/features/assets/file-assets-api";
import { AssetLibraryPicker } from "@/features/assets/AssetLibraryPicker";
import type {
  FileAssetRef,
  FormFieldSchema,
  ShowFileFieldMeta,
  ShowImageFieldMeta,
  ShowVideoFieldMeta,
} from "@/low-code/schema/types";
import { withImportFieldMeta } from "@/low-code/schema/import-field-meta";
import { useDesignerEditorStore } from "../../stores/designer-editor-store";

const SOURCE_OPTIONS = [
  { label: "绑定题目数据（payload 列）", value: "payload" },
  { label: "素材库文件", value: "asset" },
  { label: "固定 URL", value: "static" },
];

const DISPLAY_MODE_OPTIONS = [
  { label: "缩略图网格", value: "thumbnail" },
  { label: "列表", value: "list" },
  { label: "卡片", value: "card" },
];

type ShowAssetVariant = "showImage" | "showFile" | "showVideo";

interface ShowAssetMetaEditorProps {
  variant: ShowAssetVariant;
  field: FormFieldSchema;
  onChange: (patch: Partial<FormFieldSchema>) => void;
}

function syncImportMeta(
  field: FormFieldSchema,
  variant: ShowAssetVariant,
  source: ShowFileFieldMeta["contentSource"],
): Partial<FormFieldSchema> {
  const role = source === "payload" ? "display" : "runtime";
  if (variant === "showImage") {
    return withImportFieldMeta(field, role);
  }
  return withImportFieldMeta(field, role);
}

function assetFromSummary(asset: FileAssetSummary): FileAssetRef {
  return {
    fileId: asset.id,
    name: asset.originalName,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
  };
}

function joinStaticUrls(urls?: string[]): string {
  return (urls ?? []).join("\n");
}

function parseStaticUrls(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ShowAssetMetaEditor({ variant, field, onChange }: ShowAssetMetaEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const importContract = useDesignerEditorStore((state) => state.importContract);
  const meta =
    (variant === "showImage"
      ? field.showImage
      : variant === "showVideo"
        ? field.showVideo
        : field.showFile) ?? { contentSource: "payload" };
  const imageMeta = meta as ShowImageFieldMeta;
  const videoMeta = meta as ShowVideoFieldMeta;
  const contentSource = meta.contentSource ?? "payload";
  const binding = field.path ?? field.key;
  const lockedKeys = importContract?.requiredKeys ?? [];
  const isLockedBinding = contentSource === "payload" && lockedKeys.includes(binding);
  const mimePrefix =
    variant === "showImage" ? "image/" : variant === "showVideo" ? "video/" : undefined;
  const isMultiImage = variant === "showImage" && imageMeta.multiple === true;
  const selectedAssets =
    isMultiImage && imageMeta.assets?.length
      ? imageMeta.assets
      : meta.asset?.fileId
        ? [meta.asset]
        : [];

  function patchMeta(next: Partial<ShowImageFieldMeta & ShowFileFieldMeta & ShowVideoFieldMeta>) {
    const merged = { ...meta, ...next };
    const patch: Partial<FormFieldSchema> =
      variant === "showImage"
        ? { showImage: merged }
        : variant === "showVideo"
          ? { showVideo: merged }
          : { showFile: merged };
    onChange(syncImportMeta({ ...field, ...patch }, variant, merged.contentSource));
  }

  function applyAsset(asset: FileAssetSummary) {
    const ref = assetFromSummary(asset);
    if (variant === "showImage" && imageMeta.multiple) {
      const existing = imageMeta.assets ?? (imageMeta.asset ? [imageMeta.asset] : []);
      if (existing.some((item) => String(item.fileId) === String(ref.fileId))) {
        return;
      }
      const maxCount = Math.max(1, Math.min(99, imageMeta.maxCount ?? 9));
      if (existing.length >= maxCount) {
        return;
      }
      patchMeta({
        contentSource: "asset",
        assets: [...existing, ref],
        asset: undefined,
      });
      return;
    }
    patchMeta({ contentSource: "asset", asset: ref, assets: undefined });
  }

  function removeAsset(fileId: number | string) {
    if (!isMultiImage) {
      patchMeta({ asset: undefined });
      return;
    }
    const next = selectedAssets.filter((item) => String(item.fileId) !== String(fileId));
    patchMeta({ assets: next.length > 0 ? next : undefined, asset: undefined });
  }

  return (
    <section className="space-y-3">
      <div>
        <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100">
          {variant === "showImage" ? "图片展示" : variant === "showVideo" ? "视频展示" : "文件展示"}
        </h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          只读展示，不参与标注提交。素材库与固定 URL 为运行时配置。
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-muted/80 p-3">
        <SelectFieldControl
          label="数据来源"
          value={contentSource}
          options={SOURCE_OPTIONS}
          onChange={(value) => patchMeta({ contentSource: value as ShowImageFieldMeta["contentSource"] })}
        />

        {contentSource === "payload" ? (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">绑定列 path</span>
            <TextFieldControl
              value={binding}
              disabled={isLockedBinding}
              onChange={(value) =>
                onChange(syncImportMeta({ ...field, path: value }, variant, "payload"))
              }
            />
            {variant === "showImage" && isMultiImage ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                多图模式下 payload 列支持数组、JSON 数组，或逗号/换行分隔的 URL 列表。
              </p>
            ) : null}
          </div>
        ) : null}

        {contentSource === "asset" ? (
          <div className="space-y-2">
            {selectedAssets.length === 0 ? (
              <p className="text-xs text-slate-600 dark:text-slate-300">未选择素材</p>
            ) : (
              <ul className="space-y-1.5">
                {selectedAssets.map((asset) => (
                  <li
                    key={String(asset.fileId)}
                    className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                  >
                    <span className="min-w-0 truncate">
                      {asset.name}（#{asset.fileId}）
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-slate-400 hover:text-red-500"
                      onClick={() => removeAsset(asset.fileId)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
              {isMultiImage ? "从素材库添加" : "从素材库选择"}
            </Button>
          </div>
        ) : null}

        {contentSource === "static" ? (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {isMultiImage ? "固定 URL（一行一个）" : "固定 URL"}
            </span>
            {isMultiImage ? (
              <textarea
                className="min-h-[88px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                value={joinStaticUrls(imageMeta.staticUrls ?? (imageMeta.staticUrl ? [imageMeta.staticUrl] : []))}
                placeholder="https://example.com/a.jpg&#10;https://example.com/b.jpg"
                onChange={(event) => {
                  const urls = parseStaticUrls(event.target.value);
                  patchMeta({
                    staticUrls: urls.length > 0 ? urls : undefined,
                    staticUrl: undefined,
                  });
                }}
              />
            ) : (
              <TextFieldControl
                value={meta.staticUrl ?? ""}
                placeholder="https://..."
                onChange={(value) => patchMeta({ staticUrl: value, staticUrls: undefined })}
              />
            )}
          </div>
        ) : null}

        {variant === "showImage" ? (
          <>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700 dark:text-slate-200">多图展示</span>
              <SwitchFieldControl
                value={imageMeta.multiple === true}
                onChange={(checked) =>
                  patchMeta({
                    multiple: checked,
                    maxCount: checked ? (imageMeta.maxCount ?? 9) : undefined,
                    assets: checked && meta.asset ? [meta.asset] : imageMeta.assets,
                    asset: checked ? undefined : imageMeta.assets?.[0] ?? meta.asset,
                    staticUrls:
                      checked && meta.staticUrl
                        ? [meta.staticUrl]
                        : checked
                          ? imageMeta.staticUrls
                          : undefined,
                    staticUrl: checked ? undefined : imageMeta.staticUrls?.[0] ?? meta.staticUrl,
                  })
                }
              />
            </label>

            {isMultiImage ? (
              <>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">最大图片数</span>
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={imageMeta.maxCount ?? 9}
                    onChange={(event) => {
                      const parsed = Number(event.target.value);
                      patchMeta({
                        maxCount: Number.isFinite(parsed) ? Math.max(1, Math.min(99, parsed)) : 9,
                      });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">展示方式</span>
                  <SelectFieldControl
                    label="displayMode"
                    value={imageMeta.displayMode ?? "thumbnail"}
                    options={DISPLAY_MODE_OPTIONS}
                    onChange={(value) =>
                      patchMeta({
                        displayMode:
                          value === "list" || value === "card" || value === "thumbnail" ? value : "thumbnail",
                      })
                    }
                  />
                </div>
                <label className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-700 dark:text-slate-200">点击预览大图</span>
                  <SwitchFieldControl
                    value={imageMeta.previewOnClick !== false}
                    onChange={(checked) => patchMeta({ previewOnClick: checked })}
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-700 dark:text-slate-200">显示图片名</span>
                  <SwitchFieldControl
                    value={imageMeta.showFileName !== false}
                    onChange={(checked) => patchMeta({ showFileName: checked })}
                  />
                </label>
              </>
            ) : null}

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">替代文本 alt</span>
              <TextFieldControl
                value={imageMeta.alt ?? ""}
                onChange={(value) => patchMeta({ alt: value })}
              />
            </div>
            <SelectFieldControl
              label="缩放"
              value={imageMeta.fit ?? "contain"}
              options={[
                { label: "适应 contain", value: "contain" },
                { label: "铺满 cover", value: "cover" },
              ]}
              onChange={(value) => patchMeta({ fit: value as ShowImageFieldMeta["fit"] })}
            />
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">图片最大高度（运行时 px）</span>
              <Input
                type="number"
                min={80}
                max={640}
                value={imageMeta.maxHeight ?? 280}
                onChange={(event) => {
                  const parsed = Number(event.target.value);
                  patchMeta({
                    maxHeight: Number.isFinite(parsed) ? Math.max(80, Math.min(640, parsed)) : 280,
                  });
                }}
              />
            </div>
          </>
        ) : variant === "showVideo" ? (
          <>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">播放器最大高度（运行时 px）</span>
              <Input
                type="number"
                min={120}
                max={720}
                value={videoMeta.maxHeight ?? 360}
                onChange={(event) => {
                  const parsed = Number(event.target.value);
                  patchMeta({
                    maxHeight: Number.isFinite(parsed) ? Math.max(120, Math.min(720, parsed)) : 360,
                  });
                }}
              />
            </div>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700 dark:text-slate-200">显示播放控件</span>
              <SwitchFieldControl
                value={videoMeta.controls !== false}
                onChange={(checked) => patchMeta({ controls: checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700 dark:text-slate-200">显示视频名</span>
              <SwitchFieldControl
                value={videoMeta.showFileName !== false}
                onChange={(checked) => patchMeta({ showFileName: checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700 dark:text-slate-200">自动播放</span>
              <SwitchFieldControl
                value={videoMeta.autoPlay === true}
                onChange={(checked) => patchMeta({ autoPlay: checked, muted: checked ? true : videoMeta.muted })}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700 dark:text-slate-200">静音</span>
              <SwitchFieldControl
                value={videoMeta.muted === true}
                onChange={(checked) => patchMeta({ muted: checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700 dark:text-slate-200">循环播放</span>
              <SwitchFieldControl
                value={videoMeta.loop === true}
                onChange={(checked) => patchMeta({ loop: checked })}
              />
            </label>
          </>
        ) : (
          <>
            <SelectFieldControl
              label="显示文件大小"
              value={(meta as ShowFileFieldMeta).showSize === false ? "false" : "true"}
              options={[
                { label: "显示", value: "true" },
                { label: "隐藏", value: "false" },
              ]}
              onChange={(value) => patchMeta({ showSize: value !== "false" })}
            />
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">展示区域高度（运行时 px）</span>
              <Input
                type="number"
                min={48}
                max={200}
                value={(meta as ShowFileFieldMeta).maxHeight ?? 72}
                onChange={(event) => {
                  const parsed = Number(event.target.value);
                  patchMeta({
                    maxHeight: Number.isFinite(parsed) ? Math.max(48, Math.min(200, parsed)) : 72,
                  });
                }}
              />
            </div>
          </>
        )}
      </div>

      <AssetLibraryPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        mimeTypePrefix={mimePrefix}
        categoryCode="asset"
        title={
          variant === "showVideo"
            ? "选择视频"
            : isMultiImage
              ? "添加图片"
              : "选择图片"
        }
        multiple={isMultiImage}
        onSelect={applyAsset}
        onSelectMany={(assets) => assets.forEach((asset) => applyAsset(asset))}
      />
    </section>
  );
}
