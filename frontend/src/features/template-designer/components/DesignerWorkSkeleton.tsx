export function DesignerWorkSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/70 lh-workbench-enter">
      <div className="h-14 shrink-0 animate-pulse border-b border-border/80 bg-card/90" />
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        <div className="hidden animate-pulse bg-muted lg:block" />
        <div className="animate-pulse bg-background" />
        <div className="hidden animate-pulse bg-card lg:block" />
      </div>
    </div>
  );
}
