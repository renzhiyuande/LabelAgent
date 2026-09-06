import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LabelerTaskCompletePageProps {
  taskName?: string | null;
  completedCount: number;
  onBack: () => void;
  onStay?: () => void;
}

export function LabelerTaskCompletePage({
  taskName,
  completedCount,
  onBack,
  onStay,
}: LabelerTaskCompletePageProps) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-5 bg-gradient-to-b from-emerald-50/80 to-background px-6 text-center dark:from-emerald-950/20 dark:to-background lh-labeler-workbench-enter">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
        <CheckCircle2 className="h-9 w-9" />
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="text-xl font-semibold text-foreground">本题包已全部完成</h1>
        {taskName ? <p className="text-sm text-muted-foreground">{taskName}</p> : null}
        <p className="text-sm leading-6 text-muted-foreground">
          共提交 {completedCount} 题，当前没有待作答题目。可在左侧队列查看各题审核状态，或返回「我的任务」。
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onStay ? (
          <Button type="button" variant="outline" onClick={onStay}>
            留在此页
          </Button>
        ) : null}
        <Button type="button" onClick={onBack}>
          返回我的任务
        </Button>
      </div>
    </div>
  );
}
