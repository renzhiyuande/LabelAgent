import { create } from "zustand";
import type { PageResponse } from "@/types";
import {
  decideReviewerAuditPool,
  fetchReviewerAuditPool,
  fetchReviewerAuditPoolDetail,
  fetchReviewerAuditPoolGroups,
  fetchReviewerAuditPoolMeta,
  fetchReviewerSubmissionReviewRecords,
  type AuditPoolGroupResponse,
  type AuditPoolLevelCountResponse,
  type AuditPoolScopeType,
  type ReviewerSubmissionDetailResponse,
} from "../api/reviewer-workbench-api";
import { isSameAuditPoolQueueScope, resolveAuditPoolMetaTaskId, serializeScopeIds } from "../utils/audit-pool-scope";
import type { AuditPoolGroupBy, AuditPoolQueueScope, ManualReviewDetail, ManualReviewRow } from "../types";
import { AuditPoolRequestCache, buildAuditPoolCacheKey } from "../utils/audit-pool-request-cache";
import {
  mapReviewerDetailToManualReviewDetail,
  mapReviewerQueueRowToManualReviewRow,
} from "../utils/map-reviewer-audit-pool";

export const AUDIT_POOL_QUEUE_PAGE_SIZE = 50;
export const AUDIT_POOL_GROUP_PAGE_SIZE = 20;

const groupCache = new AuditPoolRequestCache<PageResponse<AuditPoolGroupResponse>>();
const queueCache = new AuditPoolRequestCache<PageResponse<ManualReviewRow>>();

interface ReviewerAuditPoolSessionState {
  queueScope: AuditPoolQueueScope | null;
  reviewLevel: string;
  levelMeta: AuditPoolLevelCountResponse[];
  levelMetaLoading: boolean;
  groupBy: AuditPoolGroupBy;
  groupBrowseKeyword: string;
  groups: AuditPoolGroupResponse[];
  groupsTotal: number;
  groupsPage: number;
  groupsLoading: boolean;
  groupsLoadingMore: boolean;
  rows: ManualReviewRow[];
  queueTotal: number;
  queuePage: number;
  queueLoading: boolean;
  queueLoadingMore: boolean;
  detail: ManualReviewDetail | null;
  detailLoading: boolean;
  activeSubmissionId: string | null;
  details: Record<string, ReviewerSubmissionDetailResponse>;
  inFlightDetailIds: Record<string, boolean>;

  reset: () => void;
  setGroupBy: (groupBy: AuditPoolGroupBy) => void;
  setGroupBrowseKeyword: (keyword: string) => void;
  setQueueScope: (scope: AuditPoolQueueScope | null) => void;
  setReviewLevel: (reviewLevel: string) => void;
  loadLevelMeta: () => Promise<void>;
  loadGroups: (options?: { reset?: boolean }) => Promise<void>;
  loadMoreGroups: () => Promise<void>;
  loadQueue: (options?: { reset?: boolean }) => Promise<ManualReviewRow[]>;
  loadMoreQueue: () => Promise<void>;
  invalidateQueueCache: () => void;
  ensureDetail: (submissionId: string, options?: { force?: boolean }) => Promise<ManualReviewDetail | null>;
  decideSubmission: (
    submissionId: string,
    action: "approve" | "reject" | "return",
    commentText: string,
  ) => Promise<void>;
}

const initialState = {
  queueScope: null as AuditPoolQueueScope | null,
  reviewLevel: "L1",
  levelMeta: [] as AuditPoolLevelCountResponse[],
  levelMetaLoading: false,
  groupBy: "task" as AuditPoolGroupBy,
  groupBrowseKeyword: "",
  groups: [] as AuditPoolGroupResponse[],
  groupsTotal: 0,
  groupsPage: 1,
  groupsLoading: false,
  groupsLoadingMore: false,
  rows: [] as ManualReviewRow[],
  queueTotal: 0,
  queuePage: 1,
  queueLoading: false,
  queueLoadingMore: false,
  detail: null as ManualReviewDetail | null,
  detailLoading: false,
  activeSubmissionId: null as string | null,
  details: {} as Record<string, ReviewerSubmissionDetailResponse>,
  inFlightDetailIds: {} as Record<string, boolean>,
};

export const useReviewerAuditPoolSessionStore = create<ReviewerAuditPoolSessionState>((set, get) => ({
  ...initialState,

  reset: () => {
    groupCache.invalidate();
    queueCache.invalidate();
    set({ ...initialState });
  },

  setGroupBy: (groupBy) => {
    groupCache.invalidate((key) => key.startsWith("groups="));
    set({ groupBy, groups: [], groupsTotal: 0, groupsPage: 1 });
  },

  setGroupBrowseKeyword: (keyword) => {
    groupCache.invalidate((key) => key.startsWith("groups="));
    set({ groupBrowseKeyword: keyword, groups: [], groupsTotal: 0, groupsPage: 1 });
  },

  setQueueScope: (scope) => {
    const current = get().queueScope;
    if (isSameAuditPoolQueueScope(current, scope)) {
      if (current !== scope) {
        set({ queueScope: scope });
      }
      return;
    }
    get().invalidateQueueCache();
    groupCache.invalidate((key) => key.startsWith("groups="));
    set({ queueScope: scope, rows: [], queueTotal: 0, queuePage: 1, levelMeta: [] });
  },

  setReviewLevel: (reviewLevel) => {
    if (!reviewLevel || get().reviewLevel === reviewLevel) {
      return;
    }
    get().invalidateQueueCache();
    groupCache.invalidate((key) => key.startsWith("groups="));
    set({ reviewLevel, rows: [], queueTotal: 0, queuePage: 1 });
  },

  loadLevelMeta: async () => {
    set({ levelMetaLoading: true });
    try {
      const taskId = resolveAuditPoolMetaTaskId(get().queueScope);
      const meta = await fetchReviewerAuditPoolMeta(taskId == null ? undefined : { taskId });
      const levels = meta.levels ?? [];
      set({ levelMeta: levels, levelMetaLoading: false });
      const currentLevel = get().reviewLevel;
      const hasCurrent = levels.some((level) => level.levelKey === currentLevel);
      if (!hasCurrent && levels.length > 0) {
        const preferred =
          levels.find((level) => level.pendingCount > 0)?.levelKey ?? levels[0].levelKey;
        get().setReviewLevel(preferred);
      }
    } catch (error) {
      set({ levelMetaLoading: false });
      throw error;
    }
  },

  invalidateQueueCache: () => {
    queueCache.invalidate((key) => key.startsWith("queue="));
  },

  loadMoreGroups: async () => {
    const state = get();
    if (state.groups.length >= state.groupsTotal || state.groupsLoadingMore) {
      return;
    }
    set({ groupsPage: state.groupsPage + 1 });
    await get().loadGroups({ reset: false });
  },

  loadGroups: async ({ reset = false } = {}) => {
    const state = get();
    const page = reset ? 1 : state.groupsPage;
    if (reset) {
      set({ groupsPage: 1 });
    }
    const cacheKey = buildAuditPoolCacheKey({
      groups: 1,
      groupBy: state.groupBy,
      reviewLevel: state.reviewLevel,
      keyword: state.groupBrowseKeyword,
      page,
      pageSize: AUDIT_POOL_GROUP_PAGE_SIZE,
    });
    const cached = groupCache.get(cacheKey);
    if (cached) {
      set({
        groups: reset ? cached.list : [...state.groups, ...cached.list],
        groupsTotal: cached.total,
        groupsPage: page,
        groupsLoading: false,
        groupsLoadingMore: false,
      });
      return;
    }

    set({
      groupsLoading: reset || page === 1,
      groupsLoadingMore: !reset && page > 1,
    });
    try {
      const response = await fetchReviewerAuditPoolGroups({
        page,
        pageSize: AUDIT_POOL_GROUP_PAGE_SIZE,
        keyword: state.groupBrowseKeyword || undefined,
        groupBy: state.groupBy as AuditPoolScopeType,
        reviewLevel: state.reviewLevel,
      });
      groupCache.set(cacheKey, response);
      set((current) => ({
        groups: reset ? response.list : [...current.groups, ...response.list],
        groupsTotal: response.total,
        groupsPage: page,
        groupsLoading: false,
        groupsLoadingMore: false,
      }));
    } catch (error) {
      set({ groupsLoading: false, groupsLoadingMore: false });
      throw error;
    }
  },

  loadMoreQueue: async () => {
    const state = get();
    if (!state.queueScope || state.rows.length >= state.queueTotal || state.queueLoadingMore) {
      return;
    }
    set({ queuePage: state.queuePage + 1 });
    await get().loadQueue({ reset: false });
  },

  loadQueue: async ({ reset = false } = {}) => {
    const state = get();
    if (!state.queueScope || state.queueScope.items.length === 0) {
      set({ rows: [], queueTotal: 0, queueLoading: false, queueLoadingMore: false });
      return [];
    }

    const page = reset ? 1 : state.queuePage;
    if (reset) {
      set({ queuePage: 1 });
    }
    const cacheKey = buildAuditPoolCacheKey({
      queue: 1,
      scopeType: state.queueScope.type,
      scopeIds: serializeScopeIds(state.queueScope.items),
      reviewLevel: state.reviewLevel,
      page,
      pageSize: AUDIT_POOL_QUEUE_PAGE_SIZE,
    });
    const cached = queueCache.get(cacheKey);
    if (cached) {
      const rows = reset ? cached.list : [...state.rows, ...cached.list];
      set({
        rows,
        queueTotal: cached.total,
        queuePage: page,
        queueLoading: false,
        queueLoadingMore: false,
      });
      return rows;
    }

    set({
      queueLoading: reset || page === 1,
      queueLoadingMore: !reset && page > 1,
    });
    try {
      const response = await fetchReviewerAuditPool({
        page,
        pageSize: AUDIT_POOL_QUEUE_PAGE_SIZE,
        scopeType: state.queueScope.type as AuditPoolScopeType,
        scopeIds: state.queueScope.items.map((item) => item.id),
        reviewLevel: state.reviewLevel,
      });
      const mapped = {
        ...response,
        list: response.list.map(mapReviewerQueueRowToManualReviewRow),
      };
      queueCache.set(cacheKey, mapped);
      const rows = reset ? mapped.list : [...state.rows, ...mapped.list];
      set({
        rows,
        queueTotal: mapped.total,
        queuePage: page,
        queueLoading: false,
        queueLoadingMore: false,
      });
      return rows;
    } catch (error) {
      set({ queueLoading: false, queueLoadingMore: false });
      throw error;
    }
  },

  ensureDetail: async (submissionId, options) => {
    const cached = get().details[submissionId];
    const currentRow = get().rows.find((row) => row.id === submissionId) ?? null;
    if (cached && !options?.force) {
      const reviewRecords = await fetchReviewerSubmissionReviewRecords(submissionId).catch(() => []);
      const detail = mapReviewerDetailToManualReviewDetail(cached, currentRow, reviewRecords);
      set({ detail, activeSubmissionId: submissionId, detailLoading: false });
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
      const [response, reviewRecords] = await Promise.all([
        fetchReviewerAuditPoolDetail(submissionId),
        fetchReviewerSubmissionReviewRecords(submissionId),
      ]);
      const detail = mapReviewerDetailToManualReviewDetail(response, currentRow, reviewRecords);
      set((state) => ({
        detail,
        detailLoading: false,
        details: { ...state.details, [submissionId]: response },
        inFlightDetailIds: { ...state.inFlightDetailIds, [submissionId]: false },
      }));
      return detail;
    } catch (error) {
      set((state) => ({
        detailLoading: false,
        inFlightDetailIds: { ...state.inFlightDetailIds, [submissionId]: false },
      }));
      throw error;
    }
  },

  decideSubmission: async (submissionId, action, commentText) => {
    await decideReviewerAuditPool(submissionId, action, commentText);
    get().invalidateQueueCache();
    groupCache.invalidate((key) => key.startsWith("groups="));
    await Promise.all([get().loadLevelMeta(), get().loadQueue({ reset: true })]);
    await get().ensureDetail(submissionId, { force: true });
  },
}));
