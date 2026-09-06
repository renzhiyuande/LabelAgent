/**
 * 低代码引擎 — 资源注册表
 *
 * 引擎不内置任何业务资源，由主项目在启动时通过 registerResource() 注册。
 */

import { appMessage } from "../adapters/lowcode-utils";
import { registerHeaderAction } from "../actions/registry";
import type { ResourceMeta } from "./types";

// ── 注册表 ──

const resourceRegistry: Record<string, ResourceMeta> = {};

/** 注册一个业务资源 */
export function registerResource(key: string, meta: ResourceMeta): void {
  if (resourceRegistry[key]) {
    console.warn(`[LowCodeEngine] Resource "${key}" already registered, overwriting.`);
  }
  resourceRegistry[key] = meta;
}

/** 批量注册业务资源 */
export function registerResources(resources: Record<string, ResourceMeta>): void {
  for (const [key, meta] of Object.entries(resources)) {
    registerResource(key, meta);
  }
}

/** 获取已注册的资源元数据 */
export function getResourceMeta(resourceKey: string): ResourceMeta | null {
  ensureLowCodeHeaderActionsRegistered();
  return resourceRegistry[resourceKey] ?? null;
}

/** 获取所有已注册的资源 Key */
export function getRegisteredResourceKeys(): string[] {
  return Object.keys(resourceRegistry);
}

// ── Header Action 初始化回调 ──

let _headerActionCallbacks: (() => void)[] = [];

/** 注册低代码页眉动作初始化回调（如文件资产操作、AI 审核操作等） */
export function registerHeaderActionCallback(cb: () => void) {
  _headerActionCallbacks.push(cb);
}

let headerActionsRegistered = false;

export function ensureLowCodeHeaderActionsRegistered() {
  if (headerActionsRegistered) return;
  headerActionsRegistered = true;
  for (const cb of _headerActionCallbacks) {
    cb();
  }

  registerHeaderAction("systemClients.rotateSecretHint", () => {
    appMessage.info("系统客户端的 rotate-secret 继续保留专有接口，不纳入标准 lowcode action。");
  });
}
