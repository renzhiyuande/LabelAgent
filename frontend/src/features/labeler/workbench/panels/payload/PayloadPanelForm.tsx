import { useMemo } from "react";
import { fetchRemoteOptions } from "@/low-code";
import { LHResourceForm } from "@/low-code/components/forms/LHResourceForm";
import { buildResourceMeta } from "@/low-code/utils/form-schema";
import type { PayloadPanelBodyProps } from "./types";

function PayloadEmptyState({ message }: { message: string }) {
  return <p className="px-4 py-6 text-center text-sm text-slate-500">{message}</p>;
}

export function PayloadPanelForm({
  displaySchema,
  displayValues,
  flatDisplayFields,
  hasTemplateDisplay,
  hasPayload,
}: PayloadPanelBodyProps) {
  const displayResource = useMemo(
    () => buildResourceMeta(displaySchema, displaySchema.title ?? "题目内容", "labeler_work_display"),
    [displaySchema],
  );

  if (!hasTemplateDisplay) {
    return (
      <PayloadEmptyState message={hasPayload ? "暂无展示模板，请切换到表格或 JSON 视图" : "本题暂无导入数据"} />
    );
  }

  if (flatDisplayFields.length === 0) {
    return <PayloadEmptyState message="展示模板未配置字段" />;
  }

  return (
    <LHResourceForm
      resource={displayResource}
      mode="edit"
      values={displayValues}
      formId="labeler-payload-display-form"
      variant="labeler-display"
      onChange={() => undefined}
      onSubmit={async () => undefined}
      loadRemoteOptions={(source, keyword) => fetchRemoteOptions(displayResource, source, keyword)}
    />
  );
}
