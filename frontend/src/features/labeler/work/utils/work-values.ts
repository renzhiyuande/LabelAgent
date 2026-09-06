import {
  buildFormDefaultValues,
  parseFormSchemaJson,
} from "@/low-code/utils/form-schema";
import { getValueAtPath, setValueAtPath } from "@/low-code/utils/object-path";
import { mergeFormValues } from "@/low-code/utils/form-values";
import type { LabelerWorkDetailResponse } from "../../api/labeler-work-api";
import type { LabelerLocalDraftEntry } from "./labeler-draft-storage";

function parseInstant(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function isRuntimeFormPath(path: string): boolean {
  return path === "runtime" || path.startsWith("runtime.");
}

export function buildWorkValuesFromDetail(detail: LabelerWorkDetailResponse): Record<string, unknown> {
  const schema = parseFormSchemaJson(detail.templateVersion.schemaJson);
  const defaults = buildFormDefaultValues(schema);
  const draft = detail.submission.draftData ?? {};
  return mergeFormValues(defaults, draft);
}

/** 本地 stash 优先，但 runtime 子字段若为空则回填服务端草稿，避免切题后 AI 建议丢失 */
export function mergeStashedDraftWithServerRuntime(
  stashed: Record<string, unknown>,
  detail: LabelerWorkDetailResponse,
): Record<string, unknown> {
  const serverValues = buildWorkValuesFromDetail(detail);
  const serverRuntime = getValueAtPath(serverValues, "runtime");
  if (serverRuntime == null || typeof serverRuntime !== "object" || Array.isArray(serverRuntime)) {
    return stashed;
  }

  const stashedRuntime = getValueAtPath(stashed, "runtime");
  const mergedRuntime: Record<string, unknown> =
    stashedRuntime != null && typeof stashedRuntime === "object" && !Array.isArray(stashedRuntime)
      ? { ...(stashedRuntime as Record<string, unknown>) }
      : {};

  for (const [key, value] of Object.entries(serverRuntime as Record<string, unknown>)) {
    const current = mergedRuntime[key];
    const currentEmpty = current == null || current === "";
    if (currentEmpty && value != null && value !== "") {
      mergedRuntime[key] = value;
    }
  }

  return setValueAtPath({ ...stashed }, "runtime", mergedRuntime);
}

export interface ResolvedWorkValues {
  values: Record<string, unknown>;
  recoveredFromLocal: boolean;
  needsSync: boolean;
}

/** 比较本地与服务端草稿时间戳，决定恢复来源 */
export function resolveWorkValuesForAssignment(
  detail: LabelerWorkDetailResponse,
  localDraft?: LabelerLocalDraftEntry | null,
): ResolvedWorkValues {
  const serverValues = buildWorkValuesFromDetail(detail);
  if (!localDraft) {
    return { values: serverValues, recoveredFromLocal: false, needsSync: false };
  }

  const serverSavedAt = detail.submission.draftSavedAt;
  const localIsNewer =
    !serverSavedAt || parseInstant(localDraft.updatedAt) > parseInstant(serverSavedAt);

  if (!localIsNewer) {
    return { values: serverValues, recoveredFromLocal: false, needsSync: false };
  }

  return {
    values: mergeStashedDraftWithServerRuntime(localDraft.values, detail),
    recoveredFromLocal: true,
    needsSync: true,
  };
}
