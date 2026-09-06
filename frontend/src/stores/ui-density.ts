import { create } from "zustand";

export type UiDensity = "s" | "m" | "l";

interface UiDensityState {
  density: UiDensity;
  hydrate: () => void;
  setDensity: (density: UiDensity) => void;
}

function getInitialDensity(): UiDensity {
  if (typeof window === "undefined") {
    return "m";
  }

  const saved = localStorage.getItem("labelhub.uiDensity");
  if (saved === "s" || saved === "m" || saved === "l") {
    return saved;
  }

  return "m";
}

function applyDensity(density: UiDensity) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.density = density;
}

export const useUiDensityStore = create<UiDensityState>((set) => ({
  density: getInitialDensity(),
  hydrate: () => {
    const density = getInitialDensity();
    applyDensity(density);
    set({ density });
  },
  setDensity: (density) => {
    localStorage.setItem("labelhub.uiDensity", density);
    applyDensity(density);
    set({ density });
  },
}));
