import type { FormSchema } from "@/low-code/schema/types";
import type { LabelerRenderPrefs } from "../../workbench/labeler-render-prefs";
import { splitLabelerFormSchema } from "./split-labeler-schema";

export function resolveLabelerSplitSchemas(
  schema: FormSchema,
  _prefs: LabelerRenderPrefs,
): {
  displaySchema: FormSchema;
  annotateSchema: FormSchema;
} {
  return splitLabelerFormSchema(schema);
}
