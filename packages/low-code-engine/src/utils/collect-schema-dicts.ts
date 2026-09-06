import { visitFormFields } from "../schema/import-field-meta";
import type { FormSchema } from "../schema/types";
import { resolveSchemaFieldDictCode } from "./schema-field-display";

/** 从 FormSchema 收集 Reviewer 展示时可能需要 value→label 映射的字典编码 */
export function collectSchemaDictCodes(schema: FormSchema | null | undefined): string[] {
  if (!schema) {
    return [];
  }
  const dictCodes = new Set<string>();
  visitFormFields(schema, (field) => {
    const dictCode = resolveSchemaFieldDictCode(field);
    if (dictCode) {
      dictCodes.add(dictCode);
    }
  });
  return Array.from(dictCodes);
}
