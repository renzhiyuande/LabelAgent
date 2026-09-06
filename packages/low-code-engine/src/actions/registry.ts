import { appMessage } from "../adapters/lowcode-utils";
import type { ActionSchema } from "../schema/types";
import type { ResourceMeta } from "../schema/types";

export interface ActionHandlerResult {
  refresh?: boolean;
}

export interface HeaderActionContext {
  values?: Record<string, unknown>;
}

export type HeaderActionHandler = (
  ctx?: HeaderActionContext,
) => ActionHandlerResult | void | Promise<ActionHandlerResult | void>;
export interface ResourceActionContext {
  resource: ResourceMeta;
  action: ActionSchema;
  record: Record<string, unknown>;
}
export type ResourceActionHandler =
  (context: ResourceActionContext) => ActionHandlerResult | void | Promise<ActionHandlerResult | void>;

const headerActionRegistry = new Map<string, HeaderActionHandler>();
const resourceActionRegistry = new Map<string, ResourceActionHandler>();

export function registerHeaderAction(code: string, handler: HeaderActionHandler) {
  headerActionRegistry.set(code, handler);
}

export function unregisterHeaderAction(code: string) {
  headerActionRegistry.delete(code);
}

export function registerResourceAction(code: string, handler: ResourceActionHandler) {
  resourceActionRegistry.set(code, handler);
}

export function unregisterResourceAction(code: string) {
  resourceActionRegistry.delete(code);
}

export function resolveHeaderAction(code?: string): HeaderActionHandler | undefined {
  if (!code) {
    return undefined;
  }
  return headerActionRegistry.get(code);
}

export function runHeaderAction(code?: string, ctx?: HeaderActionContext) {
  const handler = resolveHeaderAction(code);
  if (!handler) {
    appMessage.info("该操作暂未注册实现");
    return;
  }
  return handler(ctx);
}

export function resolveResourceAction(code?: string): ResourceActionHandler | undefined {
  if (!code) {
    return undefined;
  }
  return resourceActionRegistry.get(code);
}

/** 执行已注册的本地插件 action；未注册时返回 undefined（由调用方决定是否提示，避免重复 toast） */
export function runResourceLocalAction(context: ResourceActionContext) {
  const handler = resolveResourceAction(context.action.actionCode);
  if (!handler) {
    return undefined;
  }
  return handler(context);
}
