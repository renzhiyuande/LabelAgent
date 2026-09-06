import { cn } from "@/lib/utils";

interface ScoreProgressBarProps {
  label: string;
  score: number;
  maxScore: number;
  className?: string;
}

export function ScoreProgressBar({ label, score, maxScore, className }: ScoreProgressBarProps) {
  const percent = Math.round((score / maxScore) * 100);

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">
          {score}/{maxScore}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            percent >= 75 ? "bg-emerald-500" : percent >= 60 ? "bg-amber-500" : "bg-rose-500",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
