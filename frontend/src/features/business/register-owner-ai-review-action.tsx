import { appMessage } from "@/lib/message";
import { registerResourceAction } from "@/low-code/actions/registry";
import type { ResourceActionContext } from "@/low-code/actions/registry";

let registered = false;

export function ensureOwnerAiReviewActionRegistered() {
  if (registered) return;
  registered = true;

  registerResourceAction("viewAiReview", async (context: ResourceActionContext) => {
    const record = context.record;
    const id = record?.id;
    if (id == null) {
      appMessage.info("缺少提交 ID");
      return;
    }
    // Dynamic import to avoid circular deps
    const { OwnerAiReviewDialog } = await import(
      "@/features/business/components/OwnerAiReviewDialog"
    );
    const mountPoint = document.createElement("div");
    document.body.appendChild(mountPoint);
    const { createRoot } = await import("react-dom/client");
    const root = createRoot(mountPoint);
    root.render(
      <OwnerAiReviewDialog
        submissionId={Number(id)}
        onClosed={() => {
          root.unmount();
          mountPoint.remove();
        }}
      />,
    );
  });
}
