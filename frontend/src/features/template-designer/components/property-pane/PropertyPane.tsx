"use client";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { BasicPropertyTab } from "./BasicPropertyTab";
import { ComponentPropertyTab } from "./ComponentPropertyTab";
import { ValidationPropertyTab } from "./ValidationPropertyTab";
import { LinkagePropertyTab } from "./LinkagePropertyTab";
import { SectionPropertyEditor } from "./SectionPropertyEditor";
import { useDesignerEditorStore } from "../../stores/designer-editor-store";
import type { PropertyTabId } from "../../stores/designer-editor-store";
import { cn } from "@/lib/utils";

const paneShellClass =
  "flex h-full min-h-0 flex-col overflow-hidden border-l border-border bg-card";

export function PropertyPane() {
  const selectedField = useDesignerEditorStore((state) => state.getSelectedField());
  const selectedSection = useDesignerEditorStore((state) => state.getSelectedSection());
  const selectedId = useDesignerEditorStore((state) => state.selectedId);
  const propertyTab = useDesignerEditorStore((state) => state.propertyTab);
  const setPropertyTab = useDesignerEditorStore((state) => state.setPropertyTab);

  const showSection =
    selectedSection && selectedId === selectedSection.key && !selectedField;

  if (!selectedId || (!selectedField && !showSection)) {
    return (
      <div className={paneShellClass}>
        <div
          className={cn(
            "flex min-h-0 flex-1 items-center justify-center p-8 text-center",
          )}
        >
          <div>
            <div className="mb-4 text-4xl">📋</div>
            <h3 className="lh-designer-pane-empty-title">属性配置</h3>
            <p className="lh-designer-pane-empty-hint">
              选中画布中的字段或顶部区块标签
              <br />
              直接编辑 FormFieldSchema / FormSectionSchema
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (showSection && selectedSection) {
    return (
      <div className={paneShellClass}>
        <div className="shrink-0 border-b border-border p-4">
          <h3 className="text-lg font-semibold text-foreground">区块属性</h3>
          <p className="mt-1 text-xs text-muted-foreground">FormSectionSchema</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <SectionPropertyEditor section={selectedSection} />
        </div>
      </div>
    );
  }

  if (!selectedField) return null;

  const hideValidationTab = selectedField.component === "showItem" || selectedField.component === "llmSuggest";
  const activeTab: PropertyTabId =
    hideValidationTab && propertyTab === "validation" ? "basic" : propertyTab;

  return (
    <div className={paneShellClass}>
      <div className="shrink-0 border-b border-border p-4">
        <h3 className="text-lg font-semibold text-foreground">
          {selectedField.label}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          component: {selectedField.component}
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setPropertyTab(value as PropertyTabId)}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div className="shrink-0 border-b border-border px-2 pt-2">
          <TabsList className={`grid w-full ${hideValidationTab ? "grid-cols-3" : "grid-cols-4"} bg-muted`}>
            <TabsTrigger value="basic" className="text-xs">
              基础
            </TabsTrigger>
            <TabsTrigger value="component" className="text-xs">
              组件
            </TabsTrigger>
            {!hideValidationTab ? (
              <TabsTrigger value="validation" className="text-xs">
                校验
              </TabsTrigger>
            ) : null}
            <TabsTrigger value="linkage" className="text-xs">
              联动
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <TabsContent value="basic" className="m-0 mt-0 focus-visible:outline-none">
            <BasicPropertyTab field={selectedField} />
          </TabsContent>
          <TabsContent value="component" className="m-0 mt-0 focus-visible:outline-none">
            <ComponentPropertyTab field={selectedField} />
          </TabsContent>
          {!hideValidationTab ? (
            <TabsContent value="validation" className="m-0 mt-0 focus-visible:outline-none">
              <ValidationPropertyTab field={selectedField} />
            </TabsContent>
          ) : null}
          <TabsContent value="linkage" className="m-0 mt-0 focus-visible:outline-none">
            <LinkagePropertyTab field={selectedField} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
