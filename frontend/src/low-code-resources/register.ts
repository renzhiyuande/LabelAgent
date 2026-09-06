/**
 * LabelHub 业务资源注册入口
 *
 * 在应用启动时调用，将所有 LabelHub 业务资源注入低代码引擎。
 * 调用方：App.tsx 或入口模块
 */

import { registerResources, registerHeaderActionCallback } from "@labelhub/low-code-engine";
import type { ResourceMeta } from "@labelhub/low-code-engine";

import { asyncTasksResource } from "./async-tasks";
import { auditLogsResource } from "./audit-logs";
import { dataScopesResource } from "./data-scopes";
import { dictItemsResource } from "./dict-items";
import { dictTypesResource } from "./dict-types";
import { menusResource } from "./menus";
import { permissionsResource } from "./permissions";
import { ownerAppealsResource } from "./owner-appeals";
import { rolesResource } from "./roles";
import { systemClientsResource } from "./system-clients";
import { usersResource } from "./users";
import { tasksResource } from "./tasks";
import { taskMembersResource } from "./task-members";
import { taskItemsResource } from "./task-items";
import { assignmentsResource } from "./assignments";
import { assignmentSubmissionAttemptsResource } from "./assignment-submission-attempts";
import { taskAssignmentBoardResource } from "./task-assignment-board";
import { submissionsResource } from "./submissions";
import { templateVersionsResource, templateFieldsResource, templateLayoutsResource } from "./template-versions";
import { templatesResource } from "./templates";
import { labelerMarketResource } from "./labeler-market";
import { labelerMyDraftsResource } from "./labeler-my-drafts";
import { labelerMySubmittedResource } from "./labeler-my-submitted";
import { labelerMyTasksResource } from "./labeler-my-tasks";
import { labelerTaskItemsResource } from "./labeler-task-items";
import { scheduledTasksResource } from "./scheduled-tasks";
import { llmProvidersResource } from "./llm-providers";
import { llmModelsResource } from "./llm-models";
import { dimensionPacksResource } from "./dimension-packs";
import { templateMarketResource } from "./template-market";
import { templateMarketAdminResource } from "./template-market-admin";
import { fileAssetsResource } from "./file-assets";
import { rewardSettlementsResource } from "./reward-settlements";
import { rewardSettlementDetailsResource } from "./reward-settlement-details";
import { labelerMyRewardsResource } from "./labeler-my-rewards";
import { acceptancesResource } from "./acceptances";
import { acceptanceSamplesResource } from "./acceptance-samples";
import { exportsResource } from "./exports";
import { reviewerReviewRecordsResource } from "./reviewer-review-records";

const ALL_RESOURCES: Record<string, ResourceMeta> = {
  asyncTasks: asyncTasksResource,
  auditLogs: auditLogsResource,
  dataScopes: dataScopesResource,
  dictItems: dictItemsResource,
  dictTypes: dictTypesResource,
  menus: menusResource,
  permissions: permissionsResource,
  ownerAppeals: ownerAppealsResource,
  roles: rolesResource,
  systemClients: systemClientsResource,
  users: usersResource,
  tasks: tasksResource,
  taskMembers: taskMembersResource,
  taskItems: taskItemsResource,
  assignments: assignmentsResource,
  taskAssignmentBoard: taskAssignmentBoardResource,
  assignmentSubmissionAttempts: assignmentSubmissionAttemptsResource,
  submissions: submissionsResource,
  templates: templatesResource,
  templateVersions: templateVersionsResource,
  templateFields: templateFieldsResource,
  templateLayouts: templateLayoutsResource,
  labelerMarket: labelerMarketResource,
  labelerMyDrafts: labelerMyDraftsResource,
  labelerMySubmitted: labelerMySubmittedResource,
  labelerMyTasks: labelerMyTasksResource,
  labelerTaskItems: labelerTaskItemsResource,
  scheduledTasks: scheduledTasksResource,
  llmProviders: llmProvidersResource,
  llmModels: llmModelsResource,
  dimensionPacks: dimensionPacksResource,
  templateMarket: templateMarketResource,
  templateMarketAdmin: templateMarketAdminResource,
  fileAssets: fileAssetsResource,
  rewardSettlements: rewardSettlementsResource,
  rewardSettlementDetails: rewardSettlementDetailsResource,
  labelerMyRewards: labelerMyRewardsResource,
  acceptances: acceptancesResource,
  acceptanceSamples: acceptanceSamplesResource,
  exports: exportsResource,
  reviewerReviewRecords: reviewerReviewRecordsResource,
};

import { registerDetailFieldComponent } from "@labelhub/low-code-engine";
import {
  ArrayTableDetailField,
  AuditTimelineDetailField,
  AuditTimelineGroupDetailField,
  PayloadMapDetailField,
  ShowItemDetailField,
  TemplateFormDetailField,
} from "./custom-detail-components";

/** 注册所有 LabelHub 业务资源到低代码引擎 */
export function registerLabelHubResources(): void {
  registerResources(ALL_RESOURCES);

  // 注册自定义详情字段组件
  registerDetailFieldComponent("timeline", AuditTimelineDetailField);
  registerDetailFieldComponent("timelineGroup", AuditTimelineGroupDetailField);
  registerDetailFieldComponent("payloadMap", PayloadMapDetailField);
  registerDetailFieldComponent("arrayTable", ArrayTableDetailField);
  registerDetailFieldComponent("showItem", ShowItemDetailField);
  registerDetailFieldComponent("templateForm", TemplateFormDetailField);
}

/** 注册业务特性回调（文件资产操作、AI 审核操作等） */
export function registerLabelHubHeaderActionCallbacks(
  ensureFileAssetsActionsRegistered: () => void,
  ensureOwnerAiReviewActionRegistered: () => void,
): void {
  registerHeaderActionCallback(() => {
    ensureFileAssetsActionsRegistered();
    ensureOwnerAiReviewActionRegistered();
  });
}
