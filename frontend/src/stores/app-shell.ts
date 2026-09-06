import { create } from "zustand";

interface AppShellState {
  sidebarCollapsed: boolean;
  sidebarSheetOpen: boolean;
  focusMode: boolean;
  focusModeSnapshot: { sidebarCollapsed: boolean } | null;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openSidebarSheet: () => void;
  closeSidebarSheet: () => void;
  toggleSidebarSheet: () => void;
  enterFocusMode: () => void;
  exitFocusMode: () => void;
}

function getInitialSidebarCollapsed(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  const stored = localStorage.getItem("labelhub.sidebarCollapsed");
  return stored === null ? true : stored === "true";
}

export const useAppShellStore = create<AppShellState>((set) => ({
  sidebarCollapsed: getInitialSidebarCollapsed(),
  sidebarSheetOpen: false,
  focusMode: false,
  focusModeSnapshot: null,
  toggleSidebar: () =>
    set((state) => {
      const next = !state.sidebarCollapsed;
      localStorage.setItem("labelhub.sidebarCollapsed", String(next));
      return {
        sidebarCollapsed: next,
        sidebarSheetOpen: next ? state.sidebarSheetOpen : false,
      };
    }),
  setSidebarCollapsed: (collapsed) => {
    localStorage.setItem("labelhub.sidebarCollapsed", String(collapsed));
    set({ sidebarCollapsed: collapsed });
  },
  openSidebarSheet: () => set({ sidebarSheetOpen: true }),
  closeSidebarSheet: () => set({ sidebarSheetOpen: false }),
  toggleSidebarSheet: () =>
    set((state) => ({
      sidebarSheetOpen: !state.sidebarSheetOpen,
    })),
  enterFocusMode: () =>
    set((state) => {
      if (state.focusMode) {
        return state;
      }
      return {
        focusMode: true,
        focusModeSnapshot: { sidebarCollapsed: state.sidebarCollapsed },
        sidebarCollapsed: true,
        sidebarSheetOpen: false,
      };
    }),
  exitFocusMode: () =>
    set((state) => {
      if (!state.focusMode) {
        return state;
      }
      const snapshot = state.focusModeSnapshot;
      return {
        focusMode: false,
        focusModeSnapshot: null,
        sidebarCollapsed: snapshot?.sidebarCollapsed ?? state.sidebarCollapsed,
      };
    }),
}));
