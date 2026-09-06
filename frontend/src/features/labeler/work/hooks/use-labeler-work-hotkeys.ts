import { useEffect } from "react";
import { shouldIgnoreNavigationHotkey } from "../utils/work-queue-navigation";

interface UseLabelerWorkHotkeysOptions {
  enabled?: boolean;
  canPrev?: boolean;
  canNext?: boolean;
  canSubmit?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onSaveDraft?: () => void;
  onSubmit?: () => void;
}

export function useLabelerWorkHotkeys({
  enabled = true,
  canPrev = false,
  canNext = false,
  canSubmit = true,
  onPrev,
  onNext,
  onSaveDraft,
  onSubmit,
}: UseLabelerWorkHotkeysOptions) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      const withMod = event.metaKey || event.ctrlKey;

      if (withMod && key === "s") {
        event.preventDefault();
        onSaveDraft?.();
        return;
      }

      if (withMod && key === "enter") {
        if (!canSubmit) {
          return;
        }
        event.preventDefault();
        onSubmit?.();
        return;
      }

      if (shouldIgnoreNavigationHotkey(event.target)) {
        return;
      }

      const isPrev = key === "arrowleft" || key === "arrowup";
      const isNext = key === "arrowright" || key === "arrowdown";

      if (isPrev && canPrev) {
        event.preventDefault();
        onPrev?.();
        return;
      }

      if (isNext && canNext) {
        event.preventDefault();
        onNext?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canNext, canPrev, canSubmit, enabled, onNext, onPrev, onSaveDraft, onSubmit]);
}
