import type {
  FileAssetRef,
  FormFieldSchema,
  ImageUploadDisplayMode,
  ShowAssetContentSource,
  ShowFileFieldMeta,
  ShowImageFieldMeta,
  ShowVideoFieldMeta,
} from "../../schema/types";

function resolveFileSizeBytes(record: Record<string, unknown>): number | undefined {
  if (typeof record.sizeBytes === "number") {
    return record.sizeBytes;
  }
  if (typeof record.size === "number") {
    return record.size;
  }
  return undefined;
}

export function parseFileAssetRef(value: unknown): FileAssetRef | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "number" || typeof value === "string") {
    const id = typeof value === "number" ? value : Number(value);
    if (!Number.isNaN(id) && id > 0) {
      return { fileId: id, name: "file" };
    }
    return null;
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const rawId = record.fileId ?? record.id;
  if (rawId == null) {
    return null;
  }
  const fileId = typeof rawId === "number" ? rawId : Number(rawId);
  if (typeof rawId === "string" && rawId.trim()) {
    return {
      fileId: rawId,
      name: String(record.name ?? record.originalName ?? "file"),
      mimeType: typeof record.mimeType === "string" ? record.mimeType : undefined,
      sizeBytes: resolveFileSizeBytes(record),
    };
  }
  if (!Number.isNaN(fileId) && fileId > 0) {
    return {
      fileId,
      name: String(record.name ?? record.originalName ?? "file"),
      mimeType: typeof record.mimeType === "string" ? record.mimeType : undefined,
      sizeBytes: resolveFileSizeBytes(record),
    };
  }
  return null;
}

function isImageUrl(value: string): boolean {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/") ||
    value.startsWith("blob:")
  );
}

function parseSinglePayloadImageItem(item: unknown): Array<{ ref?: FileAssetRef; url?: string }> {
  if (typeof item === "string") {
    const trimmed = item.trim();
    if (!trimmed) {
      return [];
    }
    if (isImageUrl(trimmed)) {
      return [{ url: trimmed }];
    }
    const id = Number(trimmed);
    if (!Number.isNaN(id) && id > 0) {
      return [{ ref: { fileId: id, name: "file" } }];
    }
    return [];
  }
  const ref = parseFileAssetRef(item);
  if (ref) {
    return [{ ref }];
  }
  return [];
}

export function parseShowImagePayloadValue(value: unknown): Array<{ ref?: FileAssetRef; url?: string }> {
  if (value == null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => parseSinglePayloadImageItem(item));
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.flatMap((item) => parseSinglePayloadImageItem(item));
        }
      } catch {
        // fall through
      }
    }
    if (trimmed.includes("\n") || trimmed.includes(",")) {
      return trimmed.split(/[\n,]+/).flatMap((part) => parseSinglePayloadImageItem(part.trim()));
    }
    return parseSinglePayloadImageItem(trimmed);
  }
  return parseSinglePayloadImageItem(value);
}

export function resolveShowAssetContentSource(
  meta: ShowImageFieldMeta | ShowFileFieldMeta | ShowVideoFieldMeta | undefined,
): ShowAssetContentSource {
  return meta?.contentSource ?? "payload";
}

export interface ShowVideoDisplayConfig {
  showFileName: boolean;
  maxHeight: number;
  controls: boolean;
  autoPlay: boolean;
  muted: boolean;
  loop: boolean;
}

export function resolveShowVideoDisplayConfig(meta?: ShowVideoFieldMeta): ShowVideoDisplayConfig {
  return {
    showFileName: meta?.showFileName !== false,
    maxHeight: Math.max(120, Math.min(720, meta?.maxHeight ?? 360)),
    controls: meta?.controls !== false,
    autoPlay: meta?.autoPlay === true,
    muted: meta?.muted === true || meta?.autoPlay === true,
    loop: meta?.loop === true,
  };
}

export interface ShowImageDisplayConfig {
  multiple: boolean;
  maxCount: number;
  displayMode: ImageUploadDisplayMode;
  previewOnClick: boolean;
  showFileName: boolean;
  fit: "contain" | "cover";
  maxHeight: number;
}

export function resolveShowImageDisplayConfig(meta?: ShowImageFieldMeta): ShowImageDisplayConfig {
  const multiple = meta?.multiple === true;
  const displayMode = meta?.displayMode ?? "thumbnail";
  return {
    multiple,
    maxCount: multiple ? Math.max(1, Math.min(99, meta?.maxCount ?? 9)) : 1,
    displayMode:
      displayMode === "list" || displayMode === "card" || displayMode === "thumbnail"
        ? displayMode
        : "thumbnail",
    previewOnClick: meta?.previewOnClick !== false,
    showFileName: meta?.showFileName !== false,
    fit: meta?.fit === "cover" ? "cover" : "contain",
    maxHeight: Math.max(80, Math.min(640, meta?.maxHeight ?? 280)),
  };
}

export interface ResolvedShowImage {
  fileId?: number | string;
  directUrl?: string;
  alt?: string;
  fit: "contain" | "cover";
  maxHeight: number;
  label?: string;
  sizeBytes?: number;
}

function toResolvedFromRef(
  ref: FileAssetRef,
  meta: ShowImageFieldMeta | undefined,
  field: FormFieldSchema,
  fit: "contain" | "cover",
  maxHeight: number,
): ResolvedShowImage {
  return {
    fileId: ref.fileId,
    alt: meta?.alt ?? ref.name,
    fit,
    maxHeight,
    label: ref.name,
    sizeBytes: ref.sizeBytes,
  };
}

function toResolvedFromUrl(
  url: string,
  meta: ShowImageFieldMeta | undefined,
  field: FormFieldSchema,
  fit: "contain" | "cover",
  maxHeight: number,
  label?: string,
): ResolvedShowImage {
  return {
    directUrl: url,
    alt: meta?.alt ?? field.label,
    fit,
    maxHeight,
    label: label ?? url.split("/").pop(),
  };
}

export function resolveShowImageDisplayList(
  field: FormFieldSchema,
  value: unknown,
): ResolvedShowImage[] {
  const meta = field.showImage;
  const source = resolveShowAssetContentSource(meta);
  const config = resolveShowImageDisplayConfig(meta);
  const { fit, maxHeight, maxCount } = config;

  if (source === "asset") {
    const refs =
      meta?.assets && meta.assets.length > 0
        ? meta.assets
        : meta?.asset?.fileId
          ? [meta.asset]
          : [];
    return refs
      .filter((ref) => ref.fileId != null)
      .slice(0, maxCount)
      .map((ref) => toResolvedFromRef(ref, meta, field, fit, maxHeight));
  }

  if (source === "static") {
    const urls =
      meta?.staticUrls && meta.staticUrls.length > 0
        ? meta.staticUrls
        : meta?.staticUrl?.trim()
          ? [meta.staticUrl.trim()]
          : [];
    return urls
      .map((url) => url.trim())
      .filter(Boolean)
      .slice(0, maxCount)
      .map((url) => toResolvedFromUrl(url, meta, field, fit, maxHeight));
  }

  return parseShowImagePayloadValue(value)
    .slice(0, maxCount)
    .map((item) => {
      if (item.ref) {
        return toResolvedFromRef(item.ref, meta, field, fit, maxHeight);
      }
      if (item.url) {
        return toResolvedFromUrl(item.url, meta, field, fit, maxHeight);
      }
      return null;
    })
    .filter((item): item is ResolvedShowImage => item != null);
}

export function resolveShowImageDisplay(
  field: FormFieldSchema,
  value: unknown,
): ResolvedShowImage | null {
  return resolveShowImageDisplayList(field, value)[0] ?? null;
}

function resolveShowAssetFileDisplay(
  meta: ShowFileFieldMeta | ShowVideoFieldMeta | undefined,
  value: unknown,
): ResolvedShowFile | null {
  const source = resolveShowAssetContentSource(meta);

  if (source === "asset") {
    const asset = meta?.asset;
    if (!asset?.fileId) {
      return null;
    }
    return {
      fileId: asset.fileId,
      name: asset.name,
      sizeBytes: asset.sizeBytes,
      mimeType: asset.mimeType,
    };
  }

  if (source === "static") {
    const url = meta?.staticUrl?.trim();
    if (!url) {
      return null;
    }
    return { directUrl: url, name: url.split("/").pop() ?? "file" };
  }

  if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
      return { directUrl: trimmed, name: trimmed.split("/").pop() ?? "file" };
    }
  }

  const ref = parseFileAssetRef(value);
  if (ref) {
    return {
      fileId: ref.fileId,
      name: ref.name,
      sizeBytes: ref.sizeBytes,
      mimeType: ref.mimeType,
    };
  }

  return null;
}

export function resolveShowFileDisplay(field: FormFieldSchema, value: unknown): ResolvedShowFile | null {
  return resolveShowAssetFileDisplay(field.showFile, value);
}

export function resolveShowVideoDisplay(field: FormFieldSchema, value: unknown): ResolvedShowFile | null {
  return resolveShowAssetFileDisplay(field.showVideo, value);
}

export interface ResolvedShowFile {
  fileId?: number | string;
  directUrl?: string;
  name: string;
  sizeBytes?: number;
  mimeType?: string;
}
