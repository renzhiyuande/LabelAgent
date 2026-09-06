import { AppPageContainer } from "@/app/layout/AppPageContainer";
import {
  fetchLegacyList,
  fetchRemoteOptions,
  getResourceMeta,
  LHResourceCardPage,
  LHResourcePage,
} from "@/low-code";
import type { EngineListQuery, ResourceRecord } from "@/low-code/types";
import type { ResourceMeta } from "@/low-code";
import type { RemoteOptionQuery } from "@/low-code/schema/types";
import { useWorkspaceReloadToken } from "@/app/layout/workspace-reload-context";
import { useAuthStore } from "@/stores/auth";
import { renderResourcePageInsights } from "@/features/resource-pages/render-resource-page-insights";

interface LabelerResourcePageProps {
  resourceKey: string;
}

function getResourceDescription(resourceKey: string) {
  if (resourceKey === "labelerMarket") {
    return "浏览可领取任务，领取后进入标注工作台作答。";
  }
  if (resourceKey === "labelerMyRewards") {
    return "查看当前登录用户的奖励明细、批次状态和预计到账节奏。";
  }
  return "我的任务与提交记录";
}

function renderResourceWorkspace(resource: ResourceMeta, reloadToken: number) {
  const currentUser = useAuthStore((state) => state.currentUser);
  const loadRemoteOptions = (source: string, query?: string | RemoteOptionQuery) =>
    fetchRemoteOptions(resource, source, query);

  switch (resource.page?.key ?? "default") {
    case "card":
      return (
        <LHResourceCardPage
          title=""
          description=""
          resource={resource}
          reloadToken={reloadToken}
          pageSize={12}
          currentUser={currentUser}
          loadList={(query: EngineListQuery) => fetchLegacyList<ResourceRecord>(resource, query)}
          loadRemoteOptions={loadRemoteOptions}
        />
      );
    case "default":
    default:
      return (
        <LHResourcePage
          title=""
          description=""
          resource={resource}
          reloadToken={reloadToken}
          currentUser={currentUser}
          renderInsights={({ records, loading, refreshing }) =>
            renderResourcePageInsights({ resource, records, loading, refreshing })
          }
          loadRemoteOptions={loadRemoteOptions}
        />
      );
  }
}

export function LabelerResourcePage({ resourceKey }: LabelerResourcePageProps) {
  const reloadToken = useWorkspaceReloadToken();
  const resource = getResourceMeta(resourceKey);
  const compactSummaryPage = Boolean(resource?.page?.summary);
  if (!resource) {
    return (
      <AppPageContainer title="功能暂不可用" description="当前页面暂未开放，请联系项目管理员。">
        <div className="rounded-[20px] border border-dashed border-border/70 bg-card/70 px-4 py-5 text-sm text-muted-foreground">
          暂未找到对应的页面资源定义：`{resourceKey}`
        </div>
      </AppPageContainer>
    );
  }

  if ((resource.page?.key ?? "default") !== "default") {
    return (
      <AppPageContainer title={resource.label} description={compactSummaryPage ? undefined : "标注员专属资源页"}>
        {renderResourceWorkspace(resource, reloadToken)}
      </AppPageContainer>
    );
  }

  return (
    <AppPageContainer title={compactSummaryPage ? undefined : resource.label} description={compactSummaryPage ? undefined : "标注员专属资源页"}>
      {renderResourceWorkspace(resource, reloadToken)}
    </AppPageContainer>
  );
}
