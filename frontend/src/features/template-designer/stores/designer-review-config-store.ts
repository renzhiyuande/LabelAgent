import { create } from "zustand";
import type { ReviewDimensionItem } from "../types/review-dimension";
import {
  toReviewDimensionPayload,
  validateReviewDimensions,
} from "../utils/review-dimension-utils";
import { buildReviewPromptFromDimensions } from "@/features/template-review-config/utils/review-prompt-builder";

export type ReviewConfigMode = "standard" | "pro";

export interface ReviewDraftSnapshot {
  mode: ReviewConfigMode;
  promptTemplate: string;
  draftItems: ReviewDimensionItem[];
}

export interface ReviewDraftSavePayload {
  reviewPromptTemplate: string;
  dimensions: ReviewDimensionItem[];
}

interface BoundReviewDraft {
  versionId: string;
  dirty: boolean;
  getSnapshot: () => ReviewDraftSnapshot;
}

interface DesignerReviewConfigState {
  bound: BoundReviewDraft | null;
  bindDraft: (
    versionId: string,
    getSnapshot: () => ReviewDraftSnapshot,
    dirty: boolean,
  ) => void;
  unbindDraft: (versionId: string) => void;
  markClean: (versionId: string) => void;
  buildPendingSavePayload: (versionId: string) => ReviewDraftSavePayload | null;
  validatePendingSavePayload: (versionId: string) => string | null;
}

function resolveReviewPrompt(snapshot: ReviewDraftSnapshot): string {
  const dimensions = toReviewDimensionPayload(snapshot.draftItems);
  return snapshot.mode === "standard"
    ? buildReviewPromptFromDimensions(dimensions)
    : snapshot.promptTemplate.trim();
}

export const useDesignerReviewConfigStore = create<DesignerReviewConfigState>((set, get) => ({
  bound: null,

  bindDraft(versionId, getSnapshot, dirty) {
    set({ bound: { versionId, getSnapshot, dirty } });
  },

  unbindDraft(versionId) {
    const { bound } = get();
    if (bound?.versionId === versionId) {
      set({ bound: null });
    }
  },

  markClean(versionId) {
    const { bound } = get();
    if (bound?.versionId === versionId) {
      set({ bound: { ...bound, dirty: false } });
    }
  },

  buildPendingSavePayload(versionId) {
    const { bound } = get();
    if (!bound || bound.versionId !== versionId || !bound.dirty) {
      return null;
    }
    const snapshot = bound.getSnapshot();
    const dimensions = toReviewDimensionPayload(snapshot.draftItems);
    return {
      reviewPromptTemplate: resolveReviewPrompt(snapshot),
      dimensions,
    };
  },

  validatePendingSavePayload(versionId) {
    const payload = get().buildPendingSavePayload(versionId);
    if (!payload) {
      return null;
    }
    return validateReviewDimensions(payload.dimensions);
  },
}));
