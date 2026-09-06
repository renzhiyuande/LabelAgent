import type { WorkbenchLayoutSchema } from "@/components/workbench/types";

export type DesignerPanelId = "material" | "canvas" | "property";
export type DesignerLayoutPreset = "fixed-lcr";

export const DESIGNER_LAYOUT_STORAGE_KEY = "labelhub.workbench.designer.v1";

export const designerLayoutSchema: WorkbenchLayoutSchema<DesignerPanelId, DesignerLayoutPreset> = {
  mode: "designer",
  storageKey: DESIGNER_LAYOUT_STORAGE_KEY,
  defaultPreset: "fixed-lcr",
  leadingPanelId: "material",
  trailingPanelId: "property",
  primaryPanelId: "canvas",
  features: {
    panelReorder: false,
    panelCollapse: true,
    stackedPreset: false,
    auxiliaryDock: false,
    persistLayout: true,
    responsiveStack: false,
    panelChrome: true,
  },
  panelDefinitions: {
    material: {
      id: "material",
      label: "组件库",
      collapsible: true,
      resizable: "width",
      defaultWidth: 280,
      minWidth: 200,
      maxWidth: 480,
    },
    canvas: {
      id: "canvas",
      label: "画布",
      flex: true,
    },
    property: {
      id: "property",
      label: "属性",
      collapsible: true,
      resizable: "width",
      defaultWidth: 360,
      minWidth: 280,
      maxWidth: 560,
    },
  },
  presets: {
    "fixed-lcr": {
      label: "经典三栏",
      hint: "左物料 · 中画布 · 右属性",
      panelOrder: ["material", "canvas", "property"],
      sizes: { leadingWidth: 280, trailingWidth: 360, stackedPrimaryPercent: 55 },
    },
  },
};
