import { useEffect, useRef, useState } from "react";
import type { ResourceRecord } from "../types";

const TRANSITION_MS = 240;

type DisplayPhase = "idle" | "settling-empty" | "revealing";

export function useTableDisplayRecords<TRecord extends ResourceRecord>(
  records: TRecord[],
  isFetching: boolean,
  initialLoading: boolean,
) {
  const [displayRecords, setDisplayRecords] = useState(records);
  const [phase, setPhase] = useState<DisplayPhase>("idle");
  const lastNonEmptyRef = useRef<TRecord[]>(records.length > 0 ? records : []);
  const prevDisplayCountRef = useRef(records.length);
  const transitionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (transitionTimerRef.current != null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    if (records.length > 0) {
      const shouldReveal = prevDisplayCountRef.current === 0;
      lastNonEmptyRef.current = records;
      setDisplayRecords(records);
      prevDisplayCountRef.current = records.length;
      if (shouldReveal) {
        setPhase("revealing");
        transitionTimerRef.current = window.setTimeout(() => {
          setPhase("idle");
          transitionTimerRef.current = null;
        }, TRANSITION_MS);
      } else {
        setPhase("idle");
      }
      return;
    }

    if (isFetching && lastNonEmptyRef.current.length > 0) {
      setPhase("idle");
      setDisplayRecords(lastNonEmptyRef.current);
      return;
    }

    if (!isFetching && lastNonEmptyRef.current.length > 0) {
      setDisplayRecords(lastNonEmptyRef.current);
      setPhase("settling-empty");
      transitionTimerRef.current = window.setTimeout(() => {
        lastNonEmptyRef.current = [];
        setDisplayRecords([]);
        prevDisplayCountRef.current = 0;
        setPhase("idle");
        transitionTimerRef.current = null;
      }, TRANSITION_MS);
      return;
    }

    lastNonEmptyRef.current = [];
    setDisplayRecords([]);
    prevDisplayCountRef.current = 0;
    setPhase("idle");
  }, [isFetching, records]);

  useEffect(
    () => () => {
      if (transitionTimerRef.current != null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    },
    [],
  );

  const showSkeleton = displayRecords.length === 0 && phase === "idle" && initialLoading;

  return {
    displayRecords,
    phase,
    settlingEmpty: phase === "settling-empty",
    revealing: phase === "revealing",
    showSkeleton,
  };
}
