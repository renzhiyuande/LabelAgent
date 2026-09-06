import type { ReviewWorkbenchBusinessContext } from "../../types";

/** 未选中待审条目时的占位 */
export function ContentBodyPanelBody({ context: _context }: { context: ReviewWorkbenchBusinessContext }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">请从左侧选择待审条目</div>
  );
}
