import type { SchemaDataViewMode } from "@/components/workbench/shared/schema-data/SchemaDataView";
import { AuditTimeline } from "@/components/workbench/shared/AuditTimeline";
import { JsonCodeBlock } from "@/components/workbench/shared/JsonCodeBlock";
import { flattenSubmitDataDiff } from "@/components/workbench/shared/flatten-submit-data-diff";
import { SubmissionFieldDiffList } from "@/components/workbench/shared/SubmissionFieldDiffList";
import type { WorkbenchPanelSectionDefinition } from "@/components/workbench/shared/panel-sections/types";
import type { ManualReviewDetail } from "../../../types";

export function buildReviewAnnotateMetaSections(detail: ManualReviewDetail): WorkbenchPanelSectionDefinition[] {
  const sections: WorkbenchPanelSectionDefinition[] = [];
  const flatDiffs = flattenSubmitDataDiff(detail.previousSubmitData, detail.annotateData);

  if (flatDiffs.length > 0) {
    sections.push({
      id: "annotate-diff",
      title: "标准结果差异",
      data: { diff_count: flatDiffs.length },
      emptyMessage: "暂无与上一轮的差异",
      renderBody: ({ viewMode }: { viewMode: SchemaDataViewMode }) => {
        if (viewMode === "json") {
          return (
            <JsonCodeBlock
              value={flattenSubmitDataDiff(detail.previousSubmitData, detail.annotateData)}
              className="border-0 bg-transparent p-0 dark:bg-transparent"
            />
          );
        }
        return (
          <SubmissionFieldDiffList
            previousData={detail.previousSubmitData}
            currentData={detail.annotateData}
            schema={detail.annotateSchema}
            compact={viewMode === "inline"}
            emptyMessage="暂无与上一轮的差异"
          />
        );
      },
    });
  }

  if (detail.timeline.length > 0) {
    sections.push({
      id: "annotate-timeline",
      title: "标注时间线",
      data: { entry_count: detail.timeline.length },
      emptyMessage: "暂无标注流转记录",
      renderBody: ({ viewMode }: { viewMode: SchemaDataViewMode }) => {
        if (viewMode === "json") {
          return (
            <JsonCodeBlock
              value={detail.timeline}
              className="border-0 bg-transparent p-0 dark:bg-transparent"
            />
          );
        }
        return (
          <AuditTimeline
            entries={detail.timeline}
            title=""
            variant={viewMode === "inline" ? "compact" : "default"}
            className="border-0 bg-transparent p-0 shadow-none dark:bg-transparent"
          />
        );
      },
    });
  }

  return sections;
}
