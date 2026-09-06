import { useCallback, useEffect } from "react";
import { useAppShellStore } from "@/stores/app-shell";

export interface UseWorkbenchFocusModeOptions {
  /** 路由/页面激活时自动进入禅模式，默认 true */
  autoEnter?: boolean;
  /** 离开时自动退出禅模式，默认 true */
  autoExit?: boolean;
}

/**
 * 工作台禅模式：隐藏 App Shell 侧栏/顶栏/标签栏，工作区全屏。
 * 标注、模板搭建等沉浸式工作台共用。
 */
export function useWorkbenchFocusMode(active: boolean, options?: UseWorkbenchFocusModeOptions) {
  const focusMode = useAppShellStore((state) => state.focusMode);
  const enterFocusMode = useAppShellStore((state) => state.enterFocusMode);
  const exitFocusMode = useAppShellStore((state) => state.exitFocusMode);

  const autoEnter = options?.autoEnter ?? true;
  const autoExit = options?.autoExit ?? true;

  useEffect(() => {
    if (!active || !autoEnter) {
      return;
    }
    enterFocusMode();
    return () => {
      if (autoExit) {
        exitFocusMode();
      }
    };
  }, [active, autoEnter, autoExit, enterFocusMode, exitFocusMode]);

  const toggleFocusMode = useCallback(() => {
    if (focusMode) {
      exitFocusMode();
    } else {
      enterFocusMode();
    }
  }, [focusMode, enterFocusMode, exitFocusMode]);

  return {
    focusMode,
    toggleFocusMode,
    enterFocusMode,
    exitFocusMode,
  };
}
