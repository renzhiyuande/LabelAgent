import { create } from "zustand";
import {
  buildNavigationMenus,
  type AppMenuItem,
  type SystemMenuNode,
} from "../app/navigation/menu-config";
import { buildMenuRoutes } from "../lib/route-meta/build-menu-routes";
import { localWorkspaceRoutes } from "../lib/route-meta/local-routes";
import type { AppRouteDefinition } from "../lib/route-meta/types";
import { request } from "../utils/apiClient";

interface NavigationState {
  backendMenus: SystemMenuNode[];
  menus: AppMenuItem[];
  routeDefinitions: AppRouteDefinition[];
  loading: boolean;
  loaded: boolean;
  loadMenus: (force?: boolean) => Promise<void>;
  clear: () => void;
}

let loadMenusInFlight: Promise<void> | null = null;

function buildRouteDefinitions(backendMenus: SystemMenuNode[]): AppRouteDefinition[] {
  const menuRoutes = buildMenuRoutes(backendMenus);
  const routeByPath = new Map<string, AppRouteDefinition>();

  for (const route of [...localWorkspaceRoutes, ...menuRoutes]) {
    routeByPath.set(route.meta.path, route);
  }

  return Array.from(routeByPath.values());
}

const initialMenus = buildNavigationMenus([]);
const initialRoutes = buildRouteDefinitions([]);

export const useNavigationStore = create<NavigationState>((set, get) => ({
  backendMenus: [],
  menus: initialMenus,
  routeDefinitions: initialRoutes,
  loading: false,
  loaded: false,
  loadMenus: async (force = false) => {
    const { loaded } = get();
    if (!force && loaded) {
      return;
    }
    if (loadMenusInFlight) {
      return loadMenusInFlight;
    }

    loadMenusInFlight = (async () => {
      set({ loading: true });
      try {
        const backendMenus = await request<SystemMenuNode[]>("/api/v1/system/menus");
        set({
          backendMenus,
          menus: buildNavigationMenus(backendMenus),
          routeDefinitions: buildRouteDefinitions(backendMenus),
          loaded: true,
          loading: false,
        });
      } catch (error) {
        set({
          backendMenus: [],
          menus: initialMenus,
          routeDefinitions: initialRoutes,
          // 加载失败时不要标记 loaded=true，否则后续登录/鉴权恢复后不会再自动重试加载菜单
          loaded: false,
          loading: false,
        });
        throw error;
      } finally {
        loadMenusInFlight = null;
      }
    })();

    return loadMenusInFlight;
  },
  clear: () => {
    loadMenusInFlight = null;
    set({
      backendMenus: [],
      menus: initialMenus,
      routeDefinitions: initialRoutes,
      loading: false,
      loaded: false,
    });
  },
}));
