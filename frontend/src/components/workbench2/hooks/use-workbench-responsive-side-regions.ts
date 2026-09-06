import { useCallback, useEffect, useRef } from "react";
import type { WorkbenchGlobalLayoutState } from "../types";

const COMPACT_MEDIA_QUERY = "(max-width: 1023px)";

export interface UseWorkbenchResponsiveSideRegionsOptions {
  editing?: boolean;
  regions: WorkbenchGlobalLayoutState["regions"];
  setRegionCollapsed: (regionId: "left" | "right", collapsed: boolean) => void;
}

/**
 * 窄屏自动折叠左右侧栏，宽屏恢复折叠前的展开状态。
 * 窄屏下用户手动展开后侧栏会保持展开（pinned），直到用户再次收起或窗口变宽。
 */
export function useWorkbenchResponsiveSideRegions({
  editing = false,
  regions,
  setRegionCollapsed,
}: UseWorkbenchResponsiveSideRegionsOptions) {
  const wasWideRef = useRef<boolean | null>(null);
  const rememberedExpandedRef = useRef({ left: true, right: true });
  const pinnedExpandedRef = useRef({ left: false, right: false });

  const applyCompactLayout = useCallback(() => {
    rememberedExpandedRef.current = {
      left: !regions.left.collapsed,
      right: !regions.right.collapsed,
    };
    if (!pinnedExpandedRef.current.left && !regions.left.collapsed) {
      setRegionCollapsed("left", true);
    }
    if (!pinnedExpandedRef.current.right && !regions.right.collapsed) {
      setRegionCollapsed("right", true);
    }
  }, [regions.left.collapsed, regions.right.collapsed, setRegionCollapsed]);

  const applyWideLayout = useCallback(() => {
    const remembered = rememberedExpandedRef.current;
    if ((remembered.left || pinnedExpandedRef.current.left) && regions.left.collapsed) {
      setRegionCollapsed("left", false);
    }
    if ((remembered.right || pinnedExpandedRef.current.right) && regions.right.collapsed) {
      setRegionCollapsed("right", false);
    }
  }, [regions.left.collapsed, regions.right.collapsed, setRegionCollapsed]);

  useEffect(() => {
    if (typeof window === "undefined" || editing) {
      return undefined;
    }

    const mediaQuery = window.matchMedia(COMPACT_MEDIA_QUERY);

    const syncForViewport = () => {
      const isWide = !mediaQuery.matches;

      if (wasWideRef.current === null) {
        wasWideRef.current = isWide;
        if (!isWide) {
          applyCompactLayout();
        }
        return;
      }

      if (wasWideRef.current === isWide) {
        return;
      }

      const wasWide = wasWideRef.current;
      wasWideRef.current = isWide;

      if (!isWide) {
        applyCompactLayout();
        return;
      }

      if (!wasWide) {
        applyWideLayout();
      }
    };

    syncForViewport();
    mediaQuery.addEventListener("change", syncForViewport);
    return () => mediaQuery.removeEventListener("change", syncForViewport);
  }, [applyCompactLayout, applyWideLayout, editing]);

  const toggleSideRegionCollapsed = useCallback(
    (regionId: "left" | "right") => {
      const isWide =
        typeof window !== "undefined" ? !window.matchMedia(COMPACT_MEDIA_QUERY).matches : true;
      const nextCollapsed = !regions[regionId].collapsed;

      if (!isWide) {
        pinnedExpandedRef.current[regionId] = !nextCollapsed;
      } else if (nextCollapsed) {
        pinnedExpandedRef.current[regionId] = false;
      }

      setRegionCollapsed(regionId, nextCollapsed);
    },
    [regions, setRegionCollapsed],
  );

  return { toggleSideRegionCollapsed };
}
