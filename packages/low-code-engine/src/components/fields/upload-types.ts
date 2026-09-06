import type { ImageUploadDisplayMode, UploadFieldMeta } from "../../schema/types";

export interface ImageUploadConfig {
  multiple: boolean;
  maxCount: number;
  maxSizeMb: number;
  accept: string;
  displayMode: ImageUploadDisplayMode;
  previewOnClick: boolean;
  showFileName: boolean;
  allowRename: boolean;
}

export interface FileUploadConfig {
  maxSizeMb: number;
  accept: string;
}

export function resolveImageUploadConfig(upload?: UploadFieldMeta): ImageUploadConfig {
  const multiple = upload?.multiple === true;
  const displayMode = upload?.displayMode ?? "thumbnail";
  return {
    multiple,
    maxCount: multiple ? Math.max(1, Math.min(99, upload?.maxCount ?? 9)) : 1,
    maxSizeMb: Math.max(1, Math.min(100, upload?.maxSizeMb ?? 5)),
    accept: upload?.accept?.trim() || "image/*",
    displayMode:
      displayMode === "list" || displayMode === "card" || displayMode === "thumbnail"
        ? displayMode
        : "thumbnail",
    previewOnClick: upload?.previewOnClick !== false,
    showFileName: upload?.showFileName !== false,
    allowRename: upload?.allowRename !== false,
  };
}

export function resolveFileUploadConfig(upload?: UploadFieldMeta): FileUploadConfig {
  return {
    maxSizeMb: Math.max(1, Math.min(100, upload?.maxSizeMb ?? 10)),
    accept: upload?.accept?.trim() || "*/*",
  };
}

export interface UploadedFileRef {
  id?: number | string;
  name: string;
  size: number;
  mimeType: string;
  url?: string;
  /** 历史本地预览数据，新上传不再写入 */
  local?: boolean;
}

export function isUploadedFileRef(value: unknown): value is UploadedFileRef {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "name" in value &&
    typeof (value as UploadedFileRef).name === "string"
  );
}

export function normalizeUploadedFile(value: unknown): UploadedFileRef | null {
  if (!isUploadedFileRef(value)) {
    return null;
  }
  if (!value.name.trim()) {
    return null;
  }
  return value;
}

export function normalizeUploadedFiles(value: unknown): UploadedFileRef[] {
  if (!Array.isArray(value)) {
    return normalizeUploadedFile(value) ? [normalizeUploadedFile(value)!] : [];
  }
  return value.map((item) => normalizeUploadedFile(item)).filter((item): item is UploadedFileRef => item != null);
}

export function formatUploadedFileLabel(file: UploadedFileRef): string {
  const sizeKb = file.size > 0 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : "";
  return sizeKb ? `${file.name} (${sizeKb})` : file.name;
}

export function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function matchesAccept(file: File, accept: string): boolean {
  if (!accept || accept === "*/*") {
    return true;
  }
  const tokens = accept.split(",").map((item) => item.trim().toLowerCase());
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  return tokens.some((token) => {
    if (token.endsWith("/*")) {
      return fileType.startsWith(token.slice(0, -1));
    }
    if (token.startsWith(".")) {
      return fileName.endsWith(token);
    }
    return fileType === token;
  });
}

export function validateUploadFile(
  file: File,
  config: Pick<FileUploadConfig, "maxSizeMb" | "accept">,
): string | null {
  if (!matchesAccept(file, config.accept)) {
    return `「${file.name}」不符合 accept：${config.accept}`;
  }
  const maxBytes = config.maxSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return `「${file.name}」超过 ${config.maxSizeMb} MB 限制`;
  }
  return null;
}
