import { errorMessages } from "./errorMessages";
import { useLocale } from "./locale";

interface ErrorMessageSource {
  code?: string;
  message?: string;
}

/** 按错误码映射中英文；无映射时 fallback 到后端 message。 */
export function resolveErrorMessage(error: ErrorMessageSource, fallback = "请求失败，请稍后重试"): string {
  const locale = useLocale.getState().locale;
  const entry = error.code ? errorMessages[error.code] : undefined;
  if (entry) {
    return entry[locale] || entry.en || error.message?.trim() || fallback;
  }
  return error.message?.trim() || fallback;
}
