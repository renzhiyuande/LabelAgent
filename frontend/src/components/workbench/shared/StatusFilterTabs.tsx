import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface StatusFilterTab {
  id: string;
  label: string;
  count?: number;
}

interface StatusFilterTabsProps {
  tabs: StatusFilterTab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function StatusFilterTabs({ tabs, activeTabId, onTabChange, className }: StatusFilterTabsProps) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {tabs.map((tab) => {
        const active = tab.id === activeTabId;
        return (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant={active ? "default" : "outline"}
            className={cn("h-8 gap-1.5 px-2.5", !active && "border-border/80 bg-card")}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
            {tab.count != null ? (
              <Badge variant={active ? "secondary" : "secondary"} className="h-5 min-w-[1.25rem] px-1 text-[10px]">
                {tab.count}
              </Badge>
            ) : null}
          </Button>
        );
      })}
    </div>
  );
}
