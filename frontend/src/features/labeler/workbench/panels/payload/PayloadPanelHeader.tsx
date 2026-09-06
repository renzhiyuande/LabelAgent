import { Badge } from "@/components/ui/badge";

interface PayloadPanelHeaderProps {
  taskName: string;
  seqNo?: number;
  sceneCode?: string;
}

export function PayloadPanelHeader({ taskName, seqNo, sceneCode }: PayloadPanelHeaderProps) {
  return (
    <div className="shrink-0 border-b border-border/80 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">当前题目</p>
        <h2 className="mt-0.5 truncate text-base font-semibold text-foreground">{taskName}</h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {seqNo != null ? <Badge variant="secondary">第 {seqNo} 题</Badge> : null}
          {sceneCode ? <Badge variant="secondary">{sceneCode}</Badge> : null}
        </div>
      </div>
    </div>
  );
}
