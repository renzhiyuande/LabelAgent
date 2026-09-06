export function readHiddenWidgetIds(storageKey: string, isValidId: (id: string) => boolean): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as string[];
    return parsed.filter((id) => isValidId(id));
  } catch {
    return [];
  }
}

export function writeHiddenWidgetIds(storageKey: string, ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(storageKey, JSON.stringify(ids));
}

export function clearHiddenWidgetStorage(storageKey: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(storageKey);
}
