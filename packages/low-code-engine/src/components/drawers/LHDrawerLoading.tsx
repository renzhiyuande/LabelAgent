import { Loader2 } from "lucide-react";

interface LHDrawerLoadingProps {
  message?: string;
}

export function LHDrawerLoading({ message = "加载中..." }: LHDrawerLoadingProps) {
  return (
    <div className="lh-drawer-loading" role="status" aria-live="polite" aria-busy="true">
      <Loader2 className="lh-drawer-loading-icon" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
