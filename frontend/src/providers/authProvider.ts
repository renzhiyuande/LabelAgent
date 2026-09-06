import type { AuthProvider } from "@refinedev/core";
import { isSameAuthenticatedUser } from "../lib/identity";
import type { AuthTokens, AuthenticatedUser } from "../types";
import { ApiError, persistAuthTokens, request } from "../utils/apiClient";
import { useAuthStore } from "../stores/auth";

function isAuthFailure(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }
  return error.status === 401 || error.code === "AUTH_004" || error.code === "AUTH_001";
}

function clearStoredSession() {
  localStorage.removeItem("labelhub.accessToken");
  localStorage.removeItem("labelhub.refreshToken");
  useAuthStore.getState().clear();
}

interface LoginParams {
  username: string;
  password: string;
}

export const authProvider: AuthProvider = {
  login: async ({ username, password }: LoginParams) => {
    const tokens = await request<AuthTokens>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    persistAuthTokens(tokens);
    return { success: true, redirectTo: "/" };
  },
  logout: async () => {
    await request<void>("/api/v1/auth/logout", { method: "POST" }).catch(() => undefined);
    clearStoredSession();
    return { success: true, redirectTo: "/login" };
  },
  check: async () => {
    const token = localStorage.getItem("labelhub.accessToken");
    const refreshToken = localStorage.getItem("labelhub.refreshToken");
    if (!token && !refreshToken) {
      return { authenticated: false, redirectTo: "/login" };
    }
    return { authenticated: true };
  },
  getIdentity: async () => {
    const accessToken = localStorage.getItem("labelhub.accessToken");
    const refreshToken = localStorage.getItem("labelhub.refreshToken");
    if (!accessToken && !refreshToken) {
      throw new ApiError("未登录", "AUTH_001", "", 401);
    }
    try {
      const identity = await request<AuthenticatedUser>("/api/v1/auth/me");
      const previous = useAuthStore.getState().currentUser;
      if (isSameAuthenticatedUser(previous, identity)) {
        return previous;
      }
      localStorage.setItem("labelhub.identity", JSON.stringify(identity));
      useAuthStore.getState().setCurrentUser(identity);
      return identity;
    } catch (error) {
      if (isAuthFailure(error)) {
        clearStoredSession();
      }
      throw error;
    }
  },
  getPermissions: async () => {
    const user = useAuthStore.getState().currentUser;
    return user?.permissions ?? [];
  },
  onError: async (error) => {
    if (isAuthFailure(error)) {
      clearStoredSession();
      return { logout: true, redirectTo: "/login" };
    }
    return {};
  },
};
