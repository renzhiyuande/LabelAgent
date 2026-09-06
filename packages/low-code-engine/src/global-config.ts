import type { HttpClient, MessageService, FileAssetService } from "./adapters/interfaces";

let _httpClient: HttpClient | null = null;
let _messageService: MessageService | null = null;
let _fileAssetService: FileAssetService | null = null;
let _routeMetaService: { getRouteMetaByPath?(path: string): any; getWorkspaceRouteDefinitions?(): any[]; resolveWorkspaceMountKey?(pathname: string): string } | null = null;

export function configure(opts: {
  httpClient: HttpClient;
  messageService: MessageService;
  fileAssetService?: FileAssetService;
  routeMetaService?: { getRouteMetaByPath?(path: string): any; getWorkspaceRouteDefinitions?(): any[]; resolveWorkspaceMountKey?(pathname: string): string };
}) {
  _httpClient = opts.httpClient;
  _messageService = opts.messageService;
  _fileAssetService = opts.fileAssetService ?? null;
  _routeMetaService = opts.routeMetaService ?? null;
}

export function getHttpClient(): HttpClient {
  if (!_httpClient) throw new Error("[LowCodeEngine] HttpClient not configured.");
  return _httpClient;
}
export function getMessageService(): MessageService {
  if (!_messageService) throw new Error("[LowCodeEngine] MessageService not configured.");
  return _messageService;
}
export function getFileAssetService(): FileAssetService | null { return _fileAssetService; }
export function getRouteMetaService() { return _routeMetaService; }
