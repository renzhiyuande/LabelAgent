import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TabStyle = "card" | "line";

export interface AppSettings {
  /** 是否启用多标签页 */
  enableMultiTabs: boolean;
  /** Tab 栏样式 */
  tabStyle: TabStyle;
  /** Header 各元素可见性 */
  showDensityInHeader: boolean;
  showLocaleInHeader: boolean;
  showThemeToggleInHeader: boolean;
  showNotificationsInHeader: boolean;
  showUserInfoInHeader: boolean;
}

interface AppSettingsStore extends AppSettings {
  hydrate: () => void;
  update: (partial: Partial<AppSettings>) => void;
  /** 一键重置所有 header 可见性 */
  resetHeaderVisibility: () => void;
}

const DEFAULTS: AppSettings = {
  enableMultiTabs: true,
  tabStyle: "card",
  showDensityInHeader: true,
  showLocaleInHeader: true,
  showThemeToggleInHeader: true,
  showNotificationsInHeader: true,
  showUserInfoInHeader: true,
};

export const useSettingsStore = create<AppSettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      hydrate: () => {
        // persist middleware already handles rehydration
      },
      update: (partial) => set(partial),
      resetHeaderVisibility: () =>
        set({
          showDensityInHeader: true,
          showLocaleInHeader: true,
          showThemeToggleInHeader: true,
          showNotificationsInHeader: true,
          showUserInfoInHeader: true,
        }),
    }),
    {
      name: "labelhub.appSettings",
      partialize: (state) => ({
        enableMultiTabs: state.enableMultiTabs,
        tabStyle: state.tabStyle,
        showDensityInHeader: state.showDensityInHeader,
        showLocaleInHeader: state.showLocaleInHeader,
        showThemeToggleInHeader: state.showThemeToggleInHeader,
        showNotificationsInHeader: state.showNotificationsInHeader,
        showUserInfoInHeader: state.showUserInfoInHeader,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<AppSettings>),
      }),
    },
  ),
);
