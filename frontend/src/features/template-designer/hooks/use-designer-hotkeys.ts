import { useCallback, useEffect } from "react";
import { useDesignerEditorStore } from "../stores/designer-editor-store";
import { useDesignerSessionStore } from "../stores/designer-session-store";

export function useDesignerHotkeys(enabled: boolean) {
  const selectedId = useDesignerEditorStore((state) => state.selectedId);
  const getSelectedField = useDesignerEditorStore((state) => state.getSelectedField);
  const removeField = useDesignerEditorStore((state) => state.removeField);
  const clearSelection = useDesignerEditorStore((state) => state.clearSelection);
  const togglePreviewMode = useDesignerEditorStore((state) => state.togglePreviewMode);
  const saveDraft = useDesignerSessionStore((state) => state.saveDraft);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) {
        return;
      }

      const isMeta = event.metaKey || event.ctrlKey;
      if (isMeta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveDraft();
        return;
      }

      if (event.key === "Escape") {
        const { isPreviewMode } = useDesignerEditorStore.getState();
        if (isPreviewMode) {
          togglePreviewMode(false);
        } else {
          clearSelection();
        }
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        const target = event.target as HTMLElement;
        const isInput =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;
        if (!isInput && getSelectedField()) {
          event.preventDefault();
          removeField(selectedId);
        }
      }
    },
    [clearSelection, enabled, getSelectedField, removeField, saveDraft, selectedId, togglePreviewMode],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
