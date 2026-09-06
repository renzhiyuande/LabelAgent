/**
 * 自定义详情字段组件注册表
 *
 * 允许从外部（host app / plugin）注册自定义 detail field 组件，
 * 使低代码引擎可以渲染引擎内置类型之外的 detail field type。
 *
 * 注册的组件在 LHDetailGridView / LHDetailTableView 中优先于内置 if-chain 生效。
 */
import type { DetailFieldSchema } from "../../schema/types";

export interface DetailFieldComponentProps {
  field: DetailFieldSchema;
  rawValue: unknown;
  displayRecord: Record<string, unknown>;
}

const registry = new Map<string, React.ComponentType<DetailFieldComponentProps>>();

/**
 * 注册一个自定义详情字段组件。
 * 当 detail section 中某 field 的 type 等于 `type` 时，引擎优先渲染该组件。
 * 注册后可覆盖内置类型（如 "timeline"）。
 */
export function registerDetailFieldComponent(
  type: string,
  component: React.ComponentType<DetailFieldComponentProps>,
): void {
  if (!type || typeof type !== "string") {
    console.warn("[LowCodeEngine] registerDetailFieldComponent: invalid type", type);
    return;
  }
  registry.set(type, component);
}

/**
 * 移除已注册的自定义详情字段组件。
 */
export function unregisterDetailFieldComponent(type: string): void {
  registry.delete(type);
}

/**
 * 获取指定 type 对应的自定义组件，不存在时返回 undefined。
 */
export function getDetailFieldComponent(
  type: string | undefined,
): React.ComponentType<DetailFieldComponentProps> | undefined {
  if (!type) return undefined;
  return registry.get(type);
}

/**
 * 清空所有注册的自定义组件。
 * 主要用于测试、HMR 热重载或组件生命周期重置。
 */
export function clearDetailFieldComponents(): void {
  registry.clear();
}
