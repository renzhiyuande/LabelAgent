import { AppPageContainer } from "../../app/layout/AppPageContainer";
import { ensureBusinessWorkflowsRegistered } from "../business/workflows/register-business-workflows";
import { SystemTreeResourcePage } from "./SystemTreeResourcePage";
import {
  fetchRemoteOptions,
  getResourceMeta,
  LHResourceCardPage,
  LHResourcePage,
} from "@/low-code";
import type { ResourceMeta } from "@/low-code";
import type { RemoteOptionQuery } from "@/low-code/schema/types";
import { useWorkspaceReloadToken } from "../../app/layout/workspace-reload-context";
import { useAuthStore } from "../../stores/auth";
import { renderResourcePageInsights } from "../resource-pages/render-resource-page-insights";

interface SystemResourcePageProps {
  resourceKey: string;
}

function renderResourceWorkspace(resource: ResourceMeta, reloadToken: number) {
  const currentUser = useAuthStore((state) => state.currentUser);
  switch (resource.page?.key ?? "default") {
    case "tree":
      return <SystemTreeResourcePage resource={resource} reloadToken={reloadToken} />;
    case "card":
      return (
        <LHResourceCardPage
          title=""
          description=""
          resource={resource}
          reloadToken={reloadToken}
          currentUser={currentUser}
          loadRemoteOptions={(source: string, keyword?: string | RemoteOptionQuery) =>
            fetchRemoteOptions(resource, source, keyword)
          }
        />
      );
    case "default":
    default:
      return (
        <LHResourcePage
          title=""
          // description="统一壳层已经接管后台布局。当前页面延续 Schema 驱动能力，并按企业后台的卡片、列表和右侧抽屉风格重新组织。"
          resource={resource}
          reloadToken={reloadToken}
          currentUser={currentUser}
          renderInsights={({ records, loading, refreshing }) =>
            renderResourcePageInsights({ resource, records, loading, refreshing })
          }
          loadRemoteOptions={(source: string, keyword?: string | RemoteOptionQuery) =>
            fetchRemoteOptions(resource, source, keyword)
          }
        />
      );
  }
}

export function SystemResourcePage({ resourceKey }: SystemResourcePageProps) {
  ensureBusinessWorkflowsRegistered();
  const reloadToken = useWorkspaceReloadToken();
  const resource = getResourceMeta(resourceKey);
  if (!resource) {
    return (
      <AppPageContainer title="功能暂不可用" description="当前页面暂未开放，请联系管理员完成配置。">
        <div className="rounded-[20px] border border-dashed border-border/70 bg-card/70 px-4 py-5 text-sm text-muted-foreground">
          暂未找到对应的页面资源定义：`{resourceKey}`
        </div>
      </AppPageContainer>
    );
  }

  const pageTitle = `${resource.label}管理`;

  if ((resource.page?.key ?? "default") !== "default") {
    return renderResourceWorkspace(resource, reloadToken);
  }

  return (
    <AppPageContainer
      title={resource.page?.summary ? undefined : pageTitle}
      // extra={x
      //   <Button
      //     variant="outline"
      //     size="sm"
      //     onClick={() => appMessage.info("统一协议文档正在接入后台 Shell 导航。")}
      //   >
      //     查看协议
      //   </Button>
      // }
    >
      {renderResourceWorkspace(resource, reloadToken)}
    </AppPageContainer>
  );
}
