import { create } from "zustand";
import { MAX_KEEP_ALIVE_TABS, moveKeyToFront } from "./tab-policy";

interface KeepAliveState {
  activeKeys: string[];
  versions: Record<string, number>;
  lruOrder: string[];
  activate: (key: string) => void;
  deactivate: (key: string) => void;
  clear: (key: string) => void;
  getAliveKeys: () => string[];
}

export const useKeepAliveStore = create<KeepAliveState>((set, get) => ({
  activeKeys: [],
  versions: {},
  lruOrder: [],
  activate: (key) =>
    set((state) => {
      const lru = moveKeyToFront(state.lruOrder, key);
      const nextLru = lru.slice(0, MAX_KEEP_ALIVE_TABS);
      const evicted = lru.slice(MAX_KEEP_ALIVE_TABS);
      return {
        activeKeys: nextLru,
        lruOrder: nextLru,
        versions: evicted.reduce(
          (acc, k) => ({ ...acc, [k]: (acc[k] ?? 0) + 1 }),
          state.versions,
        ),
      };
    }),
  deactivate: () => undefined,
  clear: (key) =>
    set((state) => ({
      activeKeys: state.activeKeys.filter((item) => item !== key),
      lruOrder: state.lruOrder.filter((k) => k !== key),
      versions: {
        ...state.versions,
        [key]: (state.versions[key] ?? 0) + 1,
      },
    })),
  getAliveKeys: () => get().lruOrder,
}));
