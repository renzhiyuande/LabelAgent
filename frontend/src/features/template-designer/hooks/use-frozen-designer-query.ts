import { useEffect, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useDesignerEditorStore } from "../stores/designer-editor-store";

export const DESIGNER_PATH = "/system/template-designer";

export function useFrozenDesignerQuery() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDesignerActive = location.pathname === DESIGNER_PATH;
  const urlTemplateId = searchParams.get("templateId");
  const urlVersionId = searchParams.get("versionId");

  const frozenRef = useRef({
    templateId: urlTemplateId,
    versionId: urlVersionId,
  });

  if (isDesignerActive) {
    if (urlTemplateId) {
      frozenRef.current = { templateId: urlTemplateId, versionId: urlVersionId };
    } else {
      const prev = frozenRef.current;
      const store = useDesignerEditorStore.getState();
      const resolvedTemplateId = prev.templateId ?? store.templateId ?? null;
      frozenRef.current = {
        templateId: resolvedTemplateId,
        versionId: prev.versionId ?? store.currentVersionId ?? null,
      };
    }
  }

  useEffect(() => {
    if (!isDesignerActive || urlTemplateId) {
      return;
    }
    const { templateId, versionId } = frozenRef.current;
    if (!templateId) {
      return;
    }
    const params = new URLSearchParams({ templateId });
    if (versionId) {
      params.set("versionId", versionId);
    }
    const returnTo = searchParams.get("returnTo");
    if (returnTo) {
      params.set("returnTo", returnTo);
    }
    navigate(`${DESIGNER_PATH}?${params.toString()}`, { replace: true });
  }, [isDesignerActive, navigate, searchParams, urlTemplateId]);

  return {
    templateId: frozenRef.current.templateId,
    versionId: frozenRef.current.versionId,
    isDesignerActive,
  };
}
