import { useCallback } from "react";
import { useDesignerEditorStore } from "../../../stores/designer-editor-store";

/** 选中字段并切换到属性面板「组件」Tab */
export function useSelectComponentTab() {
  const select = useDesignerEditorStore((state) => state.select);

  return useCallback(
    (fieldKey: string, event?: React.MouseEvent) => {
      event?.stopPropagation();
      select(fieldKey, "component");
    },
    [select],
  );
}
