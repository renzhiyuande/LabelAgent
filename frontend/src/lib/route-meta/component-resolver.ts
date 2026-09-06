import { getResourceMeta } from "@/low-code";

const COMPONENT_RESOURCE_MAP: Record<string, string> = {
  "pages/users": "users",
  "pages/roles": "roles",
  "pages/permissions": "permissions",
  "pages/menus": "menus",
  "pages/clients": "systemClients",
  "pages/audit": "auditLogs",
  "pages/async": "asyncTasks",
  "pages/scheduled": "scheduledTasks",
  "pages/data-scopes": "dataScopes",
  "pages/llm-providers": "llmProviders",
  "pages/llm-catalog": "llmProviders",
  "pages/dimension-packs": "dimensionPacks",
  "pages/template-market": "templateMarket",
  "pages/template-market-admin": "templateMarketAdmin",
  "resource/assignments": "assignments",
  "resource/submissions": "submissions",
  "pages/labeler/available": "labelerMarket",
  "pages/labeler/my-drafts": "labelerMyDrafts",
  "pages/labeler/my-submitted": "labelerMySubmitted",
  "pages/labeler/my-tasks": "labelerMyTasks",
  "pages/labeler/my-rewards": "labelerMyRewards",
  "pages/owner/acceptances": "acceptances",
  "pages/owner/appeals": "ownerAppeals",
  "pages/owner/exports": "exports",
  "pages/owner/tasks": "tasks",
  "pages/owner/templates": "templates",
  "pages/owner/settlements": "rewardSettlements",
  "resource/labelerMarket": "labelerMarket",
  "resource/labelerMyDrafts": "labelerMyDrafts",
  "resource/labelerMySubmitted": "labelerMySubmitted",
  "resource/labelerMyTasks": "labelerMyTasks",
  "resource/labelerMyRewards": "labelerMyRewards",
  "resource/acceptances": "acceptances",
  "resource/ownerAppeals": "ownerAppeals",
  "resource/exports": "exports",
  "resource/rewardSettlements": "rewardSettlements",
  "pages/reviewer/review-results": "reviewerReviewRecords",
  "resource/reviewerReviewRecords": "reviewerReviewRecords",
};

function toCamelCase(value: string): string {
  return value.replace(/[-_/]+([a-zA-Z0-9])/g, (_, char: string) => char.toUpperCase());
}

export function resolveResourceKeyFromComponentPath(componentPath: string): string | null {
  const direct = COMPONENT_RESOURCE_MAP[componentPath];
  if (direct) {
    return direct;
  }

  if (componentPath.startsWith("resource/")) {
    const resourceKey = componentPath.slice("resource/".length);
    return getResourceMeta(resourceKey) ? resourceKey : null;
  }

  if (!componentPath.startsWith("pages/")) {
    return null;
  }

  const suffix = componentPath.slice("pages/".length);
  const candidates = [suffix, suffix.split("/").pop() ?? suffix, toCamelCase(suffix), toCamelCase(suffix.split("/").pop() ?? suffix)];

  for (const candidate of candidates) {
    if (getResourceMeta(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function isRenderableComponentPath(componentPath?: string | null): boolean {
  if (!componentPath) {
    return false;
  }
  return componentPath.startsWith("pages/") || componentPath.startsWith("resource/");
}
