import type { ActionSchema, ResourceMeta } from "../schema/types";

/**
 * api.query 含 {param}，需注入路径参数后才能请求。
 * 有路径参数的列表无法直接通过 REST GET 分页，回退引擎。
 */
export function listApiRequiresPathParams(resource: ResourceMeta): boolean {
  const query = resource.api?.query?.trim();
  return Boolean(query?.includes("{"));
}

/**
 * 列表数据源路由：api.query 存在 → override 走传统 REST；
 * 否则走引擎默认 POST /api/v1/engine/resources/{resource}/query。
 */
export function usesLegacyListApi(resource: ResourceMeta): boolean {
  const query = resource.api?.query?.trim();
  if (query) {
    // 有路径参数时无法直接 REST 列表 → 回退引擎
    if (query.includes("{")) {
      return false;
    }
    return true; // api.query 作为 override
  }
  return false; // 走引擎默认
}

/**
 * Schema 中声明的 REST 动作地址（非低代码 engine action）。
 * capabilities 不再影响路由判断——只取决于 action.api 或 resource.api.actions 是否存在。
 */
export function resolveLegacyActionApi(resource: ResourceMeta, action: ActionSchema): string | undefined {
  const api = action.api ?? resource.api.actions?.[action.key];
  if (!api || api.trim() === "") {
    return undefined;
  }
  if (api.includes("/api/v1/engine/resources/")) {
    return undefined;
  }
  return api;
}

/** 详情路由：api.detail 存在 → override 走传统 REST；否则走引擎默认 GET /engine/resources/{r}/{id} */
export function usesLegacyDetailApi(resource: ResourceMeta): boolean {
  return Boolean(resource.api?.detail?.trim());
}

/** 创建路由：api.create 存在 → override 走传统 REST；否则走引擎默认 POST /engine/resources/{r} */
export function usesLegacyCreateApi(resource: ResourceMeta): boolean {
  return Boolean(resource.api?.create?.trim());
}

/** 更新路由：api.update 存在 → override 走传统 REST；否则走引擎默认 PUT /engine/resources/{r}/{id} */
export function usesLegacyUpdateApi(resource: ResourceMeta): boolean {
  return Boolean(resource.api?.update?.trim());
}

export function shouldRunLegacyResourceAction(resource: ResourceMeta, action: ActionSchema): boolean {
  if (action.kind === "link" || action.kind === "drawer" || action.kind === "assignment" || action.kind === "workflow") {
    return false;
  }
  if (action.sidePanel) {
    return false;
  }
  return Boolean(resolveLegacyActionApi(resource, action));
}
