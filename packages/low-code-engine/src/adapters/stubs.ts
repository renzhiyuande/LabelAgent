import React from "react";
import type { UploadResult } from "./interfaces";

// File asset stubs
export function stubUseAuthenticatedFileUrl(
  _fileId?: string | number | null,
  directUrl?: string | null,
): string | null {
  return directUrl ?? null;
}
export async function stubOpenAuthenticatedDownload(_options: {
  url: string;
  fileId?: string | number;
  fileName?: string;
}): Promise<void> {
  console.warn("[LowCodeEngine] FileAssetService not configured.");
}
export function stubResolveFileDownloadUrl(downloadUrl?: string): string | undefined { return downloadUrl; }
export async function stubUploadFileAsset(
  _file: File,
  _categoryOrOptions?: string | { signal?: AbortSignal },
): Promise<UploadResult> {
  throw new Error("[LowCodeEngine] FileAssetService not configured. Cannot upload.");
}
export async function stubFetchAuthenticatedFileBlobUrl(_fileId: string | number): Promise<string | null> { return null; }
export function stubRevokeAuthenticatedFileBlobUrl(_fileId: string | number) {}

export const StubAssetLibraryPicker: React.FC<{ open: boolean; onClose: () => void; onSelect: (asset: any) => void }> = () => null;

// Audit stub
export const StubAuditTimeline: React.FC<{ entries: any[]; loading?: boolean }> = ({ entries }) =>
  React.createElement("div", { "data-entries": entries.length });
