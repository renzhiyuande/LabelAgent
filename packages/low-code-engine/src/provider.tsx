"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { HttpClient, MessageService, FileAssetService, AuditTimelineService, LowCodeEngineConfig } from "./adapters/interfaces";
import { configure as configureGlobal } from "./global-config";

const noopHttpClient: HttpClient = {
  request<T>(_path: string, _init?: any): Promise<T> {
    throw new Error("[LowCodeEngine] HttpClient not configured. Wrap your app with <LowCodeEngineProvider>.");
  },
};

const noopMessageService: MessageService = {
  success(m: string) { console.log("[LowCodeEngine]", m); },
  error(m: string, _d?: string) { console.error("[LowCodeEngine]", m); },
  warning(m: string, _d?: string) { console.warn("[LowCodeEngine]", m); },
  info(m: string) { console.log("[LowCodeEngine]", m); },
  errorFrom(_e: unknown, fb: string, _d?: string) { console.error("[LowCodeEngine]", fb); },
};

type ProviderConfig = LowCodeEngineConfig & {
  fileAssetService?: FileAssetService;
  auditTimelineService?: AuditTimelineService;
};

const Ctx = createContext<ProviderConfig>({ httpClient: noopHttpClient, messageService: noopMessageService });

export function LowCodeEngineProvider({ config, children }: { config: ProviderConfig; children: ReactNode }) {
  useEffect(() => {
    configureGlobal({
      httpClient: config.httpClient,
      messageService: config.messageService,
      fileAssetService: config.fileAssetService,
    });
  }, [config]);
  return <Ctx.Provider value={config}>{children}</Ctx.Provider>;
}

export function useHttpClient(): HttpClient { return useContext(Ctx).httpClient; }
export function useMessageService(): MessageService { return useContext(Ctx).messageService; }
export function useFileAssetService(): FileAssetService | undefined { return useContext(Ctx).fileAssetService; }
export function useAuditTimelineService(): AuditTimelineService | undefined { return useContext(Ctx).auditTimelineService; }
