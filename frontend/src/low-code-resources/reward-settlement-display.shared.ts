import { normalizeSnowflakeId } from "@/low-code/lib/id-utils";
import type { DetailFieldSchema, FormSectionSchema } from "@/low-code/schema/types";

export function parseRewardJsonField(raw: unknown): Record<string, unknown> | null {
  if (raw == null || raw === "") {
    return null;
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return typeof parsed === "object" && parsed != null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function pickCalcBasisValue(
  basis: Record<string, unknown> | null,
  ...keys: string[]
): unknown {
  if (!basis) {
    return undefined;
  }
  for (const key of keys) {
    const value = basis[key];
    if (value != null && value !== "") {
      return value;
    }
  }
  return undefined;
}

function pickCalcBasisId(
  basis: Record<string, unknown> | null,
  ...keys: string[]
): string | number | undefined {
  const raw = pickCalcBasisValue(basis, ...keys);
  if (raw == null || raw === "") {
    return undefined;
  }
  return normalizeSnowflakeId(raw) ?? (typeof raw === "number" || typeof raw === "string" ? raw : undefined);
}

export function enrichRewardSettlementDisplayRecord(
  record: Record<string, unknown>,
): Record<string, unknown> {
  const basis = parseRewardJsonField(record.calcBasisJson);
  const ruleSnapshot = parseRewardJsonField(record.rewardRuleSnapshotJson);
  const ruleFromBasis = parseRewardJsonField(basis?.rule);
  const mode = pickCalcBasisValue(basis, "mode") ?? ruleSnapshot?.mode ?? ruleFromBasis?.mode;
  return {
    ...record,
    rewardRuleMode: mode == null || mode === "" ? record.rewardRuleMode : String(mode),
    calcBasisTaskId: pickCalcBasisId(basis, "taskId", "task_id") ?? record.taskId,
    calcBasisSubmissionId: pickCalcBasisId(basis, "submissionId", "submission_id") ?? record.submissionId,
    calcBasisSubmissionVersionId:
      pickCalcBasisId(basis, "submissionVersionId", "submission_version_id") ?? record.submissionVersionId,
    calcBasisAssignmentId: pickCalcBasisId(basis, "assignmentId", "assignment_id") ?? record.assignmentId,
    calcBasisLabelerId: pickCalcBasisId(basis, "labelerId", "labeler_id") ?? record.userId,
    calcBasisFinalStatus: pickCalcBasisValue(basis, "finalStatus", "final_status"),
    calcBasisCurrency: pickCalcBasisValue(basis, "currency") ?? record.currencyCode,
    calcBasisSettleUnit: pickCalcBasisValue(basis, "settleUnit", "settle_unit"),
    calcBasisBaseAmount: pickCalcBasisValue(basis, "baseAmount", "base_amount"),
    calcBasisAmount: pickCalcBasisValue(basis, "amount") ?? record.amount,
    calcBasisSampleId: pickCalcBasisValue(basis, "sampleId", "sample_id"),
    calcBasisTaskTitle:
      record.calcBasisTaskTitle ?? record.taskTitle,
    calcBasisSubmissionLabel: record.calcBasisSubmissionLabel,
    calcBasisSubmissionVersionLabel: record.calcBasisSubmissionVersionLabel,
    calcBasisAssignmentLabel: record.calcBasisAssignmentLabel,
  };
}

export type CalcBasisDetailAudience = "owner" | "labeler";

export function buildCalcBasisDetailFields(audience: CalcBasisDetailAudience): DetailFieldSchema[] {
  const taskResource = audience === "owner" ? "tasks" : "labelerMyTasks";
  const submissionResource = audience === "owner" ? "submissions" : "labelerMySubmitted";
  const assignmentResource = audience === "owner" ? "assignments" : "labelerTaskItems";

  return [
    {
      key: "calcBasisTaskTitle",
      label: "任务",
      type: "link",
      link: {
        labelField: "calcBasisTaskTitle",
        action: "openRelated",
        resourceKey: taskResource,
        idField: "calcBasisTaskId",
      },
    },
    {
      key: "calcBasisSubmissionLabel",
      label: "提交",
      type: "link",
      link: {
        labelField: "calcBasisSubmissionLabel",
        action: "openRelated",
        resourceKey: submissionResource,
        idField: "calcBasisSubmissionId",
      },
    },
    {
      key: "calcBasisSubmissionVersionLabel",
      label: "提交版本",
      type: "link",
      link: {
        labelField: "calcBasisSubmissionVersionLabel",
        action: "openRelated",
        resourceKey: submissionResource,
        idField: "calcBasisSubmissionId",
      },
    },
    {
      key: "calcBasisAssignmentLabel",
      label: "分配",
      type: "link",
      link: {
        labelField: "calcBasisAssignmentLabel",
        action: "openRelated",
        resourceKey: assignmentResource,
        idField: "calcBasisAssignmentId",
      },
    },
    {
      key: "calcBasisLabelerId",
      label: "标注员",
      type: "user",
      user: { idField: "calcBasisLabelerId", nameField: "labelerDisplayName", role: "LABELER" },
    },
    { key: "calcBasisSampleId", label: "样本标识", type: "text" },
    { key: "calcBasisFinalStatus", label: "最终状态", type: "text" },
    { key: "calcBasisCurrency", label: "币种", type: "text" },
    { key: "calcBasisSettleUnit", label: "结算单位", type: "text" },
    { key: "calcBasisBaseAmount", label: "基础金额", type: "number" },
    { key: "calcBasisAmount", label: "结算金额", type: "number" },
  ];
}

function buildRewardRuleRemoteSchemaFormSection(schemaApi: string): FormSectionSchema {
  return {
    key: "rewardRuleBinding",
    fields: [
      {
        key: "rewardRuleMode",
        label: "奖励规则",
        component: "remoteSelect",
        remote: { source: "rewardRules" },
      },
      {
        key: "rewardRuleConfig",
        label: "规则配置",
        component: "remoteSchema",
        remoteSchema: {
          api: schemaApi,
          dependsOn: "rewardRuleMode",
          binding: {
            payloadField: "rewardRuleSnapshotJson",
            discriminatorKey: "mode",
          },
        },
      },
    ],
  };
}

/** 甲方 / 奖励管理：owner 远程 schema */
export const ownerRewardRuleRemoteSchemaFormSection = buildRewardRuleRemoteSchemaFormSection(
  "/api/v1/owner/remote-schemas/rewardRules/{rewardRuleMode}/form-schema",
);

/** 标注员「我的奖励」：labeler 远程 schema（只读 rewardRules） */
export const labelerRewardRuleRemoteSchemaFormSection = buildRewardRuleRemoteSchemaFormSection(
  "/api/v1/labeler/remote-schemas/rewardRules/{rewardRuleMode}/form-schema",
);

/** @deprecated 使用 ownerRewardRuleRemoteSchemaFormSection */
export const rewardRuleRemoteSchemaFormSection = ownerRewardRuleRemoteSchemaFormSection;

export const rewardRuleSnapshotDetailField: DetailFieldSchema = {
  key: "rewardRuleSnapshotJson",
  label: "奖励规则",
  type: "remoteSchema",
};

/** @deprecated 使用 buildCalcBasisDetailFields("owner" | "labeler") */
export const calcBasisDetailFields: DetailFieldSchema[] = buildCalcBasisDetailFields("owner");
