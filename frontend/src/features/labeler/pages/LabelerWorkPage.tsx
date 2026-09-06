import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { matchPath, useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { appMessage } from "@/lib/message";
import {
  buildResourceMeta,
  parseFormSchemaJson,
} from "@/low-code/utils/form-schema";
import { setValueAtPath } from "@/low-code/utils/object-path";
import { useAppShellStore } from "@/stores/app-shell";
import { useAuthStore } from "@/stores/auth";
import {
  saveLabelerDraft,
  submitLabelerSubmission,
  withdrawLabelerSubmission,
  type LabelerWorkDetailResponse,
} from "../api/labeler-work-api";
import { LabelerTaskCompletePage } from "../work/components/LabelerTaskCompletePage";
import { LabelerWorkSkeleton } from "../work/components/LabelerWorkSkeleton";
import { useLabelerWorkHotkeys } from "../work/hooks/use-labeler-work-hotkeys";
import { useLabelerWorkSessionStore } from "../work/stores/labeler-work-session";
import { useLabelerRenderPrefs } from "../workbench/labeler-render-prefs";
import { countSchemaFields } from "../work/utils/split-labeler-schema";
import { resolveLabelerSplitSchemas } from "../work/utils/resolve-labeler-split-schemas";
import type { LabelerQueueScopeItem } from "../work/types/labeler-queue-scope";
import { resolveQueueNeighbors } from "../work/utils/work-queue-navigation";
import {
  canSaveDraft,
  canSubmitWork,
  findNextOpenAssignment,
  hasOpenAssignments,
  isTaskQueueComplete,
} from "../work/utils/work-queue-status";
import {
  isRuntimeFormPath,
  resolveWorkValuesForAssignment,
} from "../work/utils/work-values";
import {
  collectResourceFormValidationErrors,
  firstResourceFormValidationError,
} from "@/low-code/components/forms/use-resource-form-engine";
import { LabelerWorkbenchV2 } from "../workbench";

const AUTOSAVE_MS = 2000;
const LOCAL_STASH_MS = 500;
const LABELER_WORK_ROUTE = "/labeler/work/:assignmentId";

type ApplyWorkDetailOptions = {
  preferLocalDraft?: boolean;
  notifyRecovery?: boolean;
  syncPendingLocal?: boolean;
};

function normalizeApplyWorkDetailOptions(
  options?: boolean | ApplyWorkDetailOptions,
): ApplyWorkDetailOptions {
  if (typeof options === "boolean") {
    return { preferLocalDraft: options };
  }
  return { preferLocalDraft: true, ...options };
}

function isLabelerWorkPath(pathname: string): boolean {
  return Boolean(matchPath({ path: LABELER_WORK_ROUTE, end: true }, pathname));
}

export function LabelerWorkPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const isWorkRouteVisible = isLabelerWorkPath(location.pathname);

  const currentUser = useAuthStore((state) => state.currentUser);
  const focusMode = useAppShellStore((state) => state.focusMode);
  const enterFocusMode = useAppShellStore((state) => state.enterFocusMode);
  const exitFocusMode = useAppShellStore((state) => state.exitFocusMode);

  const queueRows = useLabelerWorkSessionStore((state) => state.queueRows);
  const queueLoading = useLabelerWorkSessionStore((state) => state.queueLoading);
  const queueLoadingMore = useLabelerWorkSessionStore((state) => state.queueLoadingMore);
  const queueTotal = useLabelerWorkSessionStore((state) => state.queueTotal);
  const loadQueueNextPage = useLabelerWorkSessionStore((state) => state.loadQueueNextPage);
  const applyQueueScope = useLabelerWorkSessionStore((state) => state.applyQueueScope);
  const refreshTaskQueue = useLabelerWorkSessionStore((state) => state.refreshTaskQueue);
  const stashDraft = useLabelerWorkSessionStore((state) => state.stashDraft);
  const clearDraft = useLabelerWorkSessionStore((state) => state.clearDraft);
  const getCachedWork = useLabelerWorkSessionStore((state) => state.getCachedWork);
  const ensureWork = useLabelerWorkSessionStore((state) => state.ensureWork);
  const bootstrapWorkSession = useLabelerWorkSessionStore((state) => state.bootstrapWorkSession);
  const patchCachedSubmissionDraft = useLabelerWorkSessionStore((state) => state.patchCachedSubmissionDraft);
  const cacheWork = useLabelerWorkSessionStore((state) => state.cacheWork);
  const setActiveAssignmentId = useLabelerWorkSessionStore((state) => state.setActiveAssignmentId);
  const resetSession = useLabelerWorkSessionStore((state) => state.reset);

  const bootstrappedRef = useRef(false);
  const workRouteVisibleRef = useRef(false);
  const visitGenerationRef = useRef(0);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [contentPending, setContentPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "pending" | "saved" | "error">("idle");
  const [work, setWork] = useState<LabelerWorkDetailResponse | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [annotateFieldErrors, setAnnotateFieldErrors] = useState<Record<string, string>>({});
  const [taskCompleteDismissed, setTaskCompleteDismissed] = useState(false);

  const valuesRef = useRef(values);
  const workRef = useRef(work);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localStashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const submissionIdRef = useRef<number | null>(null);
  const assignmentIdRef = useRef(assignmentId);

  useEffect(() => {
    assignmentIdRef.current = assignmentId;
  }, [assignmentId]);

  useEffect(() => {
    workRef.current = work;
  }, [work]);

  const parsedSchema = useMemo(() => {
    if (!work?.templateVersion.schemaJson) {
      return null;
    }
    return parseFormSchemaJson(work.templateVersion.schemaJson);
  }, [work]);

  const { prefs: renderPrefs, setPrefs: setRenderPrefs, resetRenderPrefs } = useLabelerRenderPrefs(
    work?.templateVersion.templateVersionId,
  );

  const splitSchemas = useMemo(() => {
    if (!parsedSchema) {
      return null;
    }
    return resolveLabelerSplitSchemas(parsedSchema, renderPrefs);
  }, [parsedSchema, renderPrefs]);

  const annotateResource = useMemo(() => {
    if (!splitSchemas || !work) {
      return null;
    }
    return buildResourceMeta(
      splitSchemas.annotateSchema,
      work.task.taskName ?? "标注作答",
      "labeler_work_annotate",
    );
  }, [splitSchemas, work]);

  const annotateFieldCount = useMemo(
    () => (splitSchemas ? countSchemaFields(splitSchemas.annotateSchema) : 0),
    [splitSchemas],
  );

  const queueHasMore = queueRows.length < queueTotal;

  const queueNav = useMemo(() => {
    const neighbors = resolveQueueNeighbors(queueRows, assignmentId ?? "");
    return {
      ...neighbors,
      total: queueTotal > 0 ? queueTotal : neighbors.total,
    };
  }, [assignmentId, queueRows, queueTotal]);

  const canGoNextInQueue = useMemo(() => {
    if (queueNav.nextId) {
      return true;
    }
    return queueHasMore && queueNav.index >= 0 && queueNav.index === queueRows.length - 1;
  }, [queueHasMore, queueNav.index, queueNav.nextId, queueRows.length]);

  const taskComplete = useMemo(
    () => isTaskQueueComplete(queueRows, queueTotal) && !queueLoading && !bootstrapping,
    [bootstrapping, queueLoading, queueRows, queueTotal],
  );

  useEffect(() => {
    if (!taskComplete) {
      setTaskCompleteDismissed(false);
    }
  }, [taskComplete]);

  const canSubmit = canSubmitWork(work) && !taskComplete;

  const flushDraft = useCallback(
    async (
      autoSave: boolean,
      snapshot?: {
        assignmentId: string;
        submissionId: number;
        work: LabelerWorkDetailResponse;
        values?: Record<string, unknown>;
      },
    ) => {
      const workSnapshot = snapshot?.work ?? workRef.current;
      const submissionId = snapshot?.submissionId ?? submissionIdRef.current;
      const targetAssignmentId = snapshot?.assignmentId ?? assignmentIdRef.current;
      if (!canSaveDraft(workSnapshot) || !submissionId || !targetAssignmentId) {
        return;
      }
      setSaving(true);
      setSaveState("pending");
      const draftData = snapshot?.values ?? valuesRef.current;
      try {
        await saveLabelerDraft(submissionId, draftData, autoSave);
        patchCachedSubmissionDraft(targetAssignmentId, draftData);
        clearDraft(targetAssignmentId);
        setSaveState("saved");
      } catch (error) {
        stashDraft(targetAssignmentId, draftData);
        setSaveState("error");
        if (!autoSave) {
          appMessage.errorFrom(error, "保存草稿失败，内容已保存到本地");
        }
      } finally {
        setSaving(false);
      }
    },
    [clearDraft, patchCachedSubmissionDraft, stashDraft],
  );

  const flushDraftRef = useRef(flushDraft);
  flushDraftRef.current = flushDraft;

  const applyWorkDetail = useCallback(
    (
      detail: LabelerWorkDetailResponse,
      targetAssignmentId: string,
      options?: boolean | ApplyWorkDetailOptions,
    ) => {
      const { preferLocalDraft, notifyRecovery, syncPendingLocal } =
        normalizeApplyWorkDetailOptions(options);
      const localDraft = preferLocalDraft
        ? useLabelerWorkSessionStore.getState().draftValues[targetAssignmentId]
        : undefined;
      const resolved = resolveWorkValuesForAssignment(detail, localDraft);

      setWork(detail);
      submissionIdRef.current = detail.submission.id;
      setValues(resolved.values);
      setAnnotateFieldErrors({});
      dirtyRef.current = false;

      if (resolved.needsSync && canSaveDraft(detail)) {
        setSaveState("error");
        if (syncPendingLocal !== false) {
          queueMicrotask(() => void flushDraftRef.current(true));
        }
        if (notifyRecovery && resolved.recoveredFromLocal) {
          appMessage.info("已恢复未同步的本地草稿，联网后将自动同步");
        }
        return;
      }

      setSaveState("saved");
    },
    [],
  );

  // keepAlive 下组件不卸载：按路由可见性管理禅模式与 Session
  useEffect(() => {
    if (isWorkRouteVisible && assignmentId) {
      enterFocusMode();
      const reEntered = !workRouteVisibleRef.current;
      workRouteVisibleRef.current = true;
      if (reEntered) {
        visitGenerationRef.current += 1;
        resetSession();
        bootstrappedRef.current = false;
        setWork(null);
        setBootstrapping(true);
        setContentPending(false);
      }
      return;
    }

    if (workRouteVisibleRef.current) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      const leavingAssignmentId = assignmentIdRef.current;
      if (leavingAssignmentId && canSaveDraft(workRef.current)) {
        stashDraft(leavingAssignmentId, valuesRef.current);
      }
      void flushDraftRef.current(true);
      exitFocusMode();
      resetSession();
      bootstrappedRef.current = false;
      workRouteVisibleRef.current = false;
    }
  }, [assignmentId, enterFocusMode, exitFocusMode, isWorkRouteVisible, resetSession, stashDraft]);

  useEffect(() => {
    let cancelled = false;
    const loadGeneration = visitGenerationRef.current;

    async function load() {
      if (!assignmentId || !isWorkRouteVisible) {
        return;
      }

      const isSwitch = bootstrappedRef.current;
      const preferCache = isSwitch;

      setActiveAssignmentId(assignmentId);

      const cached = preferCache ? getCachedWork(assignmentId) : undefined;

      if (cached) {
        applyWorkDetail(cached, assignmentId, true);
        setBootstrapping(false);
        setContentPending(false);
        bootstrappedRef.current = true;
        return;
      }

      if (isSwitch) {
        setContentPending(true);
      } else {
        setBootstrapping(true);
      }

      try {
        const session = useLabelerWorkSessionStore.getState();
        const needsSession = session.queueRows.length === 0 || session.taskId === null;

        const detail = needsSession
          ? await bootstrapWorkSession(assignmentId)
          : await ensureWork(assignmentId, { force: !preferCache });

        if (cancelled || loadGeneration !== visitGenerationRef.current) {
          return;
        }

        applyWorkDetail(detail, assignmentId, {
          preferLocalDraft: true,
          notifyRecovery: !isSwitch,
        });

        if (!hasOpenAssignments(useLabelerWorkSessionStore.getState().queueRows)) {
          await refreshTaskQueue(assignmentId);
        }
      } catch (error) {
        if (!cancelled && loadGeneration === visitGenerationRef.current) {
          appMessage.errorFrom(error, "加载作答页失败");
          if (!isSwitch) {
            setWork(null);
          }
        }
      } finally {
        if (!cancelled && loadGeneration === visitGenerationRef.current) {
          setBootstrapping(false);
          setContentPending(false);
          bootstrappedRef.current = true;
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [
    applyWorkDetail,
    assignmentId,
    bootstrapWorkSession,
    ensureWork,
    getCachedWork,
    isWorkRouteVisible,
    refreshTaskQueue,
    setActiveAssignmentId,
  ]);

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  useEffect(() => {
    if (!dirtyRef.current || !assignmentId || !canSaveDraft(work)) {
      return;
    }
    if (localStashTimerRef.current) {
      clearTimeout(localStashTimerRef.current);
    }
    localStashTimerRef.current = setTimeout(() => {
      stashDraft(assignmentId, valuesRef.current);
    }, LOCAL_STASH_MS);
    return () => {
      if (localStashTimerRef.current) {
        clearTimeout(localStashTimerRef.current);
      }
    };
  }, [assignmentId, stashDraft, values, work]);

  useEffect(() => {
    const persistDraftOnPageHide = () => {
      const targetAssignmentId = assignmentIdRef.current;
      if (!targetAssignmentId || !canSaveDraft(workRef.current)) {
        return;
      }
      stashDraft(targetAssignmentId, valuesRef.current);
    };
    window.addEventListener("pagehide", persistDraftOnPageHide);
    return () => window.removeEventListener("pagehide", persistDraftOnPageHide);
  }, [stashDraft]);

  useEffect(() => {
    const retryDraftSyncOnOnline = () => {
      if (!assignmentIdRef.current || !canSaveDraft(workRef.current)) {
        return;
      }
      const hasPendingLocalDraft = Boolean(
        useLabelerWorkSessionStore.getState().draftValues[assignmentIdRef.current ?? ""],
      );
      if (saveState === "error" || hasPendingLocalDraft) {
        void flushDraftRef.current(true);
      }
    };
    window.addEventListener("online", retryDraftSyncOnOnline);
    return () => window.removeEventListener("online", retryDraftSyncOnOnline);
  }, [saveState]);

  const scheduleAutosave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    setSaveState("pending");
    saveTimerRef.current = setTimeout(() => {
      if (!canSaveDraft(workRef.current)) {
        return;
      }
      void flushDraft(true);
    }, AUTOSAVE_MS);
  }, [flushDraft]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const ensureAnnotateValid = useCallback((): boolean => {
    if (!annotateResource || annotateFieldCount === 0) {
      return true;
    }
    const errors = collectResourceFormValidationErrors(
      annotateResource,
      valuesRef.current,
      {},
      currentUser,
      "assignment",
    );
    setAnnotateFieldErrors(errors);
    const first = firstResourceFormValidationError(errors);
    if (first) {
      const errorCount = Object.keys(errors).length;
      appMessage.info(errorCount > 1 ? `${first}（共 ${errorCount} 处需修正）` : first);
      return false;
    }
    setAnnotateFieldErrors({});
    return true;
  }, [annotateFieldCount, annotateResource, currentUser]);

  function handleFieldChange(key: string, value: unknown) {
    if (!canSaveDraft(work) && !isRuntimeFormPath(key)) {
      return;
    }
    dirtyRef.current = true;
    setValues((current) => setValueAtPath(current, key, value));
    setAnnotateFieldErrors((current) => {
      if (!(key in current)) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
    scheduleAutosave();
  }

  const handleSelectAssignment = useCallback(
    async (nextAssignmentId: string, options?: { skipLeavingDraft?: boolean }) => {
      if (!assignmentId || nextAssignmentId === assignmentId || contentPending) {
        return;
      }
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      const leavingAssignmentId = assignmentId;
      const leavingWork = workRef.current;
      const leavingSubmissionId = submissionIdRef.current;
      const leavingValues = valuesRef.current;

      stashDraft(leavingAssignmentId, leavingValues);

      setContentPending(true);
      try {
        if (
          !options?.skipLeavingDraft &&
          leavingWork &&
          leavingSubmissionId &&
          canSaveDraft(leavingWork)
        ) {
          await flushDraft(true, {
            assignmentId: leavingAssignmentId,
            submissionId: leavingSubmissionId,
            work: leavingWork,
            values: leavingValues,
          });
        }
        const cached = getCachedWork(nextAssignmentId);
        if (cached) {
          applyWorkDetail(cached, nextAssignmentId, true);
          setActiveAssignmentId(nextAssignmentId);
          navigate(`/labeler/work/${nextAssignmentId}`, { replace: true, preventScrollReset: true });
          setContentPending(false);
          return;
        }
        navigate(`/labeler/work/${nextAssignmentId}`, { replace: true, preventScrollReset: true });
      } catch {
        setContentPending(false);
      }
    },
    [
      applyWorkDetail,
      assignmentId,
      contentPending,
      flushDraft,
      getCachedWork,
      navigate,
      setActiveAssignmentId,
      stashDraft,
    ],
  );

  const handleSaveDraft = useCallback(() => {
    if (!canSaveDraft(work)) {
      appMessage.info("当前题目已提交或不可编辑，无法保存草稿");
      return;
    }
    if (!ensureAnnotateValid()) {
      return;
    }
    void flushDraft(false);
  }, [ensureAnnotateValid, flushDraft, work]);

  const handleSubmit = useCallback(async () => {
    if (!submissionIdRef.current || !assignmentId || !canSubmitWork(work)) {
      return;
    }
    if (!ensureAnnotateValid()) {
      return;
    }
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    setSubmitting(true);
    try {
      const submittingAssignmentId = assignmentId;
      const submittingSubmissionId = submissionIdRef.current;
      const submittingWork = workRef.current;
      const submittingValues = valuesRef.current;
      if (
        submittingWork &&
        submittingSubmissionId &&
        canSaveDraft(submittingWork)
      ) {
        await flushDraft(false, {
          assignmentId: submittingAssignmentId,
          submissionId: submittingSubmissionId,
          work: submittingWork,
          values: submittingValues,
        });
      }
      await submitLabelerSubmission(submittingSubmissionId, submittingValues);
      if (submittingWork) {
        const submittedWork: LabelerWorkDetailResponse = {
          ...submittingWork,
          submission: {
            ...submittingWork.submission,
            currentStatus: "SUBMITTED",
          },
        };
        setWork(submittedWork);
        workRef.current = submittedWork;
        cacheWork(submittingAssignmentId, submittedWork);
        clearDraft(submittingAssignmentId);
      }
      await useLabelerWorkSessionStore.getState().refreshTaskQueue(assignmentId);

      const session = useLabelerWorkSessionStore.getState();
      const rows = session.queueRows;
      const queueTotalAfter = session.queueTotal;

      if (isTaskQueueComplete(rows, queueTotalAfter)) {
        appMessage.success("提交成功，本题包已全部完成");
        return;
      }

      appMessage.success("提交成功");

      const nextOpen = findNextOpenAssignment(rows);
      if (nextOpen && String(nextOpen.assignmentId) !== assignmentId) {
        await handleSelectAssignment(String(nextOpen.assignmentId), { skipLeavingDraft: true });
        return;
      }

      const detail = await session.refreshWork(assignmentId);
      applyWorkDetail(detail, assignmentId, false);
    } catch (error) {
      appMessage.errorFrom(error, "提交失败，已保留当前填写内容");
    } finally {
      setSubmitting(false);
    }
  }, [applyWorkDetail, assignmentId, ensureAnnotateValid, flushDraft, handleSelectAssignment, work]);

  const handleWithdraw = useCallback(async () => {
    if (!submissionIdRef.current || !assignmentId) {
      return;
    }
    setSubmitting(true);
    try {
      await withdrawLabelerSubmission(submissionIdRef.current);
      appMessage.success("已撤回提交，可重新作答");
      // Refresh work detail to reflect withdrawn state
      const session = useLabelerWorkSessionStore.getState();
      const detail = await session.refreshWork(assignmentId);
      applyWorkDetail(detail, assignmentId, false);
      await useLabelerWorkSessionStore.getState().refreshTaskQueue(assignmentId);
    } catch (error) {
      appMessage.errorFrom(error, "撤回失败");
    } finally {
      setSubmitting(false);
    }
  }, [applyWorkDetail, assignmentId]);

  const goPrevAssignment = useCallback(() => {
    if (queueNav.prevId) {
      void handleSelectAssignment(queueNav.prevId);
    }
  }, [handleSelectAssignment, queueNav.prevId]);

  const handleApplyQueueScope = useCallback(
    async (items: LabelerQueueScopeItem[]) => {
      const nextAssignmentId = await applyQueueScope(items);
      if (nextAssignmentId && nextAssignmentId !== assignmentId) {
        await handleSelectAssignment(nextAssignmentId, { skipLeavingDraft: true });
      }
    },
    [applyQueueScope, assignmentId, handleSelectAssignment],
  );

  const goNextAssignment = useCallback(async () => {
    if (queueNav.nextId) {
      void handleSelectAssignment(queueNav.nextId);
      return;
    }
    if (!canGoNextInQueue || queueLoadingMore) {
      return;
    }
    await loadQueueNextPage();
    const nextRows = useLabelerWorkSessionStore.getState().queueRows;
    const nextId = resolveQueueNeighbors(nextRows, assignmentId ?? "").nextId;
    if (nextId) {
      void handleSelectAssignment(nextId);
    }
  }, [
    assignmentId,
    canGoNextInQueue,
    handleSelectAssignment,
    loadQueueNextPage,
    queueLoadingMore,
    queueNav.nextId,
  ]);

  useLabelerWorkHotkeys({
    enabled: isWorkRouteVisible && !contentPending && !bootstrapping && !taskComplete,
    canPrev: Boolean(queueNav.prevId),
    canNext: canGoNextInQueue && !queueLoadingMore,
    canSubmit,
    onPrev: goPrevAssignment,
    onNext: () => void goNextAssignment(),
    onSaveDraft: handleSaveDraft,
    onSubmit: () => void handleSubmit(),
  });

  const saveHint =
    saveState === "pending" || saving
      ? "保存中…"
      : saveState === "saved"
        ? "草稿已保存"
        : saveState === "error"
          ? "已保存到本地，联网后自动同步"
          : "";

  function handleToggleFocusMode() {
    if (focusMode) {
      exitFocusMode();
    } else {
      enterFocusMode();
    }
  }

  if (!isWorkRouteVisible) {
    return null;
  }

  if (bootstrapping && !work) {
    return <LabelerWorkSkeleton />;
  }

  if (taskComplete && !taskCompleteDismissed) {
    return (
      <LabelerTaskCompletePage
        taskName={work?.task.taskName ?? queueRows[0]?.taskName}
        completedCount={queueTotal || queueRows.length}
        onBack={() => navigate("/labeler/my-tasks")}
        onStay={() => setTaskCompleteDismissed(true)}
      />
    );
  }

  if (!work || !splitSchemas || !annotateResource || !assignmentId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-background">
        <p className="text-sm text-muted-foreground">无法加载作答上下文</p>
        <Button variant="outline" onClick={() => navigate("/labeler/my-tasks")}>
          返回我的任务
        </Button>
      </div>
    );
  }

  return (
    <div className="lh-labeler-workbench-enter flex h-full min-h-0 flex-col">
    <LabelerWorkbenchV2
      work={work}
      assignmentId={assignmentId}
      formSchema={parsedSchema}
      renderPrefs={renderPrefs}
      setRenderPrefs={setRenderPrefs}
      resetRenderPrefs={resetRenderPrefs}
      displaySchema={splitSchemas.displaySchema}
      annotateResource={annotateResource}
      annotateFieldCount={annotateFieldCount}
      values={values}
      queueRows={queueRows}
      queueLoading={queueLoading}
      queueHasMore={queueHasMore}
      queueLoadingMore={queueLoadingMore}
      onLoadMoreQueue={() => void loadQueueNextPage()}
      onApplyQueueScope={handleApplyQueueScope}
      contentPending={contentPending}
      bootstrapping={bootstrapping}
      currentUser={currentUser}
      saveHint={saveHint}
      saving={saving}
      submitting={submitting}
      focusMode={focusMode}
      onToggleFocusMode={handleToggleFocusMode}
      onSelectAssignment={(id) => void handleSelectAssignment(id)}
      onPrevAssignment={goPrevAssignment}
      onNextAssignment={() => void goNextAssignment()}
      queueNav={queueNav}
      canGoNextInQueue={canGoNextInQueue && !queueLoadingMore}
      onFieldChange={handleFieldChange}
      annotateFieldErrors={annotateFieldErrors}
      onAnnotateFieldErrorsChange={setAnnotateFieldErrors}
      onSaveDraft={handleSaveDraft}
      onSubmit={handleSubmit}
      onWithdraw={handleWithdraw}
      canSubmit={canSubmit}
    />
    </div>
  );
}
