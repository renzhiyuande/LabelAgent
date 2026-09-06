import { fetchLabelerWork, type LabelerWorkDetailResponse } from "../../api/labeler-work-api";

const PREFETCH_CONCURRENCY = 5;

export async function prefetchWorksWithLimit(
  assignmentIds: string[],
  getCached: (id: string) => LabelerWorkDetailResponse | undefined,
  isInFlight: (id: string) => boolean,
  markInFlight: (id: string, flying: boolean) => void,
  onCached: (id: string, detail: LabelerWorkDetailResponse) => void,
): Promise<void> {
  const pending = assignmentIds.filter((id) => !getCached(id) && !isInFlight(id));
  if (pending.length === 0) {
    return;
  }

  let index = 0;

  async function worker() {
    while (index < pending.length) {
      const current = pending[index];
      index += 1;
      markInFlight(current, true);
      try {
        const detail = await fetchLabelerWork(current);
        onCached(current, detail);
      } catch {
        // 预取失败静默忽略，切题时会再次请求
      } finally {
        markInFlight(current, false);
      }
    }
  }

  const workers = Array.from({ length: Math.min(PREFETCH_CONCURRENCY, pending.length) }, () => worker());
  await Promise.all(workers);
}
