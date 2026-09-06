import { AppPageContainer } from "../../app/layout/AppPageContainer";
import { useWorkspaceReloadToken } from "../../app/layout/workspace-reload-context";
import { LHResourcePage } from "@/low-code";
import { demoOrdersResource } from "@/low-code/mock/demo-resource";
import type { RemoteOptionQuery } from "@/low-code/schema/types";
import type { EngineActionRequest, EngineListQuery, EngineListResult, ResourceRecord } from "@/low-code/types";
import {
  createMockRecord,
  fetchMockDependentOptions,
  fetchMockDetail,
  fetchMockList,
  fetchMockOptions,
  runMockAction,
  updateMockRecord,
} from "@/low-code/mock/provider";

export function SystemLowCodeLabPage() {
  const reloadToken = useWorkspaceReloadToken();

  function toKeyword(query?: string | RemoteOptionQuery): string | undefined {
    return typeof query === "string" ? query : query?.keyword;
  }

  return (
    <AppPageContainer
      // title="低代码实验场"
      // description="这页专门给前端试 schema 驱动能力。现在先用 mock 数据把动态表格、动态表单、远程选项和行操作打通，再逐步替换成真实接口。"
      // extra={
      //   <div className="flex items-center gap-2">
      //     <Button
      //       variant="outline"
      //       size="sm"
      //       onClick={() => appMessage.info("这个实验页不会调用后端，适合先校验交互和 schema 模型。")}
      //     >
      //       <Beaker className="mr-2 h-4 w-4" />
      //       Mock 模式
      //     </Button>
      //     <Button
      //       variant="outline"
      //       size="sm"
      //       onClick={() => appMessage.success("动态表单、动态表格和详情抽屉已经可以在这一页联调。")}
      //     >
      //       <Sparkles className="mr-2 h-4 w-4" />
      //       查看能力
      //     </Button>
      //   </div>
      // }
    >
      <LHResourcePage
        title=""
        description=""
        resource={demoOrdersResource}
        reloadToken={reloadToken}
        loadList={(query: EngineListQuery): Promise<EngineListResult<ResourceRecord>> => fetchMockList(query)}
        loadDetail={(id: string | number) => fetchMockDetail(id)}
        createRecord={(values: Record<string, unknown>) => createMockRecord(values)}
        updateRecord={(id: string | number, values: Record<string, unknown>) => updateMockRecord(id, values)}
        runAction={(request: EngineActionRequest) => runMockAction(request)}
        loadRemoteOptions={(source: string, query?: string | RemoteOptionQuery) => {
          const keyword = toKeyword(query);
          if (source === "cities" || source === "districts" || source === "reviewers") {
            return fetchMockDependentOptions(source, keyword);
          }
          return fetchMockOptions(source, keyword);
        }}
      />
    </AppPageContainer>
  );
}
