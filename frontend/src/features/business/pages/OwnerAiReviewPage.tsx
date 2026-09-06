import { useMemo } from "react";
import { AppPageContainer } from "@/app/layout/AppPageContainer";
import { useWorkspaceReloadToken } from "@/app/layout/workspace-reload-context";
import { renderResourcePageInsights } from "@/features/resource-pages/render-resource-page-insights";
import {
  fetchEngineList,
  fetchRemoteOptions,
  getResourceMeta,
  LHResourcePage,
  type ResourceRecord,
  type ResourceMeta,
} from "@/low-code";
import type { RemoteOptionQuery } from "@/low-code/schema/types";
import { useAuthStore } from "@/stores/auth";

const AI_REVIEW_PAGE_STATUSES = [
  "SUBMITTED",
  "AI_REVIEWING",
  "AI_PASSED",
  "AI_REJECTED",
  "HUMAN_REVIEWING",
  "APPROVED",
  "REJECTED",
  "NEEDS_REVISION",
] as const;

export function OwnerAiReviewPage() {
  const reloadToken = useWorkspaceReloadToken();
  const currentUser = useAuthStore((state) => state.currentUser);
  const resource = getResourceMeta("submissions");

  const pageResource = useMemo<ResourceMeta | null>(() => {
    if (!resource) {
      return null;
    }
    return {
      ...resource,
      label: "Owner AI 审核台",
      capabilities: {
        ...resource.capabilities,
        create: false,
        edit: false,
      },
    };
  }, [resource]);

  if (!pageResource) {
    return (
      <AppPageContainer title="Owner AI 审核台" description="当前无法加载审核数据，请稍后重试或联系管理员。">
        <div className="rounded-[20px] border border-dashed border-border/70 bg-card/70 px-4 py-5 text-sm text-muted-foreground">
          暂未找到 `submissions` 资源定义。
        </div>
      </AppPageContainer>
    );
  }

  return (
    <AppPageContainer
      title="Owner AI 审核台"
      description="集中查看进入 AI 生命周期的提交记录，按任务、标注员和关键词筛选，并继续通过详情和 AI 结果追溯上下文。"
    >
      <LHResourcePage
        title=""
        description=""
        resource={pageResource}
        reloadToken={reloadToken}
        currentUser={currentUser}
        hideFilters={["status"]}
        pinnedListFilters={[{ field: "status", op: "in", value: [...AI_REVIEW_PAGE_STATUSES] }]}
        loadList={(query) => fetchEngineList<ResourceRecord>(pageResource, query)}
        renderInsights={({ records, loading, refreshing }) =>
          renderResourcePageInsights({ resource: pageResource, records, loading, refreshing })
        }
        loadRemoteOptions={(source: string, keyword?: string | RemoteOptionQuery) =>
          fetchRemoteOptions(pageResource, source, keyword)
        }
      />
    </AppPageContainer>
  );
}
