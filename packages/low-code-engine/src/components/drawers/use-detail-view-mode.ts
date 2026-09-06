import { useCallback, useEffect, useState } from "react";
import { readStoredDetailViewMode, writeStoredDetailViewMode, type LHDetailViewMode } from "./LHDetailViewToggle";

export function useDetailViewMode(open: boolean) {
  const [viewMode, setViewMode] = useState<LHDetailViewMode>(() => readStoredDetailViewMode());

  useEffect(() => {
    if (open) {
      setViewMode(readStoredDetailViewMode());
    }
  }, [open]);

  const changeViewMode = useCallback((mode: LHDetailViewMode) => {
    setViewMode(mode);
    writeStoredDetailViewMode(mode);
  }, []);

  return { viewMode, changeViewMode };
}
