import type { ReactNode } from "react";

export type AppRouteMeta = {
  name: string;
  path: string;
  title: string;
  icon?: string;
  permission?: string | string[];
  menuCode?: string;
  hideInMenu?: boolean;
  hideInTabs?: boolean;
  affix?: boolean;
  closable?: boolean;
  keepAlive?: boolean;
  cacheKey?: string;
  activeMenu?: string;
  resourceKey?: string;
};

export type AppRouteDefinition = {
  meta: AppRouteMeta;
  render: () => ReactNode;
};
