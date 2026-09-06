import { useEffect } from "react";
import { appMessage } from "@/lib/message";
import { getReviewActionBlockReason } from "../utils/review-action-guard";
import type { ManualReviewDetail } from "../types";

export interface ReviewerAuditPoolHotkeyGuard {
  detail: ManualReviewDetail | null | undefined;
  saving: boolean;
  comment: string;
}

export interface ReviewerAuditPoolHotkeyHandlers {
  onApprove?: () => void;
  onReject?: () => void;
  onReturn?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export interface ReviewerAuditPoolHotkeyOptions extends ReviewerAuditPoolHotkeyGuard, ReviewerAuditPoolHotkeyHandlers {
  enabled?: boolean;
  canPrev?: boolean;
  canNext?: boolean;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  if (target.isContentEditable) {
    return true;
  }
  return Boolean(target.closest("[contenteditable='true']"));
}

function runGuardedReviewAction(guard: ReviewerAuditPoolHotkeyGuard, action?: () => void) {
  const blockReason = getReviewActionBlockReason(guard);
  if (blockReason) {
    appMessage.info(blockReason);
    return;
  }
  action?.();
}

export function resolveReviewerAuditPoolHotkeyAction(
  key: string,
  options: ReviewerAuditPoolHotkeyOptions,
): "approve" | "reject" | "return" | "prev" | "next" | null {
  if (options.enabled === false) {
    return null;
  }

  const normalized = key.toLowerCase();
  switch (normalized) {
    case "a":
      return "approve";
    case "r":
      return "reject";
    case "t":
      return "return";
    case "s":
      return options.canNext ? "next" : null;
    case "arrowleft":
    case "arrowup":
      return options.canPrev ? "prev" : null;
    case "arrowright":
    case "arrowdown":
      return options.canNext ? "next" : null;
    default:
      return null;
  }
}

export function useReviewerAuditPoolHotkeys(options: ReviewerAuditPoolHotkeyOptions) {
  const {
    enabled = true,
    canPrev = false,
    canNext = false,
    detail,
    saving,
    comment,
    onApprove,
    onReject,
    onReturn,
    onPrev,
    onNext,
  } = options;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) {
        return;
      }

      const action = resolveReviewerAuditPoolHotkeyAction(event.key, {
        enabled,
        canPrev,
        canNext,
        detail,
        saving,
        comment,
      });
      if (!action) {
        return;
      }

      event.preventDefault();
      const guard = { detail, saving, comment };

      switch (action) {
        case "approve":
          runGuardedReviewAction(guard, onApprove);
          break;
        case "reject":
          runGuardedReviewAction(guard, onReject);
          break;
        case "return":
          runGuardedReviewAction(guard, onReturn);
          break;
        case "prev":
          onPrev?.();
          break;
        case "next":
          onNext?.();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canNext,
    canPrev,
    comment,
    detail,
    enabled,
    onApprove,
    onNext,
    onPrev,
    onReject,
    onReturn,
    saving,
  ]);
}
