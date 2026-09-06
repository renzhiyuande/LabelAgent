"use client";

import { useFileAssetService, useAuditTimelineService } from "../provider";
import { getFileAssetService } from "../global-config";
import type { UploadResult } from "./interfaces";
import {
  stubUseAuthenticatedFileUrl, stubOpenAuthenticatedDownload, stubResolveFileDownloadUrl,
  stubUploadFileAsset, stubFetchAuthenticatedFileBlobUrl, stubRevokeAuthenticatedFileBlobUrl,
  StubAssetLibraryPicker, StubAuditTimeline,
} from "./stubs";
export type { AuditTimelineEntry } from "./interfaces";

// Hooks
export function useAuthenticatedFileUrl(
  fileId?: string | number | null,
  directUrl?: string | null,
): string | null {
  return (
    useFileAssetService()?.useAuthenticatedFileUrl?.(fileId, directUrl)
    ?? stubUseAuthenticatedFileUrl(fileId, directUrl)
  );
}

// Functions
export async function openAuthenticatedDownload(options: {
  url: string;
  fileId?: string | number;
  fileName?: string;
}): Promise<void> {
  const service = getFileAssetService();
  if (service?.openAuthenticatedDownload) {
    await service.openAuthenticatedDownload(options);
    return;
  }
  await stubOpenAuthenticatedDownload(options);
}
export function resolveFileDownloadUrl(downloadUrl?: string, fileId?: string | number): string | undefined {
  return getFileAssetService()?.resolveFileDownloadUrl?.(downloadUrl, fileId) ?? stubResolveFileDownloadUrl(downloadUrl);
}
export async function uploadFileAsset(
  file: File,
  categoryOrOptions?: string | { signal?: AbortSignal },
): Promise<UploadResult> {
  const service = getFileAssetService();
  const result = await service?.uploadFileAsset?.(file, categoryOrOptions);
  if (result) {
    return result;
  }
  return stubUploadFileAsset(file, categoryOrOptions);
}
export async function fetchAuthenticatedFileBlobUrl(fileId: string | number): Promise<string | null> {
  return (
    await getFileAssetService()?.fetchAuthenticatedFileBlobUrl?.(fileId)
  ) ?? stubFetchAuthenticatedFileBlobUrl(fileId);
}
export function revokeAuthenticatedFileBlobUrl(fileId: string | number) {
  getFileAssetService()?.revokeAuthenticatedFileBlobUrl?.(fileId) ?? stubRevokeAuthenticatedFileBlobUrl(fileId);
}

// Components
export function AssetLibraryPicker(
  props: import("./interfaces").AssetLibraryPickerProps & { onOpenChange?: (open: boolean) => void },
) {
  const contextPicker = useFileAssetService()?.AssetLibraryPicker;
  const globalPicker = getFileAssetService()?.AssetLibraryPicker;
  const Picker = contextPicker ?? globalPicker;
  const { onOpenChange, onClose, ...rest } = props;
  const pickerProps = {
    ...rest,
    onClose: onClose ?? (() => onOpenChange?.(false)),
  };
  if (Picker) return <Picker {...pickerProps} />;
  return StubAssetLibraryPicker ? <StubAssetLibraryPicker {...pickerProps} /> : null;
}
export function AuditTimeline(props: any) {
  const Timeline = useAuditTimelineService()?.AuditTimeline;
  if (Timeline) return <Timeline {...props} />;
  return StubAuditTimeline ? <StubAuditTimeline {...props} /> : null;
}
