import React from "react";

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  notifyOnError?: boolean;
  errorMessage?: string;
}

export interface HttpClient {
  request<T>(path: string, init?: RequestOptions): Promise<T>;
}

export interface MessageService {
  success(message: string): void;
  error(message: string, description?: string): void;
  warning(message: string, description?: string): void;
  info(message: string): void;
  errorFrom(error: unknown, fallbackMessage: string, fallbackDescription?: string): void;
}

export interface UploadResult {
  id?: string | number;
  url?: string;
  path?: string;
  name?: string;
  size?: number;
  originalName?: string;
  sizeBytes?: number;
  mimeType?: string;
  downloadUrl?: string;
}

export interface AssetLibraryPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: UploadResult) => void;
  mimeTypePrefix?: string;
  categoryCode?: string;
  title?: string;
}

export interface FileAssetService {
  useAuthenticatedFileUrl?(fileId?: string | number | null, directUrl?: string | null): string | null;
  openAuthenticatedDownload?(options: {
    url: string;
    fileId?: string | number;
    fileName?: string;
  }): Promise<void>;
  resolveFileDownloadUrl?(downloadUrl?: string, fileId?: string | number): string | undefined;
  uploadFileAsset?(file: File, categoryOrOptions?: string | { signal?: AbortSignal }): Promise<UploadResult | void>;
  fetchAuthenticatedFileBlobUrl?(fileId: string | number): Promise<string | null>;
  revokeAuthenticatedFileBlobUrl?(fileId: string | number): void;
  AssetLibraryPicker?: React.ComponentType<AssetLibraryPickerProps>;
}

export interface AuditTimelineEntry {
  id: string;
  stage: string;
  label: string;
  timestamp: string;
  detail?: string;
  tone?: "default" | "success" | "warning" | "destructive";
}

export interface AuditTimelineService {
  AuditTimeline?: React.ComponentType<{ entries: AuditTimelineEntry[]; loading?: boolean }>;
}

export interface LowCodeEngineConfig {
  httpClient: HttpClient;
  messageService: MessageService;
  fileAssetService?: FileAssetService;
  auditTimelineService?: AuditTimelineService;
}
