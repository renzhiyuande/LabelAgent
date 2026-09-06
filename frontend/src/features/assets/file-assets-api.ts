import type { PageResponse } from "../../types";
import { ApiError, request } from "../../utils/apiClient";
import type { ApiResponse } from "../../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export interface FileAssetSummary {
  id: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  categoryCode: string;
  isPublic: boolean;
  uploadedBy: number;
  uploadedAt: string;
  downloadUrl: string;
}

export interface ListFileAssetsParams {
  page?: number;
  pageSize?: number;
  categoryCode?: string;
  mimeTypePrefix?: string;
}

export function resolveFileDownloadUrl(downloadUrl?: string, fileId?: number | string): string {
  if (!downloadUrl && fileId == null) {
    return "";
  }
  const path = downloadUrl ?? `/api/v1/files/${fileId}/download`;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
}

export async function listFileAssets(params: ListFileAssetsParams = {}): Promise<PageResponse<FileAssetSummary>> {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 1));
  search.set("pageSize", String(params.pageSize ?? 20));
  if (params.categoryCode) {
    search.set("categoryCode", params.categoryCode);
  }
  if (params.mimeTypePrefix) {
    search.set("mimeTypePrefix", params.mimeTypePrefix);
  }
  return request<PageResponse<FileAssetSummary>>(`/api/v1/files?${search.toString()}`);
}

export async function getFileAsset(id: number | string): Promise<FileAssetSummary> {
  return request<FileAssetSummary>(`/api/v1/files/${id}`);
}

export async function uploadFileAsset(file: File, categoryCode = "form"): Promise<FileAssetSummary> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("categoryCode", categoryCode);

  const token = localStorage.getItem("labelhub.accessToken");
  const response = await fetch(`${API_BASE_URL}/api/v1/files/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  const rawBody = await response.text();
  let payload: ApiResponse<FileAssetSummary> | null = null;
  if (rawBody) {
    try {
      payload = JSON.parse(rawBody) as ApiResponse<FileAssetSummary>;
    } catch {
      throw new ApiError(
        response.ok ? "上传响应解析失败" : "文件上传失败",
        "REQUEST_FAILED",
        "",
        response.status,
      );
    }
  }

  if (!response.ok || !payload || payload.code !== "SUCCESS" || !payload.data) {
    const message =
      payload && typeof payload.message === "string" && payload.message.trim()
        ? payload.message
        : "文件上传失败";
    const code = payload?.code ?? "REQUEST_FAILED";
    const traceId = payload?.traceId ?? "";
    throw new ApiError(message, code, traceId, response.status);
  }

  return payload.data;
}

export async function deleteFileAsset(id: number | string): Promise<void> {
  await request<void>(`/api/v1/files/${id}`, { method: "DELETE" });
}

const blobUrlCache = new Map<string, string>();

export async function fetchAuthenticatedFileBlobUrl(fileId: number | string): Promise<string> {
  const key = String(fileId);
  const cached = blobUrlCache.get(key);
  if (cached) {
    return cached;
  }
  const token = localStorage.getItem("labelhub.accessToken");
  const response = await fetch(resolveFileDownloadUrl(undefined, fileId), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) {
    throw new Error("文件下载失败");
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  blobUrlCache.set(key, blobUrl);
  return blobUrl;
}

export function revokeAuthenticatedFileBlobUrl(fileId: number | string): void {
  const key = String(fileId);
  const blobUrl = blobUrlCache.get(key);
  if (!blobUrl) {
    return;
  }
  URL.revokeObjectURL(blobUrl);
  blobUrlCache.delete(key);
}

function resolvePathname(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }
  return url;
}

/** 需携带 JWT 的 LabelHub API 下载路径（浏览器直链不会带 Authorization）。 */
export function isProtectedApiDownloadPath(url: string): boolean {
  return resolvePathname(url).startsWith("/api/");
}

function resolveFilenameFromDisposition(header: string | null): string | undefined {
  if (!header) {
    return undefined;
  }
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const basicMatch = /filename="([^"]+)"/i.exec(header);
  return basicMatch?.[1];
}

function triggerBrowserFileDownload(blob: Blob, fileName: string) {
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

export async function openAuthenticatedDownload(options: {
  url: string;
  fileId?: number | string;
  fileName?: string;
}): Promise<void> {
  const downloadUrl = resolveFileDownloadUrl(options.url, options.fileId);
  if (!downloadUrl) {
    throw new Error("下载地址无效");
  }
  if (!isProtectedApiDownloadPath(downloadUrl)) {
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
    return;
  }
  const token = localStorage.getItem("labelhub.accessToken");
  const response = await fetch(downloadUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) {
    let message = "文件下载失败";
    try {
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (typeof payload.message === "string" && payload.message.trim()) {
        message = payload.message;
      }
    } catch {
      // ignore non-json body
    }
    throw new ApiError(message, "REQUEST_FAILED", "", response.status);
  }
  const blob = await response.blob();
  const resolvedName =
    options.fileName
    ?? resolveFilenameFromDisposition(response.headers.get("Content-Disposition"))
    ?? "download";
  triggerBrowserFileDownload(blob, resolvedName);
}
