import { PanelLeft } from "lucide-react";
import { Button } from "../../components/ui/button";
import { SideSlidePanel } from "../../components/layout/SideSlidePanel";
import { cn } from "../../lib/utils";
import { fetchRemoteOptions } from "../../adapters/request";
import type { AuthenticatedUser } from "../../lib/types";
import type { DrawerWidth, FilterOperator, ResourceMeta } from "../../schema/types";
import type { ResourceListScope } from "../../utils/list-scope";
import type { ResourceActionHandler, HeaderActionHandler } from "../../actions/registry";
import type { EngineListQuery, EngineListResult, ResourceRecord } from "../../types";
import { LHResourcePage } from "./LHResourcePage";

interface LHResourceSidePanelProps {
  open: boolean;
  onClose: () => void;
  onClosed?: () => void;
  resource: ResourceMeta;
  currentUser?: AuthenticatedUser | null;
  scope?: ResourceListScope;
  title: string;
  description?: string;
  hideFilters?: string[];
  pinnedListFilters?: Array<{ field: string; op?: FilterOperator; value: string }>;
  createDefaults?: Record<string, unknown>;
  createButtonLabel?: string;
  hideFormFields?: string[];
  pageSize?: number;
  embedded?: boolean;
  /** 侧栏宽度，默认 md（640px） */
  width?: DrawerWidth;
  loadList?: (query: EngineListQuery) => Promise<EngineListResult<ResourceRecord>>;
  actionHandlers?: Record<string, ResourceActionHandler>;
  headerActionHandlers?: Record<string, HeaderActionHandler>;
  pickerHandlers?: {
    onRowSelect?: (record: ResourceRecord) => void;
    onConfirm?: (records: ResourceRecord[]) => void;
  };
}

function sidePanelClass(width?: DrawerWidth): string {
  return cn(
    width === "sm" && "lh-side-slide-panel--sm",
    (width === "md" || !width) && "lh-side-slide-panel--md",
    width === "lg" && "lh-side-slide-panel--lg",
    width === "xl" && "lh-side-slide-panel--xl",
    typeof width === "number" && "lh-side-slide-panel--xl",
  );
}

export function LHResourceSidePanel({
  open,
  onClose,
  onClosed,
  resource,
  scope,
  title,
  description,
  hideFilters = [],
  pinnedListFilters,
  createDefaults,
  createButtonLabel,
  hideFormFields,
  pageSize = 10,
  embedded = true,
  currentUser,
  width,
  loadList,
  actionHandlers,
  headerActionHandlers,
  pickerHandlers,
}: LHResourceSidePanelProps) {
  return (
    <SideSlidePanel
      open={open}
      onClose={onClose}
      onClosed={onClosed}
      placement="left"
      fixed
      className={sidePanelClass(width)}
    >
      <div className="lh-resource-side-panel-header">
        <div className="lh-resource-side-panel-heading">
          <div className="flex items-center gap-2 font-semibold">
            <PanelLeft className="h-4 w-4" />
            {title}
          </div>
          {description ? <p className="lh-resource-side-panel-description">{description}</p> : null}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          关闭
        </Button>
      </div>

      <div className="lh-resource-side-panel">
        <LHResourcePage
          resource={resource}
          title={resource.label}
          description={description}
          scope={scope}
          hideFilters={hideFilters}
          pinnedListFilters={pinnedListFilters}
          createDefaults={createDefaults}
          createButtonLabel={createButtonLabel}
          hideFormFields={hideFormFields}
          pageSize={pageSize}
          embedded={embedded}
          currentUser={currentUser}
          loadList={loadList}
          actionHandlers={actionHandlers}
          headerActionHandlers={headerActionHandlers}
          pickerHandlers={pickerHandlers}
          loadRemoteOptions={(source, keyword) => fetchRemoteOptions(resource, source, keyword)}
        />
      </div>
    </SideSlidePanel>
  );
}
