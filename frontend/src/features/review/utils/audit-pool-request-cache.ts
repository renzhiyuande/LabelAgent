type CacheEntry<T> = {
  value: T;
  storedAt: number;
};

const DEFAULT_TTL_MS = 60_000;
const MAX_ENTRIES = 48;

export class AuditPoolRequestCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly ttlMs = DEFAULT_TTL_MS,
    private readonly maxEntries = MAX_ENTRIES,
  ) {}

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }
    if (Date.now() - entry.storedAt > this.ttlMs) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T) {
    if (this.entries.size >= this.maxEntries) {
      const oldest = [...this.entries.entries()].sort((left, right) => left[1].storedAt - right[1].storedAt)[0]?.[0];
      if (oldest) {
        this.entries.delete(oldest);
      }
    }
    this.entries.set(key, { value, storedAt: Date.now() });
  }

  invalidate(predicate?: (key: string) => boolean) {
    if (!predicate) {
      this.entries.clear();
      return;
    }
    for (const key of [...this.entries.keys()]) {
      if (predicate(key)) {
        this.entries.delete(key);
      }
    }
  }
}

export function buildAuditPoolCacheKey(parts: Record<string, string | number | undefined | null>): string {
  return Object.entries(parts)
    .filter(([, value]) => value != null && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}
