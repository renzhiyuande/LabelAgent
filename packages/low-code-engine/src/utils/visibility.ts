import type { ConditionMeta } from "../schema/types";
import { getValueAtPath } from "./object-path";

function includesValue(current: unknown, expected: unknown): boolean {
  if (Array.isArray(current)) {
    return current.includes(expected);
  }
  if (typeof current === "string") {
    return current.includes(String(expected));
  }
  return false;
}

export function evaluateConditions(
  values: Record<string, unknown>,
  conditions?: ConditionMeta[],
): boolean {
  if (!conditions || conditions.length === 0) {
    return true;
  }
  return conditions.every((condition) => {
    const current = getValueAtPath(values, condition.field);
    const operator = condition.operator ?? "eq";
    switch (operator) {
      case "ne":
        return current !== condition.value;
      case "in":
        return Array.isArray(condition.value) && condition.value.includes(current);
      case "notIn":
        return Array.isArray(condition.value) && !condition.value.includes(current);
      case "contains":
        return includesValue(current, condition.value);
      case "notEmpty":
        return current != null && current !== "";
      case "eq":
      default:
        return current === condition.value;
    }
  });
}
