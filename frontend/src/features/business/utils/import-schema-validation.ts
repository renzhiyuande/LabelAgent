import type { FormSchema } from "@/low-code/schema/types";
import {
  collectBindingsByImportRole,
  inferImportContractFromFormSchema,
  isRuntimeImportField,
  visitFormFields,
} from "@/low-code/schema/import-field-meta";
import type { TaskImportPayloadContract } from "./import-payload-contract";

export {
  collectBindingsByImportRole,
  inferImportContractFromFormSchema,
  validateSchemaRespectsImportContract,
} from "@/low-code/schema/import-field-meta";
export type { SchemaContractValidationResult } from "@/low-code/schema/import-field-meta";

export interface ImportSchemaValidationResult {
  ok: boolean;
  message?: string;
  missingKeys?: string[];
  extraKeys?: string[];
}

/** 从 FormSchema 收集参与 payload 绑定的字段名（排除 runtime/LLM） */
export function collectPayloadKeysFromFormSchema(formSchema: FormSchema): string[] {
  const keys = new Set<string>();
  visitFormFields(formSchema, (field) => {
    if (isRuntimeImportField(field)) {
      return;
    }
    const binding = (field.path ?? field.key)?.trim();
    if (binding) {
      keys.add(binding);
    }
  });
  return Array.from(keys).sort((a, b) => a.localeCompare(b));
}

/**
 * 按任务导入契约校验：required ⊆ rowKeys ⊆ allowed（required ∪ optional）。
 */
export function validateImportRowKeys(
  rowKeys: string[],
  contract: TaskImportPayloadContract,
): ImportSchemaValidationResult {
  const rowSet = new Set(rowKeys);
  const required = contract.requiredKeys;
  const allowed = new Set([...contract.requiredKeys, ...contract.optionalKeys]);
  const forbidden = new Set(contract.forbiddenKeys ?? []);

  const missingKeys = required.filter((key) => !rowSet.has(key));
  const extraKeys = rowKeys.filter((key) => !allowed.has(key));
  const forbiddenHit = rowKeys.filter((key) => forbidden.has(key));

  if (missingKeys.length === 0 && extraKeys.length === 0 && forbiddenHit.length === 0) {
    return { ok: true };
  }

  const parts: string[] = ["导入数据的字段与任务导入契约不一致。"];
  if (missingKeys.length > 0) {
    parts.push(`缺少必填题目列：${missingKeys.join("、")}`);
  }
  if (extraKeys.length > 0) {
    parts.push(`多余列：${extraKeys.join("、")}`);
  }
  if (forbiddenHit.length > 0) {
    parts.push(`禁止列：${forbiddenHit.join("、")}`);
  }

  return {
    ok: false,
    message: parts.join(" "),
    missingKeys,
    extraKeys,
  };
}

export function validateImportItemsAgainstContract(
  items: Array<Record<string, unknown>>,
  contract: TaskImportPayloadContract,
): ImportSchemaValidationResult {
  for (let i = 0; i < items.length; i++) {
    const rowKeys = Object.keys(items[i]);
    const result = validateImportRowKeys(rowKeys, contract);
    if (!result.ok) {
      return {
        ...result,
        message: `第 ${i + 1} 条：${result.message ?? "字段不符合导入契约"}`,
      };
    }
  }
  return { ok: true };
}

/** @deprecated 使用 validateImportRowKeys */
export function validateImportPayloadKeys(
  importKeys: string[],
  expectedKeys: string[],
): ImportSchemaValidationResult {
  const contract: TaskImportPayloadContract = {
    requiredKeys: expectedKeys,
    optionalKeys: [],
    forbiddenKeys: [],
  };
  return validateImportRowKeys(importKeys, contract);
}
