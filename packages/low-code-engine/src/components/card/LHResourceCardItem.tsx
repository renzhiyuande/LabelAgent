import { MoreHorizontal } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import type { ActionSchema, CardPageSchema, OptionItem, ResourceMeta } from "../../schema/types";
import type { ResourceRecord } from "../../types";
import type { AuthenticatedUser } from "../../lib/types";
import {
  resolveCardBadgeLabel,
  resolveCardFieldText,
  resolveCardMetricText,
} from "../../utils/card-field";
import {
  resolveCardOverflowActions,
  resolveCardPrimaryAction,
} from "../../utils/card-actions";
import { cn } from "../../lib/utils";

interface LHResourceCardItemProps {
  resource: ResourceMeta;
  card: CardPageSchema;
  record: ResourceRecord;
  currentUser: AuthenticatedUser | null;
  dictOptions?: Record<string, OptionItem[]>;
  onOpenDetail?: (record: ResourceRecord) => void;
  onAction: (action: ActionSchema, record: ResourceRecord) => void;
}

function badgeVariant(tone?: string): "default" | "secondary" | "destructive" | "success" | "warning" {
  switch (tone) {
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "destructive":
      return "destructive";
    default:
      return "secondary";
  }
}

export function LHResourceCardItem({
  resource,
  card,
  record,
  currentUser,
  dictOptions = {},
  onOpenDetail,
  onAction,
}: LHResourceCardItemProps) {
  const primaryAction = resolveCardPrimaryAction(resource, card, record, currentUser);
  const overflowActions = resolveCardOverflowActions(resource, card, record, currentUser, primaryAction);
  const clickable = card.clickable !== false && Boolean(onOpenDetail);

  return (
    <Card
      className={cn(
        "flex h-full flex-col rounded-[20px] border-border/80 bg-card/95 shadow-[0_12px_32px_hsl(var(--foreground)/0.06)] transition hover:shadow-[0_16px_40px_hsl(var(--foreground)/0.1)]",
        clickable && "cursor-pointer",
      )}
      role="article"
      onClick={() => {
        if (clickable) {
          onOpenDetail?.(record);
        }
      }}
    >
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">{resolveCardFieldText(record, card.title)}</CardTitle>
            {card.subtitle ? (
              <CardDescription className="mt-1 truncate">
                {resolveCardFieldText(record, card.subtitle)}
              </CardDescription>
            ) : null}
          </div>
          {card.badges?.length ? (
            <div className="flex shrink-0 flex-wrap justify-end gap-1">
              {card.badges.map((badge) => {
                const resolved = resolveCardBadgeLabel(record, badge, dictOptions);
                if (!resolved.label) {
                  return null;
                }
                return (
                  <Badge key={badge.field} variant={badgeVariant(resolved.tone)}>
                    {resolved.label}
                  </Badge>
                );
              })}
            </div>
          ) : null}
        </div>
        {card.description ? (
          <p
            className="text-sm leading-6 text-muted-foreground"
            style={
              card.description.maxLines
                ? {
                    display: "-webkit-box",
                    WebkitLineClamp: card.description.maxLines,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }
                : undefined
            }
          >
            {resolveCardFieldText(record, card.description)}
          </p>
        ) : null}
      </CardHeader>
      {card.metrics?.length ? (
        <CardContent className="grid grid-cols-2 gap-2 pb-3 pt-0 sm:grid-cols-3">
          {card.metrics.map((metric) => (
            <div
              key={`${metric.field}-${metric.label}`}
              className="rounded-xl bg-muted px-3 py-2"
            >
              <div className="text-xs text-muted-foreground">{metric.label}</div>
              <div className="mt-0.5 text-sm font-medium text-foreground">
                {resolveCardMetricText(record, metric)}
              </div>
            </div>
          ))}
        </CardContent>
      ) : null}
      {(primaryAction || overflowActions.length > 0) && (
        <CardFooter
          className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-4"
          onClick={(event) => event.stopPropagation()}
        >
          {primaryAction ? (
            <Button
              type="button"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                onAction(primaryAction, record);
              }}
              aria-label={`${primaryAction.label}：${resolveCardFieldText(record, card.title)}`}
            >
              {primaryAction.label}
            </Button>
          ) : (
            <span />
          )}
          {overflowActions.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {overflowActions.map((action) => (
                  <DropdownMenuItem key={action.key} onClick={() => onAction(action, record)}>
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </CardFooter>
      )}
    </Card>
  );
}
