import { useCan } from "@refinedev/core";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { findMenuByPath } from "../navigation/menu-config";
import { useNavigationStore } from "../../stores/navigation";
import { getRouteMetaByPath, resolveRoutePermission } from "../../lib/route-meta";

function resolveRequiredPermission(
  pathname: string,
  menus: ReturnType<typeof useNavigationStore.getState>["menus"],
) {
  const routePermission = resolveRoutePermission(pathname);
  if (routePermission) {
    return routePermission;
  }

  const menu = findMenuByPath(menus, pathname);
  if (menu?.permission) {
    return menu.permission;
  }

  const routeMeta = getRouteMetaByPath(pathname);
  if (routeMeta?.activeMenu) {
    const activeMenu = findMenuByPath(menus, routeMeta.activeMenu);
    if (activeMenu?.permission) {
      return activeMenu.permission;
    }
  }

  return undefined;
}

export function PermissionGuard() {
  const location = useLocation();
  const menus = useNavigationStore((state) => state.menus);
  const requiredPermission = resolveRequiredPermission(location.pathname, menus);
  const { data: access, isLoading } = useCan({
    resource: "app",
    action: "access",
    params: requiredPermission ? { permission: requiredPermission } : undefined,
    queryOptions: { enabled: Boolean(requiredPermission) },
  });

  if (location.pathname === "/403") {
    return <Outlet />;
  }

  if (requiredPermission && isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
        正在校验页面权限...
      </div>
    );
  }

  if (requiredPermission && !access?.can) {
    return <Navigate to="/403" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
