package com.labelhub.core.business;

import com.labelhub.core.api.PageResponse;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class BusinessDtos {
        private BusinessDtos() {
        }

        public record TaskSummary(
                        Long id,
                        Long tenantId,
                        String taskCode,
                        String title,
                        String sceneCode,
                        String status,
                        String distributeStrategy,
                        Long ownerId,
                        String ownerName,
                        Integer quota,
                        Integer maxClaimPerUser,
                        Long currentTemplateVersionId,
                        Boolean templateReady,
                        Boolean publishReady,
                        String publishBlockReason,
                        Instant deadlineAt,
                        Instant publishedAt,
                        Instant archivedAt,
                        Instant createdAt,
                        Instant updatedAt) {
        }

        /** Low-code 任务下拉选项（审核员可访问任务子集）。 */
        public record TaskOptionRow(Long id, String title, String taskCode) {
        }

        public record TaskDetail(
                        Long id,
                        String taskCode,
                        String title,
                        String descriptionText,
                        String descriptionRich,
                        String sceneCode,
                        String status,
                        String distributeStrategy,
                        Long ownerId,
                        Integer quota,
                        Integer maxClaimPerUser,
                        /** 当前任务关联的模板主表 ID，用于跳转模板设计器 */
                        Long templateId,
                        Long currentTemplateVersionId,
                        Boolean templateReady,
                        Boolean publishReady,
                        String publishBlockReason,
                        Instant deadlineAt,
                        Map<String, Object> rewardRuleJson,
                        Map<String, Object> settingsJson,
                        Map<String, Object> tagsJson,
                        Map<String, Object> reviewWorkflowJson,
                        List<ReviewWorkflowLevelDto> reviewWorkflowLevels,
                        List<TaskMemberSummary> members,
                        Instant createdAt,
                        List<SubmissionTimelineEntry> lifecycleTimeline) {
        }

        public record TaskCreateCommand(
                        @NotBlank @Size(min = 1, max = 64) String taskCode,
                        @NotBlank @Size(min = 1, max = 128) String title,
                        @Size(max = 2048) String descriptionText,
                        @NotBlank @Size(min = 1, max = 64) String sceneCode,
                        Instant deadlineAt,
                        @Min(1) @Max(100) Integer maxClaimPerUser,
                        Map<String, Object> rewardRuleJson,
                        Map<String, Object> settingsJson,
                        Map<String, Object> reviewWorkflowJson,
                        // 不写死枚举：合法性由 DistributeStrategyRegistry 按运行时已注册策略校验，保留 SPI 扩展能力
                        @Size(max = 32) String distributeStrategy,
                        /** 可选：克隆绑定已有模板版本到新任务 */
                        @Min(1) Long templateVersionId) {
        }

        public record TaskUpdateCommand(
                        @NotBlank @Size(min = 1, max = 128) String title,
                        @Size(max = 2048) String descriptionText,
                        Instant deadlineAt,
                        Map<String, Object> rewardRuleJson,
                        Map<String, Object> settingsJson,
                        @Size(max = 32) String distributeStrategy,
                        Map<String, Object> reviewWorkflowJson,
                        List<ReviewWorkflowLevelInput> reviewWorkflowLevels) {
        }

        public record ReviewWorkflowLevelInput(
                        @NotBlank @Size(max = 16) String key,
                        @NotBlank @Size(max = 64) String label,
                        @NotEmpty List<@NotBlank @Size(max = 32) String> actions) {
        }

        public record TaskMemberSummary(
                        Long id,
                        Long taskId,
                        Long userId,
                        String userName,
                        String memberRole) {
        }

        public record AssignTaskMembersCommand(
                        @NotEmpty List<@Min(1) Long> userIds,
                        @NotBlank @Pattern(regexp = "^(LABELER|REVIEWER)$") String memberRole) {
        }

        public record TaskItemSummary(
                        Long id,
                        Long taskId,
                        String sourceItemKey,
                        String itemStatus,
                        Integer seqNo,
                        Integer currentAssignmentCount,
                        Instant createdAt,
                        Map<String, Object> payloadPreview) {
        }

        /** 分配管理题目池：task_item + 当前有效 assignment 快照 */
        public record TaskAssignmentBoardRow(
                        Long id,
                        Long taskId,
                        String sourceItemKey,
                        String itemStatus,
                        Integer seqNo,
                        Map<String, Object> payloadPreview,
                        Long assignmentId,
                        String assignmentStatus,
                        String assignType,
                        Long labelerId,
                        String labelerDisplayName,
                        Instant assignedAt,
                        Instant claimedAt,
                        Instant deadlineAt,
                        boolean assignable) {
        }

        public record TaskItemDetail(
                        Long id,
                        Long taskId,
                        String sourceItemKey,
                        String itemStatus,
                        Integer seqNo,
                        Integer currentAssignmentCount,
                        Instant createdAt,
                        Map<String, Object> payload,
                        String payloadJson) {
        }

        /** 标注员查看已分配题目：含模板 schema，供前端 templateForm display 渲染 */
        public record LabelerTaskItemDetail(
                        Long id,
                        Long taskId,
                        String sourceItemKey,
                        Integer itemSeqNo,
                        Map<String, Object> itemPayload,
                        Map<String, Object> payloadPreview,
                        String templateSchemaJson,
                        String payloadJson) {
        }

        public record ImportColumnBinding(
                        @NotBlank String key,
                        @NotBlank @Pattern(regexp = "^(?i)(display|input|ignore)$") String role) {
        }

        public record TaskImportPayloadContract(
                        Integer schemaVersion,
                        List<String> requiredKeys,
                        List<String> optionalKeys,
                        List<String> forbiddenKeys,
                        String lockedAt,
                        String source) {
        }

        public record TaskItemImportCommand(
                        @NotBlank String sourceFilename,
                        @NotEmpty List<Map<String, Object>> items,
                        @NotBlank String sourceKeyField,
                        List<ImportColumnBinding> columnBindings) {
        }

        public record TaskItemImportBatchSummary(
                        Long id,
                        Long taskId,
                        String sourceFilename,
                        String sourceFormat,
                        Integer totalRows,
                        Integer successRows,
                        Integer failedRows,
                        Integer skippedRows,
                        String importStatus,
                        Instant startedAt,
                        Instant finishedAt) {
        }

        public record TemplateVersionSummary(
                        Long id,
                        Long taskId,
                        Integer versionNo,
                        String templateName,
                        String status,
                        Instant publishedAt,
                        Instant createdAt,
                        Long templateId,
                        String descriptionText,
                        Integer isCurrent,
                        Long authorId,
                        String authorName,
                        String marketAuditStatus,
                        Instant marketPublishedAt) {
        }

        /** Owner REST 详情：schemaJson 以字符串返回，避免 Map 类型漂移 */
        public record TemplateVersionOwnerDetail(
                        Long id,
                        Long templateId,
                        Long taskId,
                        Integer versionNo,
                        String descriptionText,
                        String status,
                        Boolean isCurrent,
                        String schemaJson,
                        String reviewPromptTemplate,
                        Long authorId,
                        String authorName,
                        Instant publishedAt,
                        Instant createdAt) {
        }

        public record TemplateVersionDraftSaveCommand(
                        @NotNull String schemaJson,
                        String reviewPromptTemplate,
                        List<TemplateReviewDimensionSummary> dimensions) {
        }

        public record TemplateVersionDraftCreateCommand(
                        @NotNull @Min(1) Long templateId,
                        Long baseVersionId) {
        }

        public record TemplateVersionDetail(
                        Long id,
                        Long taskId,
                        Integer versionNo,
                        Map<String, Object> schemaJson,
                        List<TemplateVersionFieldSummary> fields,
                        TaskImportPayloadContract importContract) {
        }

        public record TemplateVersionFieldSummary(
                        Long id,
                        Long templateVersionId,
                        String fieldCode,
                        String fieldTitle,
                        String widgetType,
                        Integer sortNo,
                        Map<String, Object> enumOptionsJson,
                        Integer isRequired) {
        }

        public record TemplateSaveCommand(
                        @NotNull @Min(1) Long taskId,
                        @NotBlank String templateName,
                        @NotNull Map<String, Object> schemaJson,
                        String remark) {
        }

        public record TemplateReviewDimensionSummary(
                        Long id,
                        Long templateVersionId,
                        String dimensionKey,
                        String dimensionName,
                        String dimensionDesc,
                        BigDecimal weight,
                        BigDecimal scoreMin,
                        BigDecimal scoreMax,
                        BigDecimal passThreshold,
                        BigDecimal rejectThreshold,
                        String promptInstruction,
                        String manualReviewHint,
                        String severityLevel,
                        Integer sortNo,
                        Integer requiredFlag) {
        }

        public record TemplateReviewDimensionDetail(
                        Long id,
                        Long templateVersionId,
                        String dimensionKey,
                        String dimensionName,
                        String dimensionDesc,
                        BigDecimal weight,
                        BigDecimal scoreMin,
                        BigDecimal scoreMax,
                        BigDecimal passThreshold,
                        BigDecimal rejectThreshold,
                        String promptInstruction,
                        String manualReviewHint,
                        String severityLevel,
                        Integer sortNo,
                        Integer requiredFlag) {
        }

        public record ReviewDimensionsBatchUpdateCommand(
                        @NotNull @Min(1) Long templateVersionId,
                        @NotEmpty List<TemplateReviewDimensionSummary> dimensions) {
        }

        public record TemplateVersionDetailFull(
                        Long id,
                        Long taskId,
                        Integer versionNo,
                        String templateName,
                        String status,
                        Integer isCurrent,
                        Map<String, Object> schemaJson,
                        String schemaChecksum,
                        String reviewPromptTemplate,
                        String providerPlatformKey,
                        String modelId,
                        List<ReviewWorkflowLevelDto> reviewWorkflowLevels,
                        List<TemplateVersionFieldSummary> fields,
                        List<TemplateReviewDimensionSummary> reviewDimensions,
                        Instant publishedAt,
                        Instant createdAt) {
        }

        public record TemplateVersionCreateDraftCommand(
                        @NotNull @Min(1) Long taskId,
                        Long baseVersionId) {
        }

        public record VersionDiffResult(
                        Long v1Id,
                        Long v2Id,
                        List<Map<String, Object>> addedFields,
                        List<Map<String, Object>> removedFields,
                        List<Map<String, Object>> modifiedFields) {
        }

        public record LlmProviderSummary(
                        Long id,
                        String providerCode,
                        String providerName,
                        String baseUrl,
                        String status,
                        Integer isSystemProvider,
                        Instant createdAt,
                        String maskedApiKey) {
        }

        public record LlmModelSummary(
                        Long id,
                        Long providerId,
                        String modelCode,
                        String modelName,
                        String modelType,
                        Integer contextWindow,
                        Integer maxOutputTokens,
                        BigDecimal costPer1kInputTokens,
                        BigDecimal costPer1kOutputTokens,
                        String status,
                        Instant createdAt) {
        }

        public record TemplateReviewDimensionPackSummary(
                        Long id,
                        String packCode,
                        String packName,
                        String packDesc,
                        String sceneCode,
                        Integer isSystemPack,
                        Integer sortNo,
                        String status,
                        Instant createdAt,
                        List<Map<String, Object>> dimensions) {
        }

        public record DimensionPackSaveCommand(
                        String packName,
                        String packCode,
                        String packDesc,
                        String sceneCode,
                        Integer sortNo,
                        List<Map<String, Object>> dimensions) {
        }

        public record TemplateMarketSummary(
                        Long id,
                        String templateCode,
                        String templateName,
                        String templateDesc,
                        String sceneCode,
                        Integer downloadCount,
                        Integer favoriteCount,
                        BigDecimal ratingAvg,
                        Integer isFeatured,
                        String auditStatus,
                        String marketStatus,
                        Instant publishedAt,
                        Boolean installed,
                        Long installedTemplateId,
                        Long installedTemplateVersionId) {
        }

        public record ExportJobSummary(
                        Long id,
                        Long taskId,
                        String jobName,
                        String exportFormat,
                        String status,
                        Integer progressPercent,
                        Long totalRecordCount,
                        Instant createdAt,
                        String taskTitle) {
        }

        public record ExportJobCreateCommand(
                        @NotBlank String jobName,
                        @NotBlank @Pattern(regexp = "^(JSON|JSONL|CSV|EXCEL)$") String exportFormat,
                        @NotNull @Min(1) Long taskId,
                        /** 筛选条件对象；兼容历史字符串 JSON */
                        Object filterConditionsJson,
                        List<String> fieldMappings) {
        }

        public record TemplateDraftCreateCommand(
                        @NotNull @Min(1) Long taskId,
                        Long baseVersionId) {
        }

        public record TemplateDraftUpdateCommand(
                        @NotBlank String templateName,
                        @NotNull Map<String, Object> schemaJson) {
        }

        public record TemplateVersionDiff(
                        Long leftId,
                        Long rightId,
                        List<Map<String, Object>> addedFields,
                        List<Map<String, Object>> removedFields,
                        List<Map<String, Object>> modifiedFields) {
        }

        public record DimensionBatchUpdateCommand(
                        @NotNull @Min(1) Long templateVersionId,
                        @NotEmpty List<TemplateReviewDimensionSummary> dimensions) {
        }

        public record ApplyDimensionPackCommand(@NotNull @Min(1) Long packId) {
        }

        public record DimensionPackOptionSummary(
                        Long id,
                        String packCode,
                        String packName,
                        String packDesc) {
        }

        public record TemplateReviewConfigDetail(
                        Long templateVersionId,
                        Integer versionNo,
                        String status,
                        String reviewPromptTemplate,
                        String providerPlatformKey,
                        String modelId,
                        List<ReviewWorkflowLevelDto> reviewWorkflowLevels,
                        List<TemplateReviewDimensionSummary> dimensions) {
        }

        public record TemplateReviewConfigSaveCommand(
                        @NotNull @Min(1) Long templateVersionId,
                        String reviewPromptTemplate,
                        @Size(max = 64) String providerPlatformKey,
                        @Size(max = 128) String modelId,
                        List<ReviewWorkflowLevelInput> reviewWorkflowLevels,
                        List<TemplateReviewDimensionSummary> dimensions) {
        }

        public record TemplateReviewPromptAssistCommand(
                        @NotNull @Min(1) Long templateVersionId,
                        @Size(max = 32) String mode,
                        @Size(max = 64) String providerPlatformKey,
                        @Size(max = 128) String modelId,
                        String currentPromptTemplate,
                        List<TemplateReviewDimensionSummary> dimensions) {
        }

        public record TemplateReviewPromptAssistResult(
                        String mode,
                        String suggestedPromptTemplate,
                        String summary,
                        List<String> focusPoints,
                        Integer historyCaseCount,
                        Boolean usedHistory) {
        }

        public record RemoteLlmModelOption(
                        String modelCode,
                        String modelName,
                        String modelType) {
        }

        public record LlmCatalogModelOption(
                        Long id,
                        String modelCode,
                        String modelName,
                        String modelType,
                        String status) {
        }

        public record LlmCatalogProviderOption(
                        Long id,
                        String providerCode,
                        String providerName,
                        String status,
                        List<LlmCatalogModelOption> models) {
        }

        /** Agent 模式：LLM 输出 JSON 键到标注字段 path 的映射 */
        public record LlmApplyMapping(String sourceKey, String targetPath) {
        }

        /** 表单 llmSuggest 运行时；提示词与映射均由服务端从 schema + 业务数据组装 */
        public record LlmSuggestCommand(
                        String fieldCode,
                        Long templateVersionId,
                        Long assignmentId,
                        Long submissionId,
                        Long taskId,
                        Boolean allowRegenerate) {
        }

        /** 设计器 / 调试：预览服务端组装后的 Prompt，不调用 LLM */
        public record LlmSuggestPreviewCommand(
                        String fieldCode,
                        Long templateVersionId,
                        Long taskItemId,
                        Long assignmentId,
                        Long submissionId,
                        Long taskId) {
        }

        public record LlmSuggestPreviewResult(
                        String systemPrompt,
                        String userPrompt,
                        String mode,
                        List<LlmApplyMapping> applyMappings,
                        Integer contextFieldCount,
                        Map<String, Object> outputJsonSchema) {
        }

        public record LlmSuggestResult(
                        String text,
                        Map<String, Object> parsedOutput,
                        Long recordId,
                        List<LlmApplyMapping> applyMappings) {
        }

        public record TemplateMarketItemSummary(
                        Long id,
                        String templateCode,
                        String templateName,
                        String templateDesc,
                        String sceneCode,
                        Integer downloadCount,
                        Integer favoriteCount,
                        BigDecimal ratingAvg,
                        Integer isFeatured,
                        String auditStatus,
                        String marketStatus,
                        Instant publishedAt,
                        Boolean installed,
                        Long installedTemplateId,
                        Long installedTemplateVersionId) {
        }

        public record TemplateMarketItemDetail(
                        Long id,
                        String templateCode,
                        String templateName,
                        String templateDesc,
                        String sceneCode,
                        String publisherName,
                        String versionInfo,
                        Integer isFeatured,
                        String auditStatus,
                        String marketStatus,
                        Long sourceTaskId,
                        Long sourceTemplateVersionId,
                        Map<String, Object> schemaJson,
                        Integer downloadCount,
                        Integer favoriteCount,
                        BigDecimal ratingAvg,
                        Integer ratingCount,
                        Instant publishedAt,
                        Instant createdAt,
                        Boolean installed,
                        Long installedTemplateId,
                        Long installedTemplateVersionId) {
        }

        public record TemplateMarketPublishCommand(
                        @NotNull @Min(1) Long templateVersionId,
                        @Size(max = 2048) String description) {
        }

        public record TemplateMarketAuditCommand(
                        @NotBlank String auditResult,
                        @Size(max = 1024) String reviewComment) {
        }

        public record TemplateMarketInstallResult(
                        Long templateId,
                        Long templateVersionId,
                        String templateCode,
                        String templateName) {
        }

        public record TemplateSummary(
                        Long id,
                        Long taskId,
                        String templateCode,
                        String templateName,
                        String sceneCode,
                        String descriptionText,
                        Long currentTemplateVersionId,
                        Integer latestVersionNo,
                        String status,
                        Instant createdAt) {
        }

        public record TemplateDetail(
                        Long id,
                        Long taskId,
                        String templateCode,
                        String templateName,
                        String sceneCode,
                        String descriptionText,
                        Long currentTemplateVersionId,
                        Integer latestVersionNo,
                        String status,
                        Instant createdAt) {
        }

        public record TemplateCreateCommand(
                        @Min(1) Long taskId,
                        @NotBlank @Size(min = 1, max = 64) String templateCode,
                        @NotBlank @Size(min = 1, max = 128) String templateName,
                        @NotBlank @Size(min = 1, max = 64) String sceneCode,
                        @Size(max = 2048) String descriptionText) {
        }

        public record TemplateUpdateCommand(
                        @NotBlank @Size(min = 1, max = 128) String templateName,
                        @Size(max = 2048) String descriptionText, Long taskId) {
        }

        public record AssignmentSummary(
                        Long id,
                        Long taskId,
                        Long itemId,
                        Integer slotNo,
                        Long labelerId,
                        String labelerName,
                        String assignType,
                        String status,
                        String taskTitle,
                        String taskCode,
                        Integer itemSeqNo,
                        String sourceItemKey,
                        Map<String, Object> payloadPreview,
                        Instant assignedAt,
                        Instant claimedAt,
                        Instant deadlineAt,
                        Instant createdAt) {
        }

        public record AssignmentDetail(
                        Long id,
                        Long taskId,
                        Long itemId,
                        Integer slotNo,
                        Long labelerId,
                        String labelerName,
                        String assignType,
                        String claimSource,
                        String status,
                        Integer currentRoundNo,
                        String taskTitle,
                        String taskCode,
                        Integer itemSeqNo,
                        String sourceItemKey,
                        Map<String, Object> payloadPreview,
                        Instant assignedAt,
                        Instant claimedAt,
                        Instant deadlineAt,
                        Map<String, Object> extJson,
                        List<SubmissionTimelineEntry> lifecycleTimeline,
                        Instant createdAt) {
        }

        public record AssignmentCreateCommand(
                        @NotNull @Min(1) Long taskId,
                        @NotNull @Min(1) Long itemId,
                        @Min(1) Integer slotNo,
                        Long labelerId,
                        @NotBlank @Pattern(regexp = "^(MANUAL_ASSIGN|AUTO_CLAIM)$") String assignType,
                        Instant deadlineAt) {
        }

        /** 改配：仅允许更新标注员与截止时间 */
        public record AssignmentUpdateCommand(
                        Long labelerId,
                        Instant deadlineAt) {
        }

        public record AssignmentsBatchCreateCommand(
                        @NotNull @Min(1) Long taskId,
                        @NotEmpty List<Long> itemIds,
                        @NotNull @Min(1) Long labelerId,
                        Instant deadlineAt) {
        }

        public record AssignmentsBatchCancelCommand(
                        @NotNull @Min(1) Long taskId,
                        @NotEmpty List<Long> itemIds,
                        String reason) {
        }

        public record SubmissionSummary(
                        Long id,
                        Long assignmentId,
                        Long taskId,
                        Long itemId,
                        Long labelerId,
                        String labelerName,
                        String status,
                        Integer currentRoundNo,
                        String taskTitle,
                        String taskCode,
                        Integer itemSeqNo,
                        String sourceItemKey,
                        Map<String, Object> payloadPreview,
                        Long ownerId,
                        String ownerName,
                        String assignmentStatus,
                        String assignmentAssignType,
                        Integer assignmentSlotNo,
                        Instant assignmentClaimedAt,
                        Instant assignmentDeadlineAt,
                        Long reviewerId,
                        String reviewerName,
                        String draftPreviewText,
                        Instant draftSavedAt,
                        Instant lastSubmittedAt,
                        Boolean canWithdraw,
                        Boolean canAppeal,
                        String withdrawBlockReason,
                        String appealBlockReason,
                        Instant createdAt) {
        }

        /** Owner 查看某 assignment 下历次标注 attempt（含已归档 ABANDONED） */
        public record SubmissionAttemptSummary(
                        Long id,
                        Long assignmentId,
                        Long labelerId,
                        String labelerName,
                        String status,
                        Integer currentRoundNo,
                        Boolean isCurrent,
                        Instant supersededAt,
                        String supersededReason,
                        Integer submitCount,
                        String draftPreviewText,
                        Instant draftSavedAt,
                        Instant lastSubmittedAt,
                        Instant createdAt,
                        Instant updatedAt) {
        }

        public record SubmissionTimelineEntry(
                        String id,
                        String category,
                        String stage,
                        String label,
                        String detail,
                        Instant occurredAt,
                        String tone) {
        }

        public record SubmissionRecordSubmitHistory(
                        Long assignmentId,
                        Long submissionId,
                        Integer itemSeqNo,
                        String sourceItemKey,
                        String recordTitle,
                        List<SubmissionTimelineEntry> entries) {
        }

        public record SubmissionDetail(
                        Long id,
                        Long assignmentId,
                        Long taskId,
                        Long itemId,
                        Long labelerId,
                        String labelerName,
                        String currentStatus,
                        Integer currentRoundNo,
                        String taskTitle,
                        String taskCode,
                        Integer itemSeqNo,
                        String sourceItemKey,
                        Map<String, Object> payloadPreview,
                        Long ownerId,
                        String ownerName,
                        String assignmentStatus,
                        String assignmentAssignType,
                        Integer assignmentSlotNo,
                        Instant assignmentClaimedAt,
                        Instant assignmentDeadlineAt,
                        Long reviewerId,
                        String reviewerName,
                        String draftPreviewText,
                        String templateSchemaJson,
                        Map<String, Object> draftData,
                        Instant draftSavedAt,
                        Integer submitCount,
                        Instant lastSubmittedAt,
                        Boolean canWithdraw,
                        Boolean canAppeal,
                        String withdrawBlockReason,
                        String appealBlockReason,
                        Map<String, Object> extJson,
                        List<SubmissionTimelineEntry> submitHistory,
                        List<SubmissionTimelineEntry> lifecycleTimeline,
                        Instant createdAt) {
        }

        public record SubmissionDraftSaveCommand(
                        @NotNull Map<String, Object> draftData,
                        Boolean autoSave) {
        }

        public record SubmissionSubmitCommand(
                        @NotNull Map<String, Object> finalSubmitData,
                        String comment) {
        }

        public record SubmissionAppealCommand(
                        @NotBlank @Size(min = 1, max = 1000) String reasonText) {
        }

        public record SubmissionAppealDecisionCommand(
                        @NotBlank @Pattern(regexp = "^(APPROVE|REJECT)$") String decision,
                        @Size(max = 1000) String decisionReasonText) {
        }

        public record SubmissionAppealBatchCommand(
                        @NotEmpty List<@Min(1) Long> ids,
                        @Size(max = 1000) String reasonText) {
        }

        public record SubmissionAppealSummary(
                        Long id,
                        Long submissionId,
                        String submissionDisplayLabel,
                        Long assignmentId,
                        Long taskId,
                        String taskTitle,
                        Long itemId,
                        Integer itemSeqNo,
                        String sourceItemKey,
                        Map<String, Object> payloadPreview,
                        String draftPreviewText,
                        Integer currentRoundNo,
                        Long labelerId,
                        String labelerName,
                        Long ownerId,
                        String ownerName,
                        String submissionStatus,
                        Integer appealNo,
                        String status,
                        String reasonText,
                        String decisionReasonText,
                        Long decidedBy,
                        Instant decidedAt,
                        Instant createdAt) {
        }

        public record SubmissionAppealDetail(
                        Long id,
                        Long submissionId,
                        String submissionDisplayLabel,
                        Long assignmentId,
                        Long taskId,
                        String taskTitle,
                        Long itemId,
                        Integer itemSeqNo,
                        String sourceItemKey,
                        Map<String, Object> payloadPreview,
                        String draftPreviewText,
                        Integer currentRoundNo,
                        Long labelerId,
                        String labelerName,
                        Long ownerId,
                        String ownerName,
                        String submissionStatus,
                        Integer appealNo,
                        String status,
                        String reasonText,
                        String decisionReasonText,
                        Long decidedBy,
                        Instant decidedAt,
                        Instant createdAt,
                        String templateSchemaJson,
                        Map<String, Object> draftData,
                        Map<String, Object> itemPayload,
                        String payloadJson) {
        }

        public record SubmissionAppealBatchOperationSummary(
                        Long id,
                        String batchKey,
                        Long taskId,
                        Long operatorId,
                        String batchAction,
                        Integer targetTotalCount,
                        Integer successCount,
                        Integer failedCount,
                        String status,
                        Instant startedAt,
                        Instant finishedAt,
                        String failureSummaryJson,
                        Instant createdAt) {
        }

        public record LabelerMarketTaskSummary(
                        Long taskId,
                        String taskCode,
                        String taskName,
                        String sceneCode,
                        String descriptionText,
                        String status,
                        Integer remainingItems,
                        Integer claimedItems,
                        Boolean templateReady,
                        Boolean canClaim,
                        String blockReason,
                        Instant deadlineAt,
                        Instant publishedAt) {
        }

        public record LabelerClaimResult(
                        Long taskId,
                        Long assignmentId,
                        Long submissionId,
                        String assignmentStatus,
                        String submissionStatus) {
        }

        public record LabelerClaimBatchItem(
                        Long assignmentId,
                        Long submissionId,
                        Long itemId,
                        Integer seqNo,
                        String assignmentStatus,
                        String submissionStatus) {
        }

        public record LabelerClaimBatchResult(
                        Long taskId,
                        Integer requestedCount,
                        Integer claimedCount,
                        Integer alreadyOpenCount,
                        Integer maxClaimPerUser,
                        Boolean partialFulfilled,
                        String partialReason,
                        Long entryAssignmentId,
                        Long entrySubmissionId,
                        List<LabelerClaimBatchItem> items) {
        }

        public record LabelerMyTaskRow(
                        Long taskId,
                        String taskCode,
                        String taskName,
                        String sceneCode,
                        String descriptionText,
                        Integer totalCount,
                        Integer openCount,
                        Integer submittedCount,
                        Integer submittedEverCount,
                        Integer approvedCount,
                        Integer rejectedCount,
                        Integer needsRevisionCount,
                        Long nextAssignmentId,
                        Instant lastClaimedAt,
                        Instant lastActivityAt,
                        Instant deadlineAt) {
        }

        public record LabelerMyTaskDetail(
                        Long taskId,
                        String taskCode,
                        String taskName,
                        String sceneCode,
                        String descriptionText,
                        Long ownerId,
                        String ownerName,
                        Integer totalCount,
                        Integer openCount,
                        Integer submittedCount,
                        Integer submittedEverCount,
                        Integer approvedCount,
                        Integer rejectedCount,
                        Integer needsRevisionCount,
                        Long nextAssignmentId,
                        Instant lastClaimedAt,
                        Instant lastActivityAt,
                        Instant deadlineAt,
                        List<SubmissionRecordSubmitHistory> recordSubmitHistories) {
        }

        public record LabelerMyWorkRow(
                        Long assignmentId,
                        Long submissionId,
                        Long taskId,
                        String taskName,
                        String sceneCode,
                        Long itemId,
                        Integer seqNo,
                        String assignmentStatus,
                        String submissionStatus,
                        Instant claimedAt,
                        Instant draftSavedAt,
                        Instant lastSubmittedAt,
                        Instant deadlineAt) {
        }

        public record LabelerWorkTaskInfo(Long taskId, String taskName, String sceneCode, String descriptionText) {
        }

        public record LabelerWorkItemInfo(Long itemId, Integer seqNo, Map<String, Object> payload) {
        }

        public record LabelerWorkTemplateInfo(Long templateVersionId, Integer versionNo, String schemaJson) {
        }

        public record LabelerLastReviewInfo(String comment, Instant reviewedAt, String reviewerName) {
        }

        public record LabelerWorkDetail(
                        AssignmentSummary assignment,
                        SubmissionDetail submission,
                        LabelerWorkTaskInfo task,
                        LabelerWorkItemInfo taskItem,
                        LabelerWorkTemplateInfo templateVersion,
                        LabelerLastReviewInfo lastReview) {
        }

        public record LabelerWorkSessionTaskMeta(
                        Long taskId,
                        String taskName,
                        String sceneCode,
                        String descriptionText,
                        Integer maxClaimPerUser,
                        Long templateVersionId,
                        Integer templateVersionNo) {
        }

        public record LabelerWorkSession(
                        PageResponse<LabelerMyWorkRow> queue,
                        java.util.Map<Long, LabelerWorkDetail> works,
                        LabelerWorkSessionTaskMeta taskMeta) {
        }

        public record ReviewerAiReviewDimensionSnapshot(
                        String dimensionKey,
                        String dimensionName,
                        Double score,
                        Double maxScore,
                        Double weight,
                        String verdict,
                        String comment) {
        }

        public record ReviewerAiReviewScoreCalibrationSnapshot(
                        String dimensionKey,
                        String dimensionName,
                        Integer rawScore,
                        Integer calibratedScore,
                        Double anchor,
                        Double tolerance) {
        }

        public record ReviewerAiReviewSnapshot(
                        Long aiReviewId,
                        String platformKey,
                        String modelId,
                        String verdict,
                        Double totalScore,
                        String summary,
                        String promptTemplate,
                        String rawResponseText,
                        Instant analyzedAt,
                        List<ReviewerAiReviewDimensionSnapshot> dimensions,
                        List<ReviewerAiReviewScoreCalibrationSnapshot> scoreCalibrations) {
        }

        public record ReviewerTimelineEntry(
                        String id,
                        String stage,
                        String label,
                        String detail,
                        Instant timestamp,
                        String tone) {
        }

        /** 单条人工审核记录（review_records），供工作台时间线与历史侧栏 */
        public record ReviewerReviewRecordRow(
                        Long id,
                        String reviewLevel,
                        String reviewLevelLabel,
                        Integer reviewStageNo,
                        String action,
                        String fromStatus,
                        String toStatus,
                        String commentText,
                        String reviewerName,
                        Instant decidedAt,
                        boolean isFinalDecision,
                        String nextReviewLevel) {
        }

        /** 审核结果列表行 */
        public record ReviewerReviewRecordListRow(
                        Long id,
                        Long submissionId,
                        String submissionCode,
                        String title,
                        Long taskId,
                        String taskName,
                        Long labelerId,
                        String labelerName,
                        String reviewLevel,
                        String reviewLevelLabel,
                        Integer reviewStageNo,
                        String action,
                        String fromStatus,
                        String toStatus,
                        String commentText,
                        Long reviewerId,
                        String reviewerName,
                        Instant decidedAt,
                        boolean isFinalDecision) {
        }

        /** 审核结果详情：在列表行基础上附带题目与提交快照，供详情抽屉渲染模板表单 */
        public record ReviewerReviewRecordDetail(
                        Long id,
                        Long submissionId,
                        String submissionCode,
                        String title,
                        Long taskId,
                        String taskName,
                        Long labelerId,
                        String labelerName,
                        String reviewLevel,
                        String reviewLevelLabel,
                        Integer reviewStageNo,
                        String action,
                        String fromStatus,
                        String toStatus,
                        String commentText,
                        Long reviewerId,
                        String reviewerName,
                        Instant decidedAt,
                        boolean isFinalDecision,
                        Long itemId,
                        Integer itemSeqNo,
                        String sourceItemKey,
                        Map<String, Object> payloadPreview,
                        String draftPreviewText,
                        Integer currentRoundNo,
                        String templateSchemaJson,
                        Map<String, Object> draftData,
                        Map<String, Object> itemPayload,
                        List<SubmissionTimelineEntry> lifecycleTimeline) {
        }

        public record AiQueueStatsSummary(
                        Double throughputPerSecond,
                        Double averageLatencySeconds,
                        Double duplicateRatePercent,
                        String taskName) {
        }

        public record AiQueueStatusCounts(
                        long all,
                        long pending,
                        long passed,
                        long returned,
                        long manual,
                        long failed) {
        }

        public record ReviewerQueueRow(
                        Long submissionId,
                        String submissionCode,
                        String title,
                        String labelerName,
                        Instant submittedAt,
                        String submissionStatus,
                        String queueStatus,
                        Double overallScore,
                        String aiVerdict,
                        Long taskId,
                        String taskName,
                        Long labelerId,
                        Long itemId,
                        Integer itemSeqNo,
                        String currentReviewLevel,
                        String reviewStageLabel) {
        }

        public record ReviewWorkflowLevelDto(
                        String key,
                        String label,
                        int stageNo,
                        boolean isFinal,
                        List<String> actions) {
        }

        public record AuditPoolLevelCount(
                        String levelKey,
                        String levelLabel,
                        int stageNo,
                        boolean isFinal,
                        long pendingCount) {
        }

        public record AuditPoolMetaSummary(List<AuditPoolLevelCount> levels) {
        }

        /** 人工审核池侧栏：按 task / labeler / item 聚合后的分页分组 */
        public record AuditPoolGroupRow(
                        String groupBy,
                        Long scopeId,
                        String scopeLabel,
                        String scopeSubtitle,
                        long submissionCount,
                        Instant lastActivityAt) {
        }

        public record ReviewerSubmissionDetail(
                        Long submissionId,
                        String submissionCode,
                        String title,
                        String labelerName,
                        Instant submittedAt,
                        String submissionStatus,
                        String queueStatus,
                        Long taskId,
                        String taskName,
                        Long itemId,
                        Integer itemSeqNo,
                        Map<String, Object> itemPayload,
                        Long templateVersionId,
                        Integer templateVersionNo,
                        String templateSchemaJson,
                        Map<String, Object> submitData,
                        String lastReviewComment,
                        Instant lastReviewedAt,
                        String lastReviewerName,
                        Map<String, Object> previousSubmitData,
                        List<SubmissionFieldDiff> submitDataDiff,
                        String currentReviewLevel,
                        String nextReviewLevel,
                        Integer reviewStageNo,
                        String reviewStageLabel,
                        boolean isFinalReviewLevel,
                        List<ReviewWorkflowLevelDto> reviewWorkflowLevels,
                        ReviewerAiReviewSnapshot aiReview,
                        List<ReviewerTimelineEntry> timeline) {
        }

        public record SubmissionFieldDiff(
                        String field,
                        String changeType,
                        Object oldValue,
                        Object newValue) {
        }

        public record ReviewerDecisionCommand(@NotBlank @Size(max = 1024) String commentText) {
        }

        public record ReviewerAiQueueAdvanceCommand(
                        @NotBlank @Pattern(regexp = "^(pass|reject|manual)$") String action,
                        @Size(max = 1024) String commentText) {
        }

        public record ReviewerBatchDecisionCommand(
                        @NotBlank @Pattern(regexp = "^(approve|reject|return)$") String action,
                        @NotEmpty List<Long> submissionIds,
                        @NotBlank @Size(max = 1024) String commentText,
                        @NotBlank String reviewLevel) {
        }

        public record ReviewerBatchSubmitResult(
                        String batchKey,
                        int targetTotal,
                        String status) {
        }

        public record ReviewBatchOperationRow(
                        Long id,
                        String batchKey,
                        String batchAction,
                        int targetTotalCount,
                        int successCount,
                        int failedCount,
                        String status,
                        Instant createdAt,
                        Instant finishedAt) {
        }

        public record ExportJobDownload(
                        String fileName,
                        String contentType,
                        byte[] content) {
        }

        public record TaskStatsOverview(
                        Long taskId,
                        long itemTotalCount,
                        long availableCount,
                        long claimedCount,
                        long inProgressCount,
                        long submittedCount,
                        long aiReviewingCount,
                        long aiRejectedCount,
                        long humanReviewingCount,
                        long needsRevisionCount,
                        long approvedCount,
                        long rejectedCount,
                        long exportableCount,
                        long activeLabelerCount,
                        double approvalRate,
                        Instant refreshedAt) {
        }

        public record PlatformStatsOverview(
                        long totalTasks,
                        long publishedTasks,
                        long draftTasks,
                        long archivedTasks,
                        long totalSubmissions,
                        long approvedSubmissions,
                        long pendingReviewCount,
                        long totalUsers) {
        }

        public record AiReviewObservabilityDashboardSummary(
                        long queuePending,
                        long queueRunning,
                        long reviewsLastHour,
                        long reviewsLast24Hours,
                        long failedLast24Hours,
                        double failureRateLast24Hours,
                        double avgLatencyMsLast24Hours,
                        long totalTokensLast24Hours,
                        long attentionCount) {
        }

        public record AdminDashboardOverview(
                        PlatformStatsOverview platform,
                        long aiTaskTotal,
                        long aiTaskSuccess,
                        long aiTaskFailed,
                        long aiTaskRunning,
                        long reviewerManualCount,
                        AiReviewObservabilityDashboardSummary aiObservability) {
        }

        public record AdminDashboardUserGrowthPoint(
                        String statDate,
                        long newUserCount,
                        long cumulativeUserCount) {
        }

        public record AdminDashboardTaskStatusBucket(
                        String status,
                        long count) {
        }

        public record AdminDashboardSubmissionFunnelBucket(
                        String stage,
                        long count) {
        }

        public record AdminDashboardRoleShareBucket(
                        String roleCode,
                        String roleName,
                        long userCount) {
        }

        public record AdminDashboardAnalytics(
                        double approvalRate,
                        List<AdminDashboardUserGrowthPoint> userGrowthTrend,
                        List<AdminDashboardTaskStatusBucket> taskStatusDistribution,
                        List<AdminDashboardSubmissionFunnelBucket> submissionFunnel,
                        List<AdminDashboardRoleShareBucket> roleDistribution) {
        }

        public record OwnerDashboardOverview(
                        long submissionTotal,
                        long reviewInFlight,
                        long approvedTotal,
                        long acceptanceOpen,
                        long exportOpen,
                        long settlementOpen,
                        AiReviewObservabilityDashboardSummary aiObservability) {
        }

        public record OwnerDashboardTrendPoint(
                        String statDate,
                        long submittedCount,
                        long approvedCount,
                        long needsRevisionCount,
                        double avgAiScore) {
        }

        public record OwnerDashboardStatusBucket(
                        String status,
                        long count) {
        }

        public record OwnerDashboardLabelerEfficiency(
                        Long userId,
                        String labelerName,
                        long submitCount,
                        double qualityScore) {
        }

        public record OwnerDashboardAnalytics(
                        long taskCount,
                        long activeLabelerCount,
                        double approvalRate,
                        double avgAiScore,
                        List<OwnerDashboardTrendPoint> submissionTrend,
                        List<OwnerDashboardStatusBucket> statusDistribution,
                        List<OwnerDashboardLabelerEfficiency> labelerEfficiency) {
        }

        public record LabelerDashboardOverview(
                        long taskCount,
                        long openCount,
                        long pendingReviewCount,
                        long submittedEverCount,
                        long approvedCount,
                        long needsRevisionCount,
                        long draftCount,
                        long rewardCount,
                        long paidRewardCount,
                        double rewardAmountTotal) {
        }

        public record LabelerDashboardTrendPoint(
                        String statDate,
                        long submittedCount,
                        long approvedCount,
                        long needsRevisionCount,
                        double qualityScore,
                        double platformQualityBaseline) {
        }

        public record LabelerDashboardResultBucket(
                        String status,
                        long count) {
        }

        public record LabelerDashboardTaskParticipation(
                        Long taskId,
                        String taskName,
                        long openCount,
                        long submittedEverCount,
                        long approvedCount,
                        long needsRevisionCount,
                        Instant deadlineAt) {
        }

        public record LabelerDashboardAnalytics(
                        long todaySubmittedCount,
                        long activeTaskCount,
                        double avgQualityScore,
                        double rewardAmountTotal,
                        List<LabelerDashboardTrendPoint> submissionTrend,
                        List<LabelerDashboardResultBucket> resultDistribution,
                        List<LabelerDashboardTaskParticipation> taskParticipation) {
        }

        public record ReviewerDashboardOverview(
                        long queueTotal,
                        long pendingCount,
                        long manualCount,
                        long failedCount,
                        long auditPoolPendingCount,
                        long reviewRecordTotal) {
        }

        public record ReviewerDashboardTrendPoint(
                        String statDate,
                        long approvedCount,
                        long rejectedCount,
                        long returnedCount,
                        double avgReviewLatencyMinutes) {
        }

        public record ReviewerDashboardDecisionBucket(
                        String decision,
                        long count) {
        }

        public record ReviewerDashboardComparisonBucket(
                        String scopeLabel,
                        long personalCount,
                        double teamAverageCount) {
        }

        public record ReviewerDashboardAnalytics(
                        long todayReviewedCount,
                        double approvalRate,
                        double avgReviewLatencyMinutes,
                        List<ReviewerDashboardTrendPoint> reviewTrend,
                        List<ReviewerDashboardDecisionBucket> decisionDistribution,
                        List<ReviewerDashboardComparisonBucket> personalVsTeam) {
        }

        public record DailyStatsBackfillResult(
                        String fromDate,
                        String toDate,
                        int taskDailyRows,
                        int userDailyRows) {
        }

        public record QuotaReleaseCommand(
                        @NotNull @Min(1) Integer releaseCount,
                        @Size(max = 512) String remark) {
        }

        public record QuotaReleaseBatchSummary(
                        Long id,
                        Long taskId,
                        String batchNo,
                        Integer releaseCount,
                        Long releasedBy,
                        Instant releasedAt,
                        String status,
                        String remark,
                        Long stockRemaining) {
        }

        public record RewardBatchSummary(
                        Long id,
                        Long taskId,
                        String taskTitle,
                        String batchNo,
                        String status,
                        String settleScope,
                        String currencyCode,
                        String rewardRuleSnapshotJson,
                        Integer targetTotalCount,
                        Integer effectiveTotalCount,
                        Integer userTotalCount,
                        BigDecimal totalAmount,
                        Long confirmedBy,
                        String confirmedByName,
                        Instant confirmedAt,
                        Instant paidAt,
                        Instant reversedAt,
                        Long exportFileId,
                        String exportFileName,
                        String exportFileDownloadUrl,
                        String remark,
                        Instant createdAt) {
        }

        public record RewardDetailRow(
                        Long id,
                        Long batchId,
                        Long taskId,
                        String taskTitle,
                        String batchNo,
                        String batchStatus,
                        Long userId,
                        String labelerDisplayName,
                        Long submissionId,
                        Long submissionVersionId,
                        Long assignmentId,
                        String currencyCode,
                        BigDecimal amount,
                        BigDecimal qualityScore,
                        String status,
                        String rewardReason,
                        String rewardRuleSnapshotJson,
                        String calcBasisJson,
                        String calcBasisTaskTitle,
                        String calcBasisSubmissionLabel,
                        String calcBasisSubmissionVersionLabel,
                        String calcBasisAssignmentLabel,
                        Instant effectiveAt,
                        Instant settledAt,
                        Instant reversedAt,
                        Instant batchConfirmedAt,
                        Instant batchPaidAt,
                        Instant createdAt) {
        }

        public record AcceptanceSummary(
                        Long id,
                        Long taskId,
                        String acceptanceType,
                        String status,
                        Integer sampleTotalCount,
                        Integer sampledCount,
                        Integer passCount,
                        Integer failedCount,
                        String commentText,
                        Instant confirmedAt,
                        Instant createdAt,
                        String taskTitle) {
        }

        public record AcceptanceCreateCommand(
                        @NotNull @Min(1) Long taskId,
                        @Pattern(regexp = "^(RATIO|FIXED)$") String sampleMode,
                        @NotNull java.math.BigDecimal sampleValue) {
        }

        public record AcceptanceSampleRow(
                        Long id,
                        Long acceptanceId,
                        Long taskId,
                        Long submissionId,
                        Long submissionVersionId,
                        Long labelerId,
                        String sampleSource,
                        String sampleStatus,
                        String ownerDecision,
                        String ownerCommentText,
                        Instant checkedAt,
                        Long itemId,
                        Long assignmentId,
                        String sourceItemKey,
                        Integer itemSeqNo,
                        Map<String, Object> payloadPreview,
                        Map<String, Object> itemPayload,
                        String labelerName,
                        String submissionStatus,
                        Integer currentRoundNo,
                        String submitPreviewText,
                        Map<String, Object> submitData,
                        String templateSchemaJson) {
        }

        public record AcceptanceSampleDecisionCommand(
                        @NotBlank @Pattern(regexp = "^(PASS|FAIL)$") String decision,
                        @Size(max = 2048) String comment) {
        }

        /** 协作用户卡片：仅包含当前登录用户可见范围内的字段 */
        public record CollaboratorProfile(
                        Long userId,
                        String username,
                        String displayName,
                        String email,
                        String phone,
                        List<String> roleCodes,
                        List<String> roleNames) {
        }
}
