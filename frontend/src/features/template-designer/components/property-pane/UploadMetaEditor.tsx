"use client";

import type { UploadFieldMeta } from "@/low-code/schema/types";
import { SelectFieldControl } from "@/low-code/components/fields/controls/SelectFieldControl";
import { SwitchFieldControl } from "@/low-code/components/fields/controls/SwitchFieldControl";
import { Input } from "@/components/ui/input";

interface UploadMetaEditorProps {
  title?: string;
  variant?: "file" | "image";
  value?: UploadFieldMeta;
  onChange: (next: UploadFieldMeta) => void;
}

const DEFAULT_UPLOAD: UploadFieldMeta = {
  multiple: false,
  maxCount: 9,
  maxSizeMb: 5,
  accept: "image/*",
  displayMode: "thumbnail",
  previewOnClick: true,
  showFileName: true,
  allowRename: true,
};

const DISPLAY_MODE_OPTIONS = [
  { label: "缩略图网格", value: "thumbnail" },
  { label: "列表", value: "list" },
  { label: "卡片", value: "card" },
];

export function UploadMetaEditor({
  title = "上传配置",
  variant = "file",
  value,
  onChange,
}: UploadMetaEditorProps) {
  const config = { ...DEFAULT_UPLOAD, ...value };
  const multiple = config.multiple === true;
  const isImage = variant === "image";

  function patch(next: Partial<UploadFieldMeta>) {
    onChange({ ...config, ...next });
  }

  return (
    <section className="space-y-3">
      <div>
        <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100">{title}</h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {isImage ? "多图、展示方式、点击预览与大小限制。" : "控制多选、数量上限、单文件大小与 accept。"}
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-muted/80 p-3">
        {isImage ? (
          <>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">展示方式</span>
              <SelectFieldControl
                label="展示方式"
                value={config.displayMode ?? "thumbnail"}
                options={DISPLAY_MODE_OPTIONS}
                onChange={(next) =>
                  patch({
                    displayMode:
                      next === "list" || next === "card" || next === "thumbnail" ? next : "thumbnail",
                  })
                }
              />
            </div>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700 dark:text-slate-200">点击预览大图</span>
              <SwitchFieldControl
                value={config.previewOnClick !== false}
                onChange={(checked) => patch({ previewOnClick: checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700 dark:text-slate-200">显示图片名</span>
              <SwitchFieldControl
                value={config.showFileName !== false}
                onChange={(checked) => patch({ showFileName: checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700 dark:text-slate-200">允许修改图片名</span>
              <SwitchFieldControl
                value={config.allowRename !== false}
                onChange={(checked) => patch({ allowRename: checked })}
              />
            </label>
          </>
        ) : null}

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-700 dark:text-slate-200">
            {isImage ? "允许多图" : "允许多选"}
          </span>
          <SwitchFieldControl
            value={multiple}
            onChange={(checked) =>
              patch({
                multiple: checked,
                maxCount: checked ? (config.maxCount ?? 9) : 1,
              })
            }
          />
        </label>

        {multiple ? (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {isImage ? "最大图片数" : "最大文件数"}
            </span>
            <Input
              type="number"
              min={1}
              max={99}
              value={config.maxCount ?? 9}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                patch({ maxCount: Number.isFinite(parsed) ? Math.max(1, Math.min(99, parsed)) : 9 });
              }}
            />
          </div>
        ) : null}

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">单文件大小上限（MB）</span>
          <Input
            type="number"
            min={1}
            max={100}
            value={config.maxSizeMb ?? 5}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              patch({ maxSizeMb: Number.isFinite(parsed) ? Math.max(1, Math.min(100, parsed)) : 5 });
            }}
          />
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">accept 类型</span>
          <Input
            value={config.accept ?? (isImage ? "image/*" : "*/*")}
            placeholder={isImage ? "image/*" : "*/*"}
            onChange={(event) => patch({ accept: event.target.value || (isImage ? "image/*" : "*/*") })}
          />
        </div>
      </div>
    </section>
  );
}
