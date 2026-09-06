import { cn } from "@/lib/utils";
import { ScoreProgressBar } from "./ScoreProgressBar";
import type { AiDimensionScore } from "./AiInsightPanel";

interface DimensionScoreGridProps {
  dimensions: AiDimensionScore[];
  className?: string;
  columns?: 1 | 2;
}

export function DimensionScoreGrid({ dimensions, className, columns = 2 }: DimensionScoreGridProps) {
  return (
    <div className={cn("grid gap-2", columns === 2 ? "sm:grid-cols-2" : "grid-cols-1", className)}>
      {dimensions.map((dimension) => (
        <div key={dimension.key} className="rounded-lg bg-card/70 p-2.5">
          <ScoreProgressBar
            label={dimension.label}
            score={dimension.score}
            maxScore={dimension.maxScore}
          />
          {dimension.comment ? (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{dimension.comment}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
