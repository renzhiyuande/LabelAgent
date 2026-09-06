"use client";

import { useEffect, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { useLeadingTabOrder, type LeadingTabId } from "../../hooks/use-leading-tab-order";
import { useDesignerEditorStore } from "../../stores/designer-editor-store";
import { DESIGNER_MATERIAL_DROP_ID } from "../../utils/dnd";
import { LeadingPanelSortableTabs } from "../material-pane/LeadingPanelSortableTabs";
import { MaterialLibraryContent } from "../material-pane/MaterialLibraryContent";
import { DesignerPreviewValuesPanel } from "../preview/DesignerPreviewValuesPanel";

const leadingShellClass =
  "flex h-full min-h-0 w-full flex-col overflow-hidden border-r border-border bg-card";

const previewPaneClass =
  "bg-[linear-gradient(180deg,hsl(var(--card)/0.96)_0%,hsl(var(--muted)/0.88)_100%)]";

export function DesignerMaterialPanel() {
  const isPreviewMode = useDesignerEditorStore((state) => state.isPreviewMode);
  const previewValues = useDesignerEditorStore((state) => state.previewValues);
  const keyCount = Object.keys(previewValues).length;

  const { tabOrder, reorderTabs } = useLeadingTabOrder();
  const [activeTab, setActiveTab] = useState<LeadingTabId>("materials");

  const { setNodeRef: setMaterialDropRef, isOver: isMaterialDropOver } = useDroppable({
    id: DESIGNER_MATERIAL_DROP_ID,
    disabled: isPreviewMode,
  });

  useEffect(() => {
    setActiveTab(isPreviewMode ? "preview" : "materials");
  }, [isPreviewMode]);

  return (
    <aside
      ref={setMaterialDropRef}
      className={cn(
        leadingShellClass,
        isMaterialDropOver && "bg-muted/80",
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border/80 px-3 pb-2 pt-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">设计辅助</p>
          <LeadingPanelSortableTabs
            tabOrder={tabOrder}
            activeTab={activeTab}
            previewKeyCount={keyCount}
            onSelect={setActiveTab}
            onReorder={reorderTabs}
          />
        </div>

        {activeTab === "materials" ? (
          <div
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            role="tabpanel"
            aria-label="组件库"
          >
            <div className="shrink-0 border-b border-border/60 px-4 py-2">
              <p className="text-xs text-muted-foreground">拖拽组件到画布当前区块</p>
            </div>
            <MaterialLibraryContent />
          </div>
        ) : null}

        {activeTab === "preview" ? (
          <div
            className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", previewPaneClass)}
            role="tabpanel"
            aria-label="预览值"
          >
            <div className="shrink-0 border-b border-border/60 px-4 py-2">
              <p className="text-xs text-muted-foreground">
                {isPreviewMode
                  ? "预览模式 · 可点顶栏「题目数据」注入真实 payload"
                  : "进入预览后可查看实时表单值"}
              </p>
            </div>
            <DesignerPreviewValuesPanel values={previewValues} />
          </div>
        ) : null}
      </div>
    </aside>
  );
}
