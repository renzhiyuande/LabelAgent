import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import type { DetailSectionSchema, OptionItem, RemoteOptionQuery, ResourceMeta, TableColumnLinkMeta } from "../../schema/types";
import type { AuthenticatedUser } from "../../lib/types";
import type { LHDetailViewMode } from "./LHDetailViewToggle";
import { LHDetailGridView } from "./LHDetailGridView";
import { LHDetailTableView } from "./LHDetailTableView";

interface LHDetailTabbedViewProps {
  sections: DetailSectionSchema[];
  viewMode: LHDetailViewMode;
  displayRecord: Record<string, unknown>;
  currentUser: AuthenticatedUser | null;
  resource?: ResourceMeta;
  dictOptions?: Record<string, OptionItem[]>;
  fieldOptions?: Record<string, OptionItem[]>;
  fieldOptionErrors?: Record<string, string>;
  loadRemoteOptions?: (source: string, query?: string | RemoteOptionQuery) => Promise<OptionItem[]>;
  onOpenRelated?: (record: Record<string, unknown>, link: TableColumnLinkMeta) => void;
  onNavigate?: (href: string, openInNewTab?: boolean) => void;
}

function resolveTabLabel(section: DetailSectionSchema): string {
  if (section.title?.trim()) {
    return section.title.trim();
  }
  const firstFieldLabel = section.fields.find((field) => field.label?.trim())?.label?.trim();
  return firstFieldLabel || section.key;
}

function sectionWithoutHeader(section: DetailSectionSchema): DetailSectionSchema {
  return { ...section, title: undefined };
}

export function LHDetailTabbedView({
  sections,
  viewMode,
  displayRecord,
  currentUser,
  resource,
  dictOptions = {},
  fieldOptions = {},
  fieldOptionErrors = {},
  loadRemoteOptions,
  onOpenRelated,
  onNavigate,
}: LHDetailTabbedViewProps) {
  const [activeTab, setActiveTab] = useState(sections[0]?.key ?? "");

  useEffect(() => {
    if (!sections.some((section) => section.key === activeTab)) {
      setActiveTab(sections[0]?.key ?? "");
    }
  }, [activeTab, sections]);

  if (sections.length === 0) {
    return null;
  }

  const sharedProps = {
    displayRecord,
    currentUser,
    resource,
    dictOptions,
    fieldOptions,
    fieldOptionErrors,
    loadRemoteOptions,
    onOpenRelated,
    onNavigate,
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="lh-detail-tabs">
      <div className="lh-detail-tabs-scroll">
        <TabsList className="lh-detail-tabs-list">
          {sections.map((section) => (
            <TabsTrigger key={section.key} value={section.key} className="lh-detail-tabs-trigger">
              {resolveTabLabel(section)}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {sections.map((section) => (
        <TabsContent key={section.key} value={section.key} className="lh-detail-tabs-panel">
          {viewMode === "table" ? (
            <LHDetailTableView sections={[sectionWithoutHeader(section)]} {...sharedProps} />
          ) : (
            <LHDetailGridView sections={[sectionWithoutHeader(section)]} {...sharedProps} />
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
