import type {
  FormFieldImportMeta,
  FormFieldSchema,
  FormSchema,
  ImportFieldRole,
  PayloadSourceKind,
} from "./types";

export type { ImportFieldRole, PayloadSourceKind, FormFieldImportMeta };

export function getFieldBinding(field: FormFieldSchema): string | null {
  const binding = (field.path ?? field.key)?.trim();
  return binding || null;
}

export function isRuntimeImportField(field: FormFieldSchema): boolean {
  const meta = field.meta;
  if (meta?.payloadSource === "runtime" || meta?.importRole === "runtime") {
    return true;
  }
  if (meta?.allowImport === true) {
    return false;
  }
  const component = field.component?.toLowerCase() ?? "";
  return component.startsWith("llm");
}

function resolveShowItemContentSource(field: FormFieldSchema): "payload" | "static" | "template" {
  return field.showItem?.contentSource ?? "payload";
}

function resolveShowAssetContentSource(field: FormFieldSchema): "payload" | "asset" | "static" {
  if (field.component === "showImage") {
    return field.showImage?.contentSource ?? "payload";
  }
  if (field.component === "showFile") {
    return field.showFile?.contentSource ?? "payload";
  }
  if (field.component === "showVideo") {
    return field.showVideo?.contentSource ?? "payload";
  }
  return "payload";
}

export function resolveImportRole(field: FormFieldSchema): ImportFieldRole | null {
  if (field.component === "showItem") {
    return resolveShowItemContentSource(field) === "payload" ? "display" : "runtime";
  }
  if (field.component === "showImage" || field.component === "showFile" || field.component === "showVideo") {
    return resolveShowAssetContentSource(field) === "payload" ? "display" : "runtime";
  }
  if (field.component === "dictTagPreview") {
    return "runtime";
  }
  if (field.meta?.importRole) {
    return field.meta.importRole;
  }
  if (isRuntimeImportField(field)) {
    return "runtime";
  }
  if (field.readonly) {
    return "display";
  }
  const binding = getFieldBinding(field);
  if (!binding) {
    return null;
  }
  return "input";
}

export function withImportFieldMeta(
  field: FormFieldSchema,
  role: ImportFieldRole,
): FormFieldSchema {
  const meta: FormFieldImportMeta = {
    importRole: role,
    payloadSource: role === "display" ? "import" : role === "input" ? "annotation" : "runtime",
    allowImport: role === "runtime" ? field.meta?.allowImport : undefined,
  };
  if (role === "display") {
    return { ...field, meta, readonly: true };
  }
  if (role === "runtime") {
    return { ...field, meta, readonly: true };
  }
  return { ...field, meta, readonly: field.readonly ?? false };
}

export function visitFormFields(schema: FormSchema, visit: (field: FormFieldSchema) => void): void {
  function walk(fields: FormFieldSchema[]) {
    for (const field of fields) {
      visit(field);
      if (field.fields?.length) {
        walk(field.fields);
      }
    }
  }
  for (const section of schema.sections) {
    walk(section.fields);
  }
}

export function collectBindingsByImportRole(
  schema: FormSchema,
  role: ImportFieldRole,
): string[] {
  const keys = new Set<string>();
  visitFormFields(schema, (field) => {
    if (resolveImportRole(field) !== role) {
      return;
    }
    const binding = getFieldBinding(field);
    if (binding) {
      keys.add(binding);
    }
  });
  return Array.from(keys).sort((a, b) => a.localeCompare(b));
}

export interface InferredImportContract {
  schemaVersion: number;
  requiredKeys: string[];
  optionalKeys: string[];
  forbiddenKeys: string[];
  source: string;
}

export function inferImportContractFromFormSchema(schema: FormSchema): InferredImportContract | null {
  const requiredKeys = collectBindingsByImportRole(schema, "display");
  const optionalKeys = collectBindingsByImportRole(schema, "input");
  if (requiredKeys.length === 0 && optionalKeys.length === 0) {
    return null;
  }
  return {
    schemaVersion: 1,
    requiredKeys,
    optionalKeys,
    forbiddenKeys: collectBindingsByImportRole(schema, "runtime"),
    source: "FROM_TEMPLATE",
  };
}

export interface SchemaContractValidationResult {
  ok: boolean;
  message?: string;
  missingRequiredKeys?: string[];
}

/** 保存模板时：冻结的 requiredKeys 须仍作为 display 绑定存在 */
export function validateSchemaRespectsImportContract(
  schema: FormSchema,
  contract: { requiredKeys: string[] },
): SchemaContractValidationResult {
  if (!contract.requiredKeys.length) {
    return { ok: true };
  }
  const displayBindings = new Set(collectBindingsByImportRole(schema, "display"));
  const missingRequiredKeys = contract.requiredKeys.filter((key) => !displayBindings.has(key));
  if (missingRequiredKeys.length === 0) {
    return { ok: true };
  }
  return {
    ok: false,
    missingRequiredKeys,
    message: `模板不能移除或改名已锁定的题目列：${missingRequiredKeys.join("、")}。请保留对应字段且「导入角色」为展示，或先在任务上扩展导入契约。`,
  };
}
