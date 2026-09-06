"use client";

import { useEffect, useRef } from "react";
import { matchPath, useLocation } from "react-router-dom";
import { useWorkbenchFocusMode } from "@/components/workbench";
import { appMessage } from "@/lib/message";
import { createEmptyFormSchema } from "@/low-code/utils/form-schema";
import { DesignerWorkSkeleton } from "./components/DesignerWorkSkeleton";
import { DesignerZenWorkbench } from "./components/DesignerZenWorkbench";
import { DESIGNER_PATH, useFrozenDesignerQuery } from "./hooks/use-frozen-designer-query";
import { useDesignerEditorStore } from "./stores/designer-editor-store";
import { useDesignerSessionStore } from "./stores/designer-session-store";

function isDesignerPath(pathname: string): boolean {
  return Boolean(matchPath({ path: DESIGNER_PATH, end: true }, pathname));
}

/**
 * 模板搭建页：编排路由可见性、禅模式与会话引导，UI 委托 DesignerZenWorkbench。
 * 结构对齐 LabelerWorkPage → LabelerZenWorkbench。
 */
export function TemplateDesignerPage() {
  const location = useLocation();
  const isDesignerActive = isDesignerPath(location.pathname);
  const { templateId, versionId } = useFrozenDesignerQuery();
  const { focusMode, toggleFocusMode } = useWorkbenchFocusMode(isDesignerActive);

  const sessionReady = useDesignerSessionStore((state) => state.sessionReady);
  const sessionLoading = useDesignerSessionStore((state) => state.sessionLoading);
  const sessionError = useDesignerSessionStore((state) => state.sessionError);
  const bootstrapSession = useDesignerSessionStore((state) => state.bootstrapSession);
  const resetSession = useDesignerSessionStore((state) => state.reset);

  const routeVisibleRef = useRef(false);
  const visitGenerationRef = useRef(0);
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (!isDesignerActive) {
      if (routeVisibleRef.current) {
        resetSession();
        routeVisibleRef.current = false;
        bootstrappedRef.current = false;
      }
      return;
    }

    const reEntered = !routeVisibleRef.current;
    routeVisibleRef.current = true;
    if (reEntered) {
      visitGenerationRef.current += 1;
      bootstrappedRef.current = false;
    }
  }, [isDesignerActive, resetSession]);

  useEffect(() => {
    if (!isDesignerActive) {
      return;
    }

    const generation = visitGenerationRef.current;

    async function load() {
      if (!templateId) {
        const editor = useDesignerEditorStore.getState();
        if (!editor.templateId) {
          editor.resetEditor();
          editor.loadFormSchema(createEmptyFormSchema());
          useDesignerSessionStore.setState({ sessionReady: true, sessionLoading: false });
        }
        bootstrappedRef.current = true;
        return;
      }

      await bootstrapSession({ templateId, versionId, silent: bootstrappedRef.current });
      if (generation === visitGenerationRef.current) {
        bootstrappedRef.current = true;
      }
    }

    void load();
  }, [bootstrapSession, isDesignerActive, templateId, versionId]);

  useEffect(() => {
    if (sessionError && isDesignerActive) {
      appMessage.errorFrom(sessionError, "加载模板会话失败");
    }
  }, [isDesignerActive, sessionError]);

  if (!isDesignerActive) {
    return null;
  }

  const isIntegrated = Boolean(templateId);
  const showWorkbench = !isIntegrated || sessionReady;

  if (!showWorkbench) {
    return <DesignerWorkSkeleton />;
  }

  return (
    <DesignerZenWorkbench
      sessionLoading={sessionLoading}
      focusMode={focusMode}
      onToggleFocusMode={toggleFocusMode}
    />
  );
}
