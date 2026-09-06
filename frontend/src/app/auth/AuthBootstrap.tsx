import { useIsAuthenticated } from "@refinedev/core";
import { useEffect } from "react";
import { useNavigationStore } from "../../stores/navigation";

export function AuthBootstrap() {
  const loadMenus = useNavigationStore((state) => state.loadMenus);
  const clearMenus = useNavigationStore((state) => state.clear);
  const menusLoaded = useNavigationStore((state) => state.loaded);

  const { data: authCheck } = useIsAuthenticated();
  const isAuthenticated = authCheck?.authenticated === true;

  useEffect(() => {
    if (!isAuthenticated || menusLoaded) {
      return;
    }
    void loadMenus(true).catch(() => undefined);
  }, [isAuthenticated, menusLoaded, loadMenus]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearMenus();
    }
  }, [clearMenus, isAuthenticated]);

  return null;
}
