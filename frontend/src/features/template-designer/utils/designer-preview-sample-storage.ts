import type { DesignerPreviewSampleState } from "../stores/designer-editor-store";

const STORAGE_KEY = "labelhub:designer:preview-sample";

export interface StoredPreviewSampleSelection {
  templateId: string | null;
  taskId: string;
  taskItemId: string;
}

export function loadPreviewSampleSelection(
  templateId: string | null,
): StoredPreviewSampleSelection | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredPreviewSampleSelection;
    if (!parsed?.taskId || !parsed?.taskItemId) {
      return null;
    }
    if (templateId && parsed.templateId && parsed.templateId !== templateId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function savePreviewSampleSelection(
  templateId: string | null,
  sample: Pick<DesignerPreviewSampleState, "taskId" | "taskItemId">,
): void {
  if (typeof window === "undefined") {
    return;
  }
  const payload: StoredPreviewSampleSelection = {
    templateId,
    taskId: sample.taskId,
    taskItemId: sample.taskItemId,
  };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearPreviewSampleSelection(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.removeItem(STORAGE_KEY);
}
