import type { ApiResponse, AuthTokens } from "../types";
import { parseJsonPreservingSnowflakeIds } from "../lib/json-parse";
import { appMessage, markMessageErrorHandled } from "../lib/message";
import { resolveAppPath } from "../lib/app-path";
import { useAuthStore } from "../stores/auth";
import { resolveErrorMessage } from "../i18n/resolve-error-message";
import { useLocale } from "../i18n/locale";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiError extends Error {
  code: string;
  traceId: string;
  status: number;
  handled: boolean;

  constructor(message: string, code: string, traceId: string, status: number) {
    super(message);
    this.code = code;
    this.traceId = traceId;
    this.status = status;
    this.handled = false;
  }
}

export interface RequestOptions {
  notifyOnError?: boolean;
  errorMessage?: string;
  signal?: AbortSignal;
}

interface InternalRequestOptions extends RequestOptions {
  allowRefresh?: boolean;
}

function isApiResponsePayload<T>(payload: unknown): payload is ApiResponse<T> {
  return payload !== null && typeof payload === "object" && "code" in payload;
}

function normalizeRequestError(error: unknown, fallbackStatus = 0): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error) {
    const apiError = new ApiError(error.message || "请求失败，请稍后重试", "REQUEST_FAILED", "", fallbackStatus);
    if ("handled" in error && error.handled === true) {
      apiError.handled = true;
    }
    return apiError;
  }

  return new ApiError("请求失败，请稍后重试", "REQUEST_FAILED", "", fallbackStatus);
}

function errorDescription(error: ApiError): string | undefined {
  const details = [];
  if (error.code && error.code !== "SUCCESS") {
    details.push(`错误码：${error.code}`);
  }
  if (error.traceId) {
    details.push(`TraceId：${error.traceId}`);
  }
  return details.length > 0 ? details.join(" · ") : undefined;
}

const AUTH_ERROR_CODES = new Set(["AUTH_004", "AUTH_001"]);

export function isAuthFailure(status: number, code: string): boolean {
  return status === 401 || AUTH_ERROR_CODES.has(code);
}

function isAnonymousAuthPath(path: string): boolean {
  return path === "/api/v1/auth/login" || path === "/api/v1/auth/refresh";
}

function canRefreshOnPath(path: string): boolean {
  return !isAnonymousAuthPath(path);
}

function shouldAutoNotify(path: string, error: ApiError, options: RequestOptions): boolean {
  if (options.notifyOnError === false) {
    return false;
  }
  if (error.handled) {
    return false;
  }
  if (isAuthFailure(error.status, error.code) && path !== "/api/v1/auth/login") {
    return false;
  }
  return true;
}

export function persistAuthTokens(tokens: AuthTokens) {
  localStorage.setItem("labelhub.accessToken", tokens.accessToken);
  localStorage.setItem("labelhub.refreshToken", tokens.refreshToken);
}

function handleUnauthorized(path: string) {
  if (path === "/api/v1/auth/login") {
    return;
  }
  useAuthStore.getState().clear();
  localStorage.removeItem("labelhub.accessToken");
  localStorage.removeItem("labelhub.refreshToken");
  const loginPath = resolveAppPath("/login");
  if (typeof window !== "undefined" && window.location.pathname !== loginPath) {
    window.location.assign(loginPath);
  }
}

function notifyRequestError(error: ApiError, _options: RequestOptions) {
  const message = resolveErrorMessage(error);
  const description = errorDescription(error);
  appMessage.error(message, description);
  markMessageErrorHandled(error);
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem("labelhub.refreshToken");
  if (!refreshToken) {
    return false;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        const rawBody = await response.text();
        const payload = rawBody ? parseJsonPreservingSnowflakeIds(rawBody) : null;
        const apiPayload = isApiResponsePayload<AuthTokens>(payload) ? payload : null;

        if (!response.ok || !apiPayload || apiPayload.code !== "SUCCESS" || !apiPayload.data) {
          return false;
        }

        persistAuthTokens(apiPayload.data);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

async function performRequest<T>(
  path: string,
  init: RequestInit,
  options: InternalRequestOptions,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("X-Locale", useLocale.getState().locale);
  const token = localStorage.getItem("labelhub.accessToken");
  if (token && !isAnonymousAuthPath(path)) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, signal: options.signal });
  const rawBody = await response.text();
  const payload = rawBody ? parseJsonPreservingSnowflakeIds(rawBody) : null;
  const apiPayload = isApiResponsePayload<T>(payload) ? payload : null;

  if (!response.ok || !apiPayload || apiPayload.code !== "SUCCESS") {
    const message =
      apiPayload && typeof apiPayload.message === "string" && apiPayload.message.trim()
        ? apiPayload.message
        : options.errorMessage ?? "请求失败，请稍后重试";
    const code = apiPayload ? apiPayload.code : "REQUEST_FAILED";
    const traceId = apiPayload ? apiPayload.traceId : "";
    throw new ApiError(message, code, traceId, response.status);
  }

  return apiPayload.data as T;
}

export async function request<T>(
  path: string,
  init: RequestInit = {},
  options: RequestOptions = {},
): Promise<T> {
  const internalOptions: InternalRequestOptions = { ...options, allowRefresh: true };
  const allowRefresh = internalOptions.allowRefresh ?? true;

  try {
    return await performRequest<T>(path, init, internalOptions);
  } catch (error) {
    const normalizedError = normalizeRequestError(error);

    if (
      allowRefresh &&
      canRefreshOnPath(path) &&
      isAuthFailure(normalizedError.status, normalizedError.code)
    ) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        try {
          return await performRequest<T>(path, init, { ...internalOptions, allowRefresh: false });
        } catch (retryError) {
          const retryNormalized = normalizeRequestError(retryError);
          if (isAuthFailure(retryNormalized.status, retryNormalized.code)) {
            handleUnauthorized(path);
          }
          if (shouldAutoNotify(path, retryNormalized, options)) {
            notifyRequestError(retryNormalized, options);
          }
          throw retryNormalized;
        }
      }
      handleUnauthorized(path);
    } else if (isAuthFailure(normalizedError.status, normalizedError.code)) {
      handleUnauthorized(path);
    }

    if (shouldAutoNotify(path, normalizedError, options)) {
      notifyRequestError(normalizedError, options);
    }

    throw normalizedError;
  }
}
