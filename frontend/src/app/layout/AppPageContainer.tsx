import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface AppPageContainerProps {
  title?: string;
  description?: string;
  extra?: ReactNode;
  children: ReactNode;
}

export function AppPageContainer({ title, description, extra, children }: AppPageContainerProps) {
  const hasHeader = Boolean(title || description || extra);

  return (
    <section className="flex h-full min-h-0 flex-col gap-5">
      {hasHeader ? (
        <div className={cn("lh-app-page-header flex flex-col gap-3 rounded-[28px] border border-border/70 bg-card/78 p-7 shadow-[0_18px_45px_hsl(var(--foreground)/0.06)] backdrop-blur transition-colors lg:flex-row lg:items-start lg:justify-between")}>
          <div>
            {title ? <div className="lh-app-page-accent mb-3 h-1 w-12 rounded-full bg-primary/80" /> : null}
            {title ? <h1 className="lh-app-page-title text-[2rem] font-semibold tracking-tight text-foreground">{title}</h1> : null}
            {description ? <p className="lh-app-page-description mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
          </div>
          {extra ? <div className="flex items-center gap-2">{extra}</div> : null}
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </section>
  );
}
