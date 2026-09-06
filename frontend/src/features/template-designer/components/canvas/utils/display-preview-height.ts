import type { FormFieldSchema } from "@/low-code/schema/types";
import {
  SHOW_ITEM_AUTO_INITIAL_MAX,
  SHOW_ITEM_DISPLAY_HEIGHT_BOUNDS,
} from "@/low-code/components/fields/show-item-utils";

export type DisplayPreviewComponent = "showItem" | "showImage" | "showFile" | "showVideo";

export const DISPLAY_PREVIEW_HEIGHT_BOUNDS: Record<
  DisplayPreviewComponent,
  { min: number; max: number; default: number }
> = {
  showItem: { ...SHOW_ITEM_DISPLAY_HEIGHT_BOUNDS, default: SHOW_ITEM_AUTO_INITIAL_MAX },
  showImage: { min: 80, max: 640, default: 280 },
  showVideo: { min: 120, max: 720, default: 360 },
  showFile: { min: 48, max: 200, default: 72 },
};

export function isDisplayPreviewComponent(component: string): component is DisplayPreviewComponent {
  return component === "showItem" || component === "showImage" || component === "showFile" || component === "showVideo";
}

export function clampDisplayPreviewHeight(component: DisplayPreviewComponent, height: number): number {
  const { min, max } = DISPLAY_PREVIEW_HEIGHT_BOUNDS[component];
  return Math.max(min, Math.min(max, Math.round(height)));
}

export function readDisplayPreviewHeight(field: FormFieldSchema): number | undefined {
  switch (field.component) {
    case "showItem":
      return field.showItem?.maxHeight;
    case "showImage":
      return field.showImage?.maxHeight;
    case "showVideo":
      return field.showVideo?.maxHeight;
    case "showFile":
      return field.showFile?.maxHeight;
    default:
      return undefined;
  }
}
