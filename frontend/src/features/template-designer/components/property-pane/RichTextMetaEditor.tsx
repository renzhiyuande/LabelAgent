"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { SwitchFieldControl } from "@/low-code/components/fields/controls/SwitchFieldControl";
import { SelectFieldControl } from "@/low-code/components/fields/controls/SelectFieldControl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FileAssetSummary } from "@/features/assets/file-assets-api";
import { AssetLibraryPicker } from "@/features/assets/AssetLibraryPicker";
import type { FileAssetRef, FormFieldSchema, RichTextFieldMeta } from "@/low-code/schema/types";

interface RichTextMetaEditorProps {
  field: FormFieldSchema;
  onChange: (patch: Partial<FormFieldSchema>) => void;
}

const DEFAULT_RICH_TEXT: RichTextFieldMeta = {
  enableAssetLibrary: false,
  imageMaxHeight: 240,
  imageFit: "contain",
  previewImageResize: true,
};

function assetFromSummary(asset: FileAssetSummary): FileAssetRef {
  return {
    fileId: asset.id,
    name: asset.originalName,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
  };
}

export function RichTextMetaEditor({ field, onChange }: RichTextMetaEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const config = { ...DEFAULT_RICH_TEXT, ...field.richText };
  const enabled = config.enableAssetLibrary === true;
  const assets = config.assets ?? [];

  function patchRichText(next: Partial<RichTextFieldMeta>) {
    onChange({ richText: { ...config, ...next } });
  }

  function applyAsset(asset: FileAssetSummary) {
    const ref = assetFromSummary(asset);
    if (assets.some((item) => String(item.fileId) === String(ref.fileId))) {
      return;
    }
    patchRichText({ assets: [...assets, ref] });
  }

  function removeAsset(fileId: number | string) {
    patchRichText({
      assets: assets.filter((item) => String(item.fileId) !== String(fileId)),
    });
  }

  return (
    <section className="space-y-3">
      <div>
        <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100">富文本配置</h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          开启后，标注员可在编辑器工具栏从素材库插入图片；占位符为{" "}
          <span className="font-mono">{`{{asset:文件ID|说明}}`}</span>，运行时自动鉴权加载。
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-muted/80 p-3">
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-700 dark:text-slate-200">启用素材库插入</span>
          <SwitchFieldControl
            value={enabled}
            onChange={(checked) =>
              patchRichText({
                enableAssetLibrary: checked,
                assets: checked ? assets : undefined,
              })
            }
          />
        </label>

        {enabled ? (
          <div className="space-y-3 border-t border-slate-200 pt-3 dark:border-slate-700">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">图片最大高度（px）</span>
                <Input
                  type="number"
                  min={80}
                  max={640}
                  value={config.imageMaxHeight ?? 240}
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    patchRichText({
                      imageMaxHeight: Number.isFinite(parsed)
                        ? Math.max(80, Math.min(640, parsed))
                        : 240,
                    });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">缩放方式</span>
                <SelectFieldControl
                  label="imageFit"
                  value={config.imageFit ?? "contain"}
                  options={[
                    { label: "适应 contain", value: "contain" },
                    { label: "铺满 cover", value: "cover" },
                  ]}
                  onChange={(value) =>
                    patchRichText({ imageFit: value === "cover" ? "cover" : "contain" })
                  }
                />
              </div>
            </div>

            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700 dark:text-slate-200">预览时拖动底边调整图片大小</span>
              <SwitchFieldControl
                value={config.previewImageResize !== false}
                onChange={(checked) => patchRichText({ previewImageResize: checked })}
              />
            </label>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  已登记素材（{assets.length}）
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
                  从素材库添加
                </Button>
              </div>
              {assets.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  可在编辑器中插入图片，或在此预先登记素材供参考。
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {assets.map((asset) => (
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
            </div>
          </div>
        ) : null}
      </div>

      <AssetLibraryPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        mimeTypePrefix="image/"
        categoryCode="asset"
        title="插入图片"
        onSelect={applyAsset}
      />
    </section>
  );
}
