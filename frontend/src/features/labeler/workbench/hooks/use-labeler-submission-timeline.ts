import { useEffect, useMemo, useState } from "react";
import type { AuditTimelineEntry } from "@/components/workbench/shared/AuditTimeline";
import { toTimelineEntries } from "@/low-code/components/drawers/LHDetailTimeline";
import { fetchLabelerSubmissionHistory } from "../../api/labeler-work-api";
import { resolveLabelerReviewComment } from "../utils/extract-review-comment";

export function useLabelerSubmissionTimeline(
  submissionId: number | null | undefined,
  enabled: boolean,
  lastReviewComment?: string | null,
) {
  const [entries, setEntries] = useState<AuditTimelineEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !submissionId) {
      setEntries([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchLabelerSubmissionHistory(submissionId)
      .then((detail) => {
        if (cancelled) {
          return;
        }
        const timeline = detail.lifecycleTimeline?.length
          ? detail.lifecycleTimeline
          : detail.submitHistory ?? [];
        setEntries(toTimelineEntries(timeline));
      })
      .catch(() => {
        if (!cancelled) {
          setEntries([]);
          setError("审计日志加载失败");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, submissionId]);

  const reviewComment = useMemo(
    () => resolveLabelerReviewComment(lastReviewComment, entries),
    [entries, lastReviewComment],
  );

  return { entries, reviewComment, loading, error };
}
