import { useCallback, useEffect, useRef, useState } from "react";

const MAX_HISTORY = 80;

export function usePromptEditorHistory(externalValue: string) {
  const [draft, setDraft] = useState(externalValue);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const pastRef = useRef<string[]>([]);
  const futureRef = useRef<string[]>([]);
  const skipExternalSyncRef = useRef(false);

  const refreshFlags = useCallback(() => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  useEffect(() => {
    if (skipExternalSyncRef.current) {
      skipExternalSyncRef.current = false;
      return;
    }
    setDraft(externalValue);
    pastRef.current = [];
    futureRef.current = [];
    refreshFlags();
  }, [externalValue, refreshFlags]);

  const commit = useCallback(
    (nextValue: string, options?: { recordHistory?: boolean }) => {
      const recordHistory = options?.recordHistory ?? true;
      skipExternalSyncRef.current = true;

      setDraft((current) => {
        if (recordHistory && current !== nextValue) {
          pastRef.current = [...pastRef.current, current].slice(-MAX_HISTORY);
          futureRef.current = [];
        }
        return nextValue;
      });
      refreshFlags();
      return nextValue;
    },
    [refreshFlags],
  );

  const undo = useCallback(() => {
    const past = pastRef.current;
    if (past.length === 0) {
      return null;
    }

    const previous = past[past.length - 1];
    pastRef.current = past.slice(0, -1);
    skipExternalSyncRef.current = true;

    setDraft((current) => {
      futureRef.current = [current, ...futureRef.current].slice(0, MAX_HISTORY);
      return previous;
    });
    refreshFlags();
    return previous;
  }, [refreshFlags]);

  const redo = useCallback(() => {
    const future = futureRef.current;
    if (future.length === 0) {
      return null;
    }

    const next = future[0];
    futureRef.current = future.slice(1);
    skipExternalSyncRef.current = true;

    setDraft((current) => {
      pastRef.current = [...pastRef.current, current].slice(-MAX_HISTORY);
      return next;
    });
    refreshFlags();
    return next;
  }, [refreshFlags]);

  return {
    draft,
    commit,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
