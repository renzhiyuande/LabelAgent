import { create } from "zustand";
import {
  fetchLabelerMyWorks,
  fetchLabelerWork,
  fetchLabelerWorkSession,
  type LabelerMyWorkRow,
  type LabelerWorkDetailResponse,
} from "../../api/labeler-work-api";
import type { LabelerQueueScope, LabelerQueueScopeItem } from "../types/labeler-queue-scope";
import { labelerQueueScopeTaskIds } from "../types/labeler-queue-scope";
import { prefetchWorksWithLimit } from "../utils/prefetch-works";
import {
  createLocalDraftEntry,
  loadPersistedLabelerDrafts,
  persistLabelerDrafts,
  type LabelerLocalDraftStore,
} from "../utils/labeler-draft-storage";

export const QUEUE_PAGE_SIZE = 20;
const MAX_CACHED_WORKS = 100;
const IDLE_PREFETCH_MS = 400;

type LabelerQueueSource = "session" | "aggregated";

interface LabelerWorkSessionState {
  taskId: number | null;
  activeAssignmentId: string | null;
  queueScope: LabelerQueueScope | null;
  queueSource: LabelerQueueSource;
  queueRows: LabelerMyWorkRow[];
  queuePage: number;
  queueTotal: number;
  queueLoading: boolean;
  queueLoadingMore: boolean;
  works: Record<string, LabelerWorkDetailResponse>;
  draftValues: LabelerLocalDraftStore;
  inFlightIds: Record<string, boolean>;

  reset: () => void;
  setActiveAssignmentId: (assignmentId: string) => void;
  stashDraft: (assignmentId: string, values: Record<string, unknown>, updatedAt?: string) => void;
  clearDraft: (assignmentId: string) => void;
  getCachedWork: (assignmentId: string) => LabelerWorkDetailResponse | undefined;
  cacheWork: (assignmentId: string, detail: LabelerWorkDetailResponse) => void;
  cacheWorks: (works: Record<string, LabelerWorkDetailResponse>) => void;
  patchCachedSubmissionDraft: (assignmentId: string, draftData: Record<string, unknown>) => void;
  ensureWork: (assignmentId: string, options?: { force?: boolean }) => Promise<LabelerWorkDetailResponse>;
  refreshWork: (assignmentId: string) => Promise<LabelerWorkDetailResponse>;
  bootstrapWorkSession: (assignmentId: string) => Promise<LabelerWorkDetailResponse>;
  loadWorkSessionPage: (assignmentId: string, page: number, append?: boolean) => Promise<void>;
  refreshTaskQueue: (assignmentId: string) => Promise<LabelerMyWorkRow[]>;
  loadQueueNextPage: () => Promise<void>;
  applyQueueScope: (items: LabelerQueueScopeItem[]) => Promise<string | null>;
  clearQueueScope: () => void;
  prefetchQueueWorks: (rows: LabelerMyWorkRow[]) => Promise<void>;
  scheduleIdlePrefetchNextPage: (taskId: number) => void;
}

const initialState = {
  taskId: null as number | null,
  activeAssignmentId: null as string | null,
  queueScope: null as LabelerQueueScope | null,
  queueSource: "session" as LabelerQueueSource,
  queueRows: [] as LabelerMyWorkRow[],
  queuePage: 0,
  queueTotal: 0,
  queueLoading: false,
  queueLoadingMore: false,
  works: {} as Record<string, LabelerWorkDetailResponse>,
  draftValues: loadPersistedLabelerDrafts(),
  inFlightIds: {} as Record<string, boolean>,
};

let idlePrefetchTimer: ReturnType<typeof setTimeout> | null = null;

function trimCache(
  works: Record<string, LabelerWorkDetailResponse>,
  keepIds: Set<string>,
): Record<string, LabelerWorkDetailResponse> {
  const entries = Object.entries(works);
  if (entries.length <= MAX_CACHED_WORKS) {
    return works;
  }
  const next: Record<string, LabelerWorkDetailResponse> = {};
  for (const [id, detail] of entries) {
    if (keepIds.has(id)) {
      next[id] = detail;
    }
  }
  return next;
}

function mergeQueueRows(existing: LabelerMyWorkRow[], incoming: LabelerMyWorkRow[]): LabelerMyWorkRow[] {
  const existingIds = new Set(existing.map((row) => row.assignmentId));
  return [...existing, ...incoming.filter((row) => !existingIds.has(row.assignmentId))];
}

export const useLabelerWorkSessionStore = create<LabelerWorkSessionState>((set, get) => ({
  ...initialState,

  reset: () => {
    if (idlePrefetchTimer) {
      clearTimeout(idlePrefetchTimer);
      idlePrefetchTimer = null;
    }
    set({ ...initialState });
  },

  setActiveAssignmentId: (assignmentId) => {
    set({ activeAssignmentId: assignmentId });
  },

  stashDraft: (assignmentId, values, updatedAt) => {
    const entry = createLocalDraftEntry(values, updatedAt);
    set((state) => {
      const draftValues = { ...state.draftValues, [assignmentId]: entry };
      persistLabelerDrafts(draftValues);
      return { draftValues };
    });
  },

  clearDraft: (assignmentId) => {
    set((state) => {
      const draftValues = { ...state.draftValues };
      delete draftValues[assignmentId];
      persistLabelerDrafts(draftValues);
      return { draftValues };
    });
  },

  getCachedWork: (assignmentId) => get().works[assignmentId],

  cacheWork: (assignmentId, detail) => {
    set((state) => {
      const keepIds = new Set(Object.keys(state.works));
      keepIds.add(assignmentId);
      for (const row of state.queueRows) {
        keepIds.add(String(row.assignmentId));
      }
      const works = trimCache({ ...state.works, [assignmentId]: detail }, keepIds);
      return { works };
    });
  },

  cacheWorks: (newWorks) => {
    set((state) => {
      const merged = { ...state.works, ...newWorks };
      const keepIds = new Set([
        ...Object.keys(newWorks),
        ...state.queueRows.map((r) => String(r.assignmentId)),
      ]);
      return { works: trimCache(merged, keepIds) };
    });
  },

  patchCachedSubmissionDraft: (assignmentId, draftData) => {
    const cached = get().getCachedWork(assignmentId);
    if (!cached) {
      return;
    }
    get().cacheWork(assignmentId, {
      ...cached,
      submission: {
        ...cached.submission,
        draftData,
        draftSavedAt: new Date().toISOString(),
      },
    });
  },

  refreshWork: async (assignmentId) => {
    set((state) => ({ inFlightIds: { ...state.inFlightIds, [assignmentId]: true } }));
    try {
      const detail = await fetchLabelerWork(assignmentId);
      get().cacheWork(assignmentId, detail);
      return detail;
    } finally {
      set((state) => {
        const next = { ...state.inFlightIds };
        delete next[assignmentId];
        return { inFlightIds: next };
      });
    }
  },

  ensureWork: async (assignmentId, options) => {
    if (!options?.force) {
      const cached = get().getCachedWork(assignmentId);
      if (cached) {
        return cached;
      }
    }

    return get().refreshWork(assignmentId);
  },

  bootstrapWorkSession: async (assignmentId) => {
    set({
      activeAssignmentId: assignmentId,
      queueLoading: true,
      queueRows: [],
      queuePage: 0,
      queueTotal: 0,
    });

    try {
      const session = await fetchLabelerWorkSession({
        assignmentId,
        page: 1,
        pageSize: QUEUE_PAGE_SIZE,
      });
      get().cacheWorks(session.works);
      set({
        taskId: session.taskMeta.taskId,
        queueScope: {
          items: [
            {
              taskId: session.taskMeta.taskId,
              taskName: session.taskMeta.taskName,
              sceneCode: session.taskMeta.sceneCode,
            },
          ],
        },
        queueSource: "session",
        queueRows: session.queue.list,
        queuePage: 1,
        queueTotal: session.queue.total,
        queueLoading: false,
      });
      get().scheduleIdlePrefetchNextPage(session.taskMeta.taskId);

      const detail = session.works[assignmentId] ?? get().getCachedWork(assignmentId);
      if (!detail) {
        throw new Error("Work session missing current assignment");
      }
      return detail;
    } catch (error) {
      set({ queueLoading: false });
      throw error;
    }
  },

  loadWorkSessionPage: async (assignmentId, page, append = false) => {
    const { taskId } = get();
    if (!taskId) {
      await get().bootstrapWorkSession(assignmentId);
      return;
    }

    if (append) {
      set({ queueLoadingMore: true, activeAssignmentId: assignmentId });
    } else {
      set({ queueLoading: true, activeAssignmentId: assignmentId });
    }

    try {
      const session = await fetchLabelerWorkSession({
        assignmentId,
        taskId,
        page,
        pageSize: QUEUE_PAGE_SIZE,
      });
      get().cacheWorks(session.works);
      set((state) => ({
        taskId: session.taskMeta.taskId,
        queueScope: {
          items: [
            {
              taskId: session.taskMeta.taskId,
              taskName: session.taskMeta.taskName,
              sceneCode: session.taskMeta.sceneCode,
            },
          ],
        },
        queueSource: "session",
        queueRows: append ? mergeQueueRows(state.queueRows, session.queue.list) : session.queue.list,
        queuePage: page,
        queueTotal: session.queue.total,
        queueLoading: false,
        queueLoadingMore: false,
      }));
      if (page === 1) {
        get().scheduleIdlePrefetchNextPage(session.taskMeta.taskId);
      }
    } catch (error) {
      set({ queueLoading: false, queueLoadingMore: false });
      throw error;
    }
  },

  loadQueueNextPage: async () => {
    const state = get();
    if (state.queueLoading || state.queueLoadingMore || state.queueRows.length >= state.queueTotal) {
      return;
    }

    if (state.queueSource === "aggregated") {
      const { queueScope, queuePage } = state;
      if (!queueScope) {
        return;
      }
      const taskIds = labelerQueueScopeTaskIds(queueScope);
      set({ queueLoadingMore: true });
      try {
        const nextPage = queuePage + 1;
        const response = await fetchLabelerMyWorks({ page: nextPage, pageSize: 50 });
        const filtered = response.list.filter((row) => taskIds.has(row.taskId));
        set((current) => ({
          queueRows: mergeQueueRows(current.queueRows, filtered),
          queuePage: nextPage,
          queueTotal: Math.max(current.queueTotal, response.total),
          queueLoadingMore: false,
        }));
      } catch (error) {
        set({ queueLoadingMore: false });
        throw error;
      }
      return;
    }

    const { taskId, queuePage, activeAssignmentId } = state;
    if (!taskId || !activeAssignmentId) {
      return;
    }
    await get().loadWorkSessionPage(activeAssignmentId, queuePage + 1, true);
  },

  applyQueueScope: async (items) => {
    if (items.length === 0) {
      return null;
    }

    const scope: LabelerQueueScope = { items };
    set({ queueScope: scope, queueLoading: true });

    if (items.length === 1) {
      const scopedTask = items[0];
      const current = get();
      const currentRow = current.queueRows.find((row) => String(row.assignmentId) === current.activeAssignmentId);
      let anchorId = current.activeAssignmentId;

      if (!currentRow || currentRow.taskId !== scopedTask.taskId) {
        const works = await fetchLabelerMyWorks({ page: 1, pageSize: 1, taskId: scopedTask.taskId });
        const first = works.list[0];
        if (first) {
          anchorId = String(first.assignmentId);
        }
      }

      if (!anchorId) {
        set({ queueLoading: false });
        return null;
      }

      set({ queueSource: "session", activeAssignmentId: anchorId });
      await get().loadWorkSessionPage(anchorId, 1, false);
      return anchorId;
    }

    const taskIds = labelerQueueScopeTaskIds(scope);
    try {
      const response = await fetchLabelerMyWorks({ page: 1, pageSize: 100 });
      const filtered = response.list.filter((row) => taskIds.has(row.taskId));
      set({
        queueSource: "aggregated",
        taskId: null,
        queueRows: filtered,
        queuePage: 1,
        queueTotal: response.total,
        queueLoading: false,
      });
      const first = filtered[0];
      return first ? String(first.assignmentId) : null;
    } catch (error) {
      set({ queueLoading: false });
      throw error;
    }
  },

  clearQueueScope: () => {
    set({
      queueScope: null,
      queueRows: [],
      queuePage: 0,
      queueTotal: 0,
      queueSource: "session",
    });
  },

  refreshTaskQueue: async (assignmentId) => {
    const { taskId } = get();
    if (!taskId) {
      await get().bootstrapWorkSession(assignmentId);
    } else {
      await get().loadWorkSessionPage(assignmentId, 1, false);
    }

    const waitForIdle = () =>
      new Promise<void>((resolve) => {
        const state = get();
        if (!state.queueLoading && !state.queueLoadingMore) {
          resolve();
          return;
        }
        const unsub = useLabelerWorkSessionStore.subscribe((s) => {
          if (!s.queueLoading && !s.queueLoadingMore) {
            unsub();
            resolve();
          }
        });
      });

    while (true) {
      await waitForIdle();
      const state = get();
      if (state.queueRows.length >= state.queueTotal) {
        break;
      }
      await get().loadQueueNextPage();
    }

    return get().queueRows;
  },

  prefetchQueueWorks: async (rows) => {
    const ids = rows.map((row) => String(row.assignmentId));
    await prefetchWorksWithLimit(
      ids,
      (id) => get().works[id],
      (id) => Boolean(get().inFlightIds[id]),
      (id, flying) =>
        set((state) => {
          const next = { ...state.inFlightIds };
          if (flying) {
            next[id] = true;
          } else {
            delete next[id];
          }
          return { inFlightIds: next };
        }),
      (id, detail) => get().cacheWork(id, detail),
    );
  },

  scheduleIdlePrefetchNextPage: (taskId) => {
    if (idlePrefetchTimer) {
      clearTimeout(idlePrefetchTimer);
    }
    idlePrefetchTimer = setTimeout(() => {
      idlePrefetchTimer = null;
      const state = get();
      if (state.taskId !== taskId || state.queueRows.length >= state.queueTotal) {
        return;
      }
      void get().loadQueueNextPage();
    }, IDLE_PREFETCH_MS);
  },
}));
