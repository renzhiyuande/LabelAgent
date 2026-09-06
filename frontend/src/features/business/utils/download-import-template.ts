import { inferImportContractFromFormSchema } from "@/low-code/schema/import-field-meta";
import type { FormSchema } from "@/low-code/schema/types";
import {
  allowedImportKeys,
  type TaskImportPayloadContract,
} from "./import-payload-contract";
import type { TaskImportTemplateContext } from "./import-template-draft";

export function resolveDownloadImportContract(
  context: TaskImportTemplateContext | null | undefined,
): TaskImportPayloadContract | null {
  if (!context?.hasTemplate) {
    return null;
  }
  if (context.importContract) {
    return context.importContract;
  }
  if (context.formSchema) {
    const inferred = inferImportContractFromFormSchema(context.formSchema);
    if (inferred) {
      return inferred;
    }
  }
  if (context.payloadKeys.length > 0) {
    return {
      requiredKeys: [...context.payloadKeys],
      optionalKeys: [],
    };
  }
  return null;
}

export function resolveDownloadImportContractFromSchema(
  formSchema: FormSchema | null | undefined,
): TaskImportPayloadContract | null {
  if (!formSchema) {
    return null;
  }
  return inferImportContractFromFormSchema(formSchema);
}

export function buildImportTemplateSample(
  contract: TaskImportPayloadContract,
): Array<Record<string, string>> {
  const sample: Record<string, string> = {};
  for (const key of allowedImportKeys(contract)) {
    sample[key] = "";
  }
  return [sample];
}

export function downloadImportTemplateJson(
  contract: TaskImportPayloadContract,
  filename = "import-template.json",
): void {
  const payload = buildImportTemplateSample(contract);
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
