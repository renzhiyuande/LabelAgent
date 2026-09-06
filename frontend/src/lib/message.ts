import { toast } from "sonner";
import { resolveErrorMessage } from "../i18n/resolve-error-message";

const TOAST_DEDUPE_WINDOW_MS = 5000;
const recentToastKeys = new Map<string, number>();

function buildToastKey(kind: string, message: string, description?: string): string {
  return `${kind}:${message}:${description ?? ""}`;
}

function shouldEmitToast(kind: string, message: string, description?: string): boolean {
  const key = buildToastKey(kind, message, description);
  const now = Date.now();
  const lastShownAt = recentToastKeys.get(key);
  if (lastShownAt != null && now - lastShownAt < TOAST_DEDUPE_WINDOW_MS) {
    return false;
  }
  recentToastKeys.set(key, now);
  if (recentToastKeys.size > 100) {
    for (const [entryKey, shownAt] of recentToastKeys) {
      if (now - shownAt > TOAST_DEDUPE_WINDOW_MS) {
        recentToastKeys.delete(entryKey);
      }
    }
  }
  return true;
}

interface MessageErrorLike {
  message?: string;
  code?: string;
  traceId?: string;
  handled?: boolean;
}

function isMessageErrorLike(error: unknown): error is MessageErrorLike {
  return Boolean(error) && typeof error === "object";
}

function messageDescription(error: MessageErrorLike, fallbackDescription?: string): string | undefined {
  if (fallbackDescription) {
    return fallbackDescription;
  }
  const details = [];
  if (error.code && error.code !== "SUCCESS") {
    details.push(`错误码：${error.code}`);
  }
  if (error.traceId) {
    details.push(`TraceId：${error.traceId}`);
  }
  return details.length > 0 ? details.join(" · ") : undefined;
}

export function markMessageErrorHandled(error: unknown) {
  if (isMessageErrorLike(error)) {
    error.handled = true;
  }
}

export function isMessageErrorHandled(error: unknown): boolean {
  return isMessageErrorLike(error) && error.handled === true;
}

export const appMessage = {
  success(message: string, description?: string) {
    if (!shouldEmitToast("success", message, description)) {
      return;
    }
    toast.success(message, { description });
  },
  error(message: string, description?: string) {
    if (!shouldEmitToast("error", message, description)) {
      return;
    }
    toast.error(message, { description });
  },
  /** 若错误已被 apiClient 等统一处理过，则不再重复 toast。 */
  errorUnlessHandled(message: string, error?: unknown, description?: string) {
    if (error !== undefined && isMessageErrorHandled(error)) {
      return;
    }
    const title =
      error !== undefined && isMessageErrorLike(error) && error.code
        ? resolveErrorMessage(error, message)
        : message;
    this.error(title, description);
    if (error !== undefined) {
      markMessageErrorHandled(error);
    }
  },
  errorFrom(error: unknown, fallbackMessage: string, fallbackDescription?: string) {
    if (isMessageErrorHandled(error)) {
      return;
    }
    const title =
      isMessageErrorLike(error) && error.code
        ? resolveErrorMessage(error, fallbackMessage)
        : isMessageErrorLike(error) && typeof error.message === "string" && error.message.trim()
          ? error.message
          : fallbackMessage;
    const description = isMessageErrorLike(error)
      ? messageDescription(error, fallbackDescription)
      : fallbackDescription;
    this.error(title, description);
    markMessageErrorHandled(error);
  },
  warning(message: string, description?: string) {
    if (!shouldEmitToast("warning", message, description)) {
      return;
    }
    toast.warning(message, { description });
  },
  info(message: string, description?: string) {
    if (!shouldEmitToast("info", message, description)) {
      return;
    }
    toast(message, { description });
  },
  promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    },
  ) {
    const toastId = toast.loading(messages.loading);
    return promise
      .then((value) => {
        toast.success(messages.success, { id: toastId });
        return value;
      })
      .catch((error: unknown) => {
        toast.dismiss(toastId);
        this.errorFrom(error, messages.error);
        throw error;
      });
  },
};
