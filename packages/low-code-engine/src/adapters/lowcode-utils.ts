/**
 * 低代码引擎 — 适配器工具函数
 *
 * 提供 request() 和 appMessage() 包装，委托给全局配置。
 */

import { getHttpClient, getMessageService } from "../global-config";

// ── HTTP request ──

export async function request<T>(
  path: string,
  init?: RequestInit,
  options?: { notifyOnError?: boolean; errorMessage?: string; signal?: AbortSignal },
): Promise<T> {
  const client = getHttpClient();
  return client.request<T>(path, {
    method: init?.method,
    headers: init?.headers as Record<string, string> | undefined,
    body: init?.body,
    signal: options?.signal ?? init?.signal ?? undefined,
    notifyOnError: options?.notifyOnError,
    errorMessage: options?.errorMessage,
  });
}

export function markMessageErrorHandled(error: unknown) {
  if (error && typeof error === "object") {
    (error as { handled?: boolean }).handled = true;
  }
}

export function isMessageErrorHandled(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as { handled?: boolean }).handled === true);
}

// ── Message / Toast ──

export const appMessage = {
  success(msg: string) { getMessageService().success(msg); },
  error(msg: string, desc?: string) { getMessageService().error(msg, desc); },
  warning(msg: string, desc?: string) { getMessageService().warning(msg, desc); },
  info(msg: string) { getMessageService().info(msg); },
  errorFrom(err: unknown, fallback: string, desc?: string) {
    if (isMessageErrorHandled(err)) {
      return;
    }
    getMessageService().errorFrom(err, fallback, desc);
    markMessageErrorHandled(err);
  },
  promise<T>(promise: Promise<T>, msgs: { loading: string; success: string; error: string }) {
    return promise
      .then((v) => { getMessageService().success(msgs.success); return v; })
      .catch((e) => {
        if (!isMessageErrorHandled(e)) {
          getMessageService().errorFrom(e, msgs.error);
        }
        throw e;
      });
  },
};
