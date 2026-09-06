import { useCallback } from "react";
import { useLocale, type AppLocale } from "./locale";
import zh from "./zh.json";
import en from "./en.json";

const resources: Record<AppLocale, Record<string, string>> = { zh, en };
const zhFallback = resources.zh;

/**
 * 轻量翻译 hook — 读取 Zustand locale 状态，返回翻译函数。
 *
 * 在资源文件未就绪时，t(key) 直接返回 key 本身（开发期可见性）。
 *
 * @example
 * ```tsx
 * const { t } = useT();
 * // 纯文本
 * <span>{t('app_header.density_compact')}</span>
 * // 带插值
 * <span>{t('greeting', { name: '张三' })}</span>
 * ```
 */
export function useT() {
  const locale = useLocale((s) => s.locale);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let text = resources[locale][key];
      if (text === undefined) {
        text = zhFallback[key];
      }
      if (text === undefined) {
        return key;
      }
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(`{{${k}}}`, String(v));
        }
      }
      return text;
    },
    [locale],
  );

  return { t };
}

/** 跨组件获取翻译（非 hook 场景，如 apiClient.ts） */
export function getT(locale: AppLocale) {
  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = resources[locale][key];
    if (text === undefined) {
      text = zhFallback[key];
    }
    if (text === undefined) {
      return key;
    }
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{{${k}}}`, String(v));
      }
    }
    return text;
  };
  return { t };
}
