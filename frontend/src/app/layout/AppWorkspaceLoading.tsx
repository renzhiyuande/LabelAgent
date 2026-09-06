import { Skeleton } from "../../components/ui/skeleton";

export function AppWorkspaceLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-5 p-5 lg:p-7">
      <div className="rounded-[28px] border border-white/70 bg-white/70 p-6 shadow-[0_18px_45px_rgba(148,163,184,0.1)] backdrop-blur dark:border-border/70 dark:bg-card/70">
        <Skeleton className="h-5 w-28 rounded-full" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-8 w-72 max-w-full rounded-2xl" />
          <Skeleton className="h-4 w-[420px] max-w-full rounded-full" />
          <Skeleton className="h-4 w-[320px] max-w-full rounded-full" />
        </div>
      </div>

      <div className="grid flex-1 min-h-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[24px] border border-slate-200/70 bg-white/80 p-5 shadow-[0_10px_30px_rgba(148,163,184,0.08)] backdrop-blur dark:border-border/70 dark:bg-card/60"
          >
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="mt-4 h-3 w-full rounded-full" />
            <Skeleton className="mt-3 h-3 w-[88%] rounded-full" />
            <Skeleton className="mt-3 h-3 w-[72%] rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
