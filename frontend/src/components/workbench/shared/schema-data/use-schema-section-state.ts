import { useCallback, useEffect, useState } from "react";
import { normalizeSchemaDataViewMode, type SchemaDataViewMode } from "./SchemaDataView";

function readJsonStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key: string, value: unknown): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(key, JSON.stringify(value));
}

export type SchemaSectionsLayout = "stack" | "row" | "tabs";

export function useSchemaSectionOrder(storageKey: string, defaultOrder: string[]) {
  const [order, setOrder] = useState<string[]>(() => readJsonStorage(storageKey, defaultOrder));

  useEffect(() => {
    writeJsonStorage(storageKey, order);
  }, [order, storageKey]);

  const resetOrder = useCallback((nextDefault: string[]) => {
    setOrder((current) => {
      const merged = [
        ...current.filter((id) => nextDefault.includes(id)),
        ...nextDefault.filter((id) => !current.includes(id)),
      ];
      return merged.length > 0 ? merged : nextDefault;
    });
  }, []);

  return { order, setOrder, resetOrder };
}

export function useSchemaSectionViewModes(storageKey: string, sectionIds: string[]) {
  const [viewModes, setViewModes] = useState<Record<string, SchemaDataViewMode>>(() => {
    const stored = readJsonStorage<Record<string, string>>(storageKey, {});
    return Object.fromEntries(
      sectionIds.map((id) => [id, normalizeSchemaDataViewMode(stored[id])]),
    ) as Record<string, SchemaDataViewMode>;
  });

  useEffect(() => {
    writeJsonStorage(storageKey, viewModes);
  }, [storageKey, viewModes]);

  const setViewMode = useCallback((sectionId: string, mode: SchemaDataViewMode) => {
    setViewModes((current) => ({ ...current, [sectionId]: mode }));
  }, []);

  const getViewMode = useCallback(
    (sectionId: string): SchemaDataViewMode => normalizeSchemaDataViewMode(viewModes[sectionId]),
    [viewModes],
  );

  return { getViewMode, setViewMode };
}

export function useSchemaSectionsLayout(storageKey: string, defaultLayout: SchemaSectionsLayout = "stack") {
  const [layout, setLayoutState] = useState<SchemaSectionsLayout>(() =>
    readJsonStorage(storageKey, defaultLayout),
  );

  useEffect(() => {
    writeJsonStorage(storageKey, layout);
  }, [layout, storageKey]);

  const setLayout = useCallback((next: SchemaSectionsLayout) => {
    setLayoutState(next);
  }, []);

  return { layout, setLayout };
}

export function useSchemaSectionsActiveTab(storageKey: string, sectionIds: string[]) {
  const [activeTab, setActiveTabState] = useState<string>(() => {
    const stored = readJsonStorage<string | null>(storageKey, null);
    if (stored && sectionIds.includes(stored)) {
      return stored;
    }
    return sectionIds[0] ?? "";
  });

  useEffect(() => {
    if (activeTab && sectionIds.includes(activeTab)) {
      writeJsonStorage(storageKey, activeTab);
    }
  }, [activeTab, storageKey, sectionIds]);

  useEffect(() => {
    if (!sectionIds.includes(activeTab)) {
      setActiveTabState(sectionIds[0] ?? "");
    }
  }, [activeTab, sectionIds]);

  const setActiveTab = useCallback((tabId: string) => {
    setActiveTabState(tabId);
  }, []);

  return { activeTab, setActiveTab };
}
