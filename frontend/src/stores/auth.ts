import { create } from "zustand";
import type { AuthenticatedUser } from "../types";

interface AuthState {
  currentUser: AuthenticatedUser | null;
  hydrated: boolean;
  authenticating: boolean;
  setCurrentUser: (user: AuthenticatedUser | null) => void;
  setAuthenticating: (authenticating: boolean) => void;
  clear: () => void;
  hydrate: () => void;
}

function getInitialCurrentUser(): AuthenticatedUser | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = localStorage.getItem("labelhub.identity");
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthenticatedUser;
  } catch {
    return null;
  }
}

function getInitialAuthenticating(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const token = localStorage.getItem("labelhub.accessToken");
  const identity = localStorage.getItem("labelhub.identity");
  return Boolean(token) && !identity;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: getInitialCurrentUser(),
  hydrated: false,
  authenticating: getInitialAuthenticating(),
  setCurrentUser: (user) => {
    if (user) {
      localStorage.setItem("labelhub.identity", JSON.stringify(user));
    } else {
      localStorage.removeItem("labelhub.identity");
    }
    set({ currentUser: user });
  },
  setAuthenticating: (authenticating) => set({ authenticating }),
  clear: () => {
    localStorage.removeItem("labelhub.identity");
    localStorage.removeItem("labelhub.accessToken");
    localStorage.removeItem("labelhub.refreshToken");
    set({ currentUser: null, authenticating: false });
  },
  hydrate: () => {
    const nextUser = getInitialCurrentUser();
    const nextAuthenticating = getInitialAuthenticating();
    set({ currentUser: nextUser, hydrated: true, authenticating: nextAuthenticating });
  },
}));
