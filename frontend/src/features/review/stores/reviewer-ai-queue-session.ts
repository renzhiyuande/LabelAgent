import { create } from "zustand";
import {
  advanceReviewerAiQueue,
  fetchReviewerAiQueue,
  fetchReviewerAiQueueDetail,
  fetchReviewerAiQueueStats,
  fetchReviewerAiQueueStatusCounts,
  retryReviewerAiQueueReview,
  type AiQueueAdvanceAction,
  type AiQueueStatsResponse,
  type ReviewerSubmissionDetailResponse,
} from "../api/reviewer-workbench-api";
import type { AiQueueDetail, AiQueueRow, AiQueueStatus } from "../types";
import {
  mapReviewerDetailToAiQueueDetail,
  mapReviewerQueueRowToAiQueueRow,
} from "../utils/map-reviewer-ai-queue";

export const AI_QUEUE_PAGE_SIZE = 50;

interface ReviewerAiQueueSessionState {
  rows: AiQueueRow[];
  statusFilter: AiQueueStatus | "all";
  queueLoading: boolean;
  detailLoading: boolean;
  detail: AiQueueDetail | null;
  statusCounts: Record<string, number>;
  stats: AiQueueStatsResponse | null;
  statsLoading: boolean;
  activeSubmissionId: string | null;
  details: Record<string, ReviewerSubmissionDetailResponse>;
  inFlightDetailIds: Record<string, boolean>;

  reset: () => void;
  setStatusFilter: (status: AiQueueStatus | "all") => void;
  loadQueue: (status: AiQueueStatus | "all") => Promise<AiQueueRow[]>;
  refreshStatusCounts: () => Promise<void>;
  refreshStats: (taskId?: number) => Promise<void>;
  ensureDetail: (submissionId: string, options?: { force?: boolean }) => Promise<AiQueueDetail | null>;
  advanceSubmission: (submissionId: string, action: AiQueueAdvanceAction) => Promise<void>;
  retryAiReview: (submissionId: string) => Promise<void>;
}

const initialState = {
  rows: [] as AiQueueRow[],
  statusFilter: "pending" as AiQueueStatus | "all",
  queueLoading: false,
  detailLoading: false,
  detail: null as AiQueueDetail | null,
  statusCounts: {} as Record<string, number>,
  stats: null as AiQueueStatsResponse | null,
  statsLoading: false,
  activeSubmissionId: null as string | null,
  details: {} as Record<string, ReviewerSubmissionDetailResponse>,
  inFlightDetailIds: {} as Record<string, boolean>,
};

let statusCountsInFlight: Promise<void> | null = null;

export const useReviewerAiQueueSessionStore = create<ReviewerAiQueueSessionState>((set, get) => ({
  ...initialState,

  reset: () => set({ ...initialState }),

  setStatusFilter: (status) => set({ statusFilter: status }),

  loadQueue: async (status) => {
    set({ queueLoading: true, statusFilter: status });
    try {
      const page = await fetchReviewerAiQueue({
        page: 1,
        pageSize: AI_QUEUE_PAGE_SIZE,
        status: status === "all" ? undefined : status,
      });
      const rows = page.list.map(mapReviewerQueueRowToAiQueueRow);
      set({ rows, queueLoading: false });
      void get().refreshStatusCounts();
      return rows;
    } catch (error) {
      set({ queueLoading: false });
      throw error;
    }
  },

  refreshStatusCounts: async () => {
    if (statusCountsInFlight) {
      await statusCountsInFlight;
      return;
    }
    statusCountsInFlight = (async () => {
      try {
        const statusCounts = await fetchReviewerAiQueueStatusCounts();
        set({ statusCounts });
      } catch {
        const rows = get().rows;
        set({
          statusCounts: {
            all: rows.length,
            pending: rows.filter((row) => row.status === "pending").length,
            passed: rows.filter((row) => row.status === "passed").length,
            returned: rows.filter((row) => row.status === "returned").length,
            manual: rows.filter((row) => row.status === "manual").length,
            failed: rows.filter((row) => row.status === "failed").length,
          },
        });
      }
    })();
    try {
      await statusCountsInFlight;
    } finally {
      statusCountsInFlight = null;
    }
  },

  refreshStats: async (taskId) => {
    set({ statsLoading: true });
    try {
      const stats = await fetchReviewerAiQueueStats(taskId);
      set({ stats, statsLoading: false });
    } catch {
      set({ stats: null, statsLoading: false });
    }
  },

  ensureDetail: async (submissionId, options) => {
    const cached = get().details[submissionId];
    const currentRow = get().rows.find((row) => row.id === submissionId) ?? null;
    if (cached && !options?.force) {
      const detail = mapReviewerDetailToAiQueueDetail(cached, currentRow);
      set({ detail, activeSubmissionId: submissionId, detailLoading: false });
      void get().refreshStats(cached.taskId);
      return detail;
    }
    if (get().inFlightDetailIds[submissionId]) {
      return get().detail;
    }
    set((state) => ({
      activeSubmissionId: submissionId,
      detailLoading: true,
      inFlightDetailIds: { ...state.inFlightDetailIds, [submissionId]: true },
    }));
    try {
      const response = await fetchReviewerAiQueueDetail(submissionId);
      const detail = mapReviewerDetailToAiQueueDetail(response, currentRow);
      set((state) => ({
        detail,
        detailLoading: false,
        details: { ...state.details, [submissionId]: response },
        inFlightDetailIds: { ...state.inFlightDetailIds, [submissionId]: false },
      }));
      void get().refreshStats(response.taskId);
      return detail;
    } catch (error) {
      set((state) => ({
        detailLoading: false,
        inFlightDetailIds: { ...state.inFlightDetailIds, [submissionId]: false },
      }));
      throw error;
    }
  },

  advanceSubmission: async (submissionId, action) => {
    await advanceReviewerAiQueue(submissionId, action);
    const status = get().statusFilter;
    await get().loadQueue(status);
    await get().ensureDetail(submissionId, { force: true });
  },

  retryAiReview: async (submissionId) => {
    await retryReviewerAiQueueReview(submissionId);
    const status = get().statusFilter;
    await get().loadQueue(status);
    await get().ensureDetail(submissionId, { force: true });
  },
}));
