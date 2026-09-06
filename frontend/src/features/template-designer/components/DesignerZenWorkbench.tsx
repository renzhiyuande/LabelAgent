"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StandardWorkbenchPage } from "@/components/workbench";
import { countFormFields } from "@/low-code/utils/form-schema";
import { designerLayoutSchema } from "../constants/designer-layout-schema";
import { useDesignerHotkeys } from "../hooks/use-designer-hotkeys";
import { useDesignerEditorStore } from "../stores/designer-editor-store";
import { useDesignerSessionStore } from "../stores/designer-session-store";
import { useDesignerWorkbenchLayout } from "../workbench/use-designer-workbench-layout";
import { DesignerDndProvider } from "./DesignerDndProvider";
import { DesignerWorkbenchHeader } from "./DesignerWorkbenchHeader";
import { ReviewConfigDrawer } from "./ReviewConfigDrawer";
import { SIDE_SLIDE_CLOSE_MS } from "./SideSlidePanel";
import { VersionHistoryDrawer } from "./VersionHistoryDrawer";
import { DesignerPreviewSampleDrawer } from "./DesignerPreviewSampleDrawer";
import { DesignerCanvasPanel } from "./panels/DesignerCanvasPanel";
import { DesignerMaterialPanel } from "./panels/DesignerMaterialPanel";
import { DesignerPropertyPanel } from "./panels/DesignerPropertyPanel";

const LOADING_MESSAGE = "正在加载草稿…";

export interface DesignerZenWorkbenchProps {
  sessionLoading?: boolean;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
}

export function DesignerZenWorkbench({
  sessionLoading = false,
  focusMode = true,
  onToggleFocusMode,
}: DesignerZenWorkbenchProps) {
  const { config, setConfig } = useDesignerWorkbenchLayout();
  const [versionDrawerOpen, setVersionDrawerOpen] = useState(false);
  const [reviewDrawerOpen, setReviewDrawerOpen] = useState(false);
  const [previewSampleDrawerOpen, setPreviewSampleDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const templateId = useDesignerEditorStore((state) => state.templateId);
  const currentVersionId = useDesignerEditorStore((state) => state.currentVersionId);
  const versions = useDesignerEditorStore((state) => state.versions);
  const formSchema = useDesignerEditorStore((state) => state.formSchema);
  const previewSampleDrawerNonce = useDesignerEditorStore((state) => state.previewSampleDrawerNonce);
  const saveDraft = useDesignerSessionStore((state) => state.saveDraft);
  const publishDraft = useDesignerSessionStore((state) => state.publishDraft);
  const exportResourceMeta = useDesignerSessionStore((state) => state.exportResourceMeta);
  const createVersionSnapshot = useDesignerSessionStore((state) => state.createVersionSnapshot);
  const rollbackToVersion = useDesignerSessionStore((state) => state.rollbackToVersion);
  const switchDraftVersion = useDesignerSessionStore((state) => state.switchDraftVersion);

  useDesignerHotkeys(!sessionLoading);

  useEffect(() => {
    if (previewSampleDrawerNonce > 0) {
      setPreviewSampleDrawerOpen(true);
    }
  }, [previewSampleDrawerNonce]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveDraft();
    } finally {
      setSaving(false);
    }
  };

  const handleOpenReviewConfig = () => {
    if (!templateId) {
      toast.info("请先从模板列表进入当前模板");
      return;
    }
    if (!currentVersionId) {
      toast.info("请先保存模板草稿");
      return;
    }
    setVersionDrawerOpen(false);
    window.setTimeout(() => setReviewDrawerOpen(true), versionDrawerOpen ? SIDE_SLIDE_CLOSE_MS : 0);
  };

  const handleOpenVersionHistory = () => {
    setReviewDrawerOpen(false);
    window.setTimeout(() => setVersionDrawerOpen(true), reviewDrawerOpen ? SIDE_SLIDE_CLOSE_MS : 0);
  };

  return (
    <StandardWorkbenchPage
      schema={designerLayoutSchema}
      config={config}
      onConfigChange={setConfig}
      loading={sessionLoading}
      loadingMessage={LOADING_MESSAGE}
      header={
        <DesignerWorkbenchHeader
          focusMode={focusMode}
          saving={saving}
          onToggleFocusMode={onToggleFocusMode ?? (() => undefined)}
          onSave={() => void handleSave()}
          onPublish={() => void publishDraft()}
          onExport={exportResourceMeta}
          onReviewConfig={handleOpenReviewConfig}
          onVersionHistory={handleOpenVersionHistory}
          onOpenPreviewSample={() => setPreviewSampleDrawerOpen(true)}
        />
      }
      bodyWrapper={(body) => <DesignerDndProvider>{body}</DesignerDndProvider>}
      panels={{
        material: { body: <DesignerMaterialPanel /> },
        canvas: { body: <DesignerCanvasPanel /> },
        property: { body: <DesignerPropertyPanel /> },
      }}
    >
      <VersionHistoryDrawer
        open={versionDrawerOpen}
        versions={versions}
        activeSchema={
          currentVersionId
            ? {
                versionId: currentVersionId,
                fieldCount: countFormFields(formSchema),
                sectionCount: formSchema.sections.length,
              }
            : undefined
        }
        onClose={() => setVersionDrawerOpen(false)}
        onCreateVersion={() => {
          void createVersionSnapshot("新版本");
          setVersionDrawerOpen(false);
        }}
        onRollback={(versionId) => {
          void rollbackToVersion(versionId);
          setVersionDrawerOpen(false);
        }}
        onSwitchVersion={(versionId) => {
          void switchDraftVersion(versionId);
          setVersionDrawerOpen(false);
        }}
      />
      <ReviewConfigDrawer
        open={reviewDrawerOpen}
        versionId={currentVersionId}
        versions={versions}
        onClose={() => setReviewDrawerOpen(false)}
      />
      <DesignerPreviewSampleDrawer
        open={previewSampleDrawerOpen}
        onClose={() => setPreviewSampleDrawerOpen(false)}
      />
    </StandardWorkbenchPage>
  );
}
