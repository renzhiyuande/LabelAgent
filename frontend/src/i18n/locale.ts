import { create } from "zustand";

export type AppLocale = "zh" | "en";

interface LocaleState {
  locale: AppLocale;
  hydrate: () => void;
  setLocale: (locale: AppLocale) => void;
}

function getInitialLocale(): AppLocale {
  if (typeof window === "undefined") {
    return "zh";
  }

  const saved = localStorage.getItem("labelhub.locale");
  if (saved === "zh" || saved === "en") {
    return saved;
  }

  return navigator.language.startsWith("zh") ? "zh" : "en";
}

export const useLocale = create<LocaleState>((set) => ({
  locale: getInitialLocale(),
  hydrate: () => {
    set({ locale: getInitialLocale() });
  },
  setLocale: (locale) => {
    localStorage.setItem("labelhub.locale", locale);
    set({ locale });
  },
}));
