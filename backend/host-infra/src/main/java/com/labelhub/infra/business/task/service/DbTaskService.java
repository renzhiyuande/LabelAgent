package com.labelhub.infra.business.task.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.labelhub.infra.business.AbstractDbService;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.util.DigestUtil;
import com.labelhub.core.audit.Audit;
import com.labelhub.core.audit.AuditSnapshotSource;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.*;
import com.labelhub.core.business.TaskService;
import com.labelhub.core.business.VersionDiffService;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.infra.business.display.TaskPayloadPreviewSupport;
import com.labelhub.infra.business.display.assembler.SubmissionTimelineAssembler;
import com.labelhub.infra.business.review.support.ReviewWorkflowLevel;
import com.labelhub.infra.business.review.support.ReviewWorkflowResolver;
import com.labelhub.infra.business.review.support.ReviewWorkflowValidator;
import com.labelhub.infra.business.task.support.TaskImportPayloadContractSupport;
import com.labelhub.infra.business.task.support.TaskItemImportDedupeSupport;
import com.labelhub.infra.business.task.support.TaskTemplateCloneSupport;
import com.labelhub.infra.lowcode.query.MybatisQueryApplier;
import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.lowcode.query.spec.TaskItemQuerySpec;
import com.labelhub.infra.lowcode.query.spec.TaskQuerySpec;
import com.labelhub.infra.persistence.entity.*;
import com.labelhub.infra.persistence.mapper.*;
import com.labelhub.core.statemachine.StateMachineEngine;
import com.labelhub.infra.statemachine.AssignmentStatus;
import com.labelhub.infra.statemachine.TaskEvent;
import com.labelhub.infra.statemachine.TaskStateMachineFactory;
import com.labelhub.infra.statemachine.TaskStatus;
import com.labelhub.infra.system.CurrentUserContext;
import com.labelhub.infra.system.UserDisplayNameResolver;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import java.util.Locale;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 任务服务实现类
 * 
 * <p>
 * 负责任务的创建、更新、发布、暂停、删除，以及任务项的导入、管理等核心业务逻辑。
 * 集成状态机控制任务生命周期，支持模板版本管理和任务发布就绪检查。
 */
@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbTaskService extends AbstractDbService<TaskEntity> implements TaskService {
    private static final ResourceQuerySpec<TaskEntity> QUERY_SPEC = TaskQuerySpec.build();
    private static final ResourceQuerySpec<TaskItemEntity> TASK_ITEM_QUERY_SPEC = TaskItemQuerySpec.build();
    private static final StateMachineEngine<TaskStatus, TaskEvent> TASK_MACHINE = TaskStateMachineFactory
            .createTaskMachine();

    private final TaskMapper taskMapper;
    private final TaskItemMapper taskItemMapper;
    private final AssignmentMapper assignmentMapper;
    private final TaskItemImportBatchMapper taskItemImportBatchMapper;
    private final TemplateVersionMapper templateVersionMapper;
    private final TemplateVersionFieldMapper templateVersionFieldMapper;
    private final com.labelhub.infra.persistence.mapper.TemplatesMapper templatesMapper;
    private final TemplateReviewDimensionMapper templateReviewDimensionMapper;
    private final CurrentUserContext currentUserContext;
    private final ObjectMapper objectMapper;
    private final MybatisQueryApplier queryApplier;
    private final com.labelhub.infra.business.distribute.DistributeStrategyRegistry distributeStrategyRegistry;
    private final UserDisplayNameResolver userDisplayNameResolver;
    private final SubmissionTimelineAssembler submissionTimelineAssembler;
    private final ReviewWorkflowResolver reviewWorkflowResolver;
    private final ReviewWorkflowValidator reviewWorkflowValidator;
    private final TaskTemplateCloneSupport taskTemplateCloneSupport;

    public DbTaskService(
            TaskMapper taskMapper,
            TaskItemMapper taskItemMapper,
            AssignmentMapper assignmentMapper,
            TaskItemImportBatchMapper taskItemImportBatchMapper,
            TemplateVersionMapper templateVersionMapper,
            TemplateVersionFieldMapper templateVersionFieldMapper,
            com.labelhub.infra.persistence.mapper.TemplatesMapper templatesMapper,
            TemplateReviewDimensionMapper templateReviewDimensionMapper,
            CurrentUserContext currentUserContext,
            ObjectMapper objectMapper,
            MybatisQueryApplier queryApplier,
            com.labelhub.infra.business.distribute.DistributeStrategyRegistry distributeStrategyRegistry,
            UserDisplayNameResolver userDisplayNameResolver,
            SubmissionTimelineAssembler submissionTimelineAssembler,
            ReviewWorkflowResolver reviewWorkflowResolver,
            ReviewWorkflowValidator reviewWorkflowValidator,
            TaskTemplateCloneSupport taskTemplateCloneSupport) {
        this.taskMapper = taskMapper;
        this.taskItemMapper = taskItemMapper;
        this.assignmentMapper = assignmentMapper;
        this.taskItemImportBatchMapper = taskItemImportBatchMapper;
        this.templateVersionMapper = templateVersionMapper;
        this.templateVersionFieldMapper = templateVersionFieldMapper;
        this.templatesMapper = templatesMapper;
        this.templateReviewDimensionMapper = templateReviewDimensionMapper;
        this.currentUserContext = currentUserContext;
        this.objectMapper = objectMapper;
        this.queryApplier = queryApplier;
        this.distributeStrategyRegistry = distributeStrategyRegistry;
        this.userDisplayNameResolver = userDisplayNameResolver;
        this.submissionTimelineAssembler = submissionTimelineAssembler;
        this.reviewWorkflowResolver = reviewWorkflowResolver;
        this.reviewWorkflowValidator = reviewWorkflowValidator;
        this.taskTemplateCloneSupport = taskTemplateCloneSupport;
    }

    /**
     * 分页查询任务列表（简化版）
     * 
     * @param page     页码（从0开始）
     * @param pageSize 每页大小
     * @param keyword  搜索关键词（匹配标题或描述）
     * @return 任务摘要分页结果
     */
    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public PageResponse<TaskSummary> listTasks(int page, int pageSize, String keyword) {
        return listTasks(new ParsedListQuery(page, pageSize, keyword, List.of(), List.of()));
    }

    /**
     * 分页查询任务列表（完整版）
     * 
     * <p>
     * 支持复杂查询条件，包括过滤、排序和关键词搜索。
     * 默认按创建时间降序排列。
     * 
     * @param query 解析后的查询条件
     * @return 任务摘要分页结果
     */
    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    @com.labelhub.core.datapermission.DataScope(resource = com.labelhub.core.datapermission.DataResourceType.TASK)
    public PageResponse<TaskSummary> listTasks(ParsedListQuery query) {
        return pageQuery(
                wrapper -> taskMapper.selectPage(new Page<>(query.page(), query.pageSize()), wrapper),
                this::toSummary,
                query.page(),
                query.pageSize(),
                wrapper -> {
                    com.labelhub.infra.datapermission.DataScopeApplier.apply(wrapper);
                    if (query.keyword() != null && !query.keyword().isBlank()) {
                        wrapper.and(w -> w.like(TaskEntity::getTitle, query.keyword())
                                .or().like(TaskEntity::getDescriptionText, query.keyword()));
                    }
                    queryApplier.apply(wrapper, query, QUERY_SPEC);
                    if (query.sort().isEmpty()) {
                        wrapper.orderByDesc(TaskEntity::getCreatedAt);
                    }
                });
    }

    /**
     * 获取任务详情
     * 
     * <p>
     * 返回任务的完整信息，包括发布就绪状态和模板就绪状态。
     * 
     * @param taskId 任务ID
     * @return 任务详情
     * @throws BusinessException 当任务不存在或已删除时抛出
     */
    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public TaskDetail getTaskDetail(Long taskId) {
        TaskEntity entity = requireNotDeleted(taskMapper.selectById(taskId), ErrorCode.TASK_NOT_FOUND);
        // 检查模板是否就绪
        boolean templateReady = isTemplateReady(entity);
        // 解析发布就绪状态
        PublishReadiness readiness = resolvePublishReadiness(entity, templateReady);
        return new TaskDetail(entity.getId(), entity.getTaskCode(), entity.getTitle(),
                entity.getDescriptionText(), entity.getDescriptionRich(), entity.getSceneCode(),
                entity.getStatus(), entity.getDistributeStrategy(), entity.getOwnerId(),
                entity.getQuota(), entity.getMaxClaimPerUser(), resolveTemplateIdForTask(entity),
                entity.getCurrentTemplateVersionId(), templateReady,
                readiness.publishReady(), readiness.blockReason(), entity.getDeadlineAt(),
                parseOptionalJsonMap(entity.getRewardRuleJson()), parseOptionalJsonMap(entity.getSettingsJson()),
                parseOptionalJsonMap(entity.getTagsJson()),
                parseReviewWorkflowJsonMap(entity.getReviewWorkflowJson()),
                toReviewWorkflowLevelDtos(entity.getReviewWorkflowJson()),
                java.util.List.<TaskMemberSummary>of(), entity.getCreatedAt(),
                submissionTimelineAssembler.buildTaskWorkflowTimeline(taskId));
    }

    /**
     * 创建任务
     * 
     * <p>
     * 创建一个新的任务，初始状态为DRAFT。任务编号自动生成（TASK-前缀+8位UUID），
     * 分配策略默认为FIRST_COME（先到先得）。
     * 
     * @param command 创建命令，包含任务标题、描述、场景代码、截止时间等
     * @return 创建后的任务摘要
     */
    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:create" })
    @Audit(entityType = "TASK", actionCode = "task.create", entityId = "#result.id()", after = AuditSnapshotSource.RESULT)
    public TaskSummary createTask(TaskCreateCommand command) {
        String taskCode = resolveTaskCodeForCreate(command.taskCode());
        assertTaskCodeAvailable(taskCode);

        TaskEntity entity = new TaskEntity();
        entity.setTaskCode(taskCode);
        entity.setTitle(command.title());
        entity.setDescriptionText(command.descriptionText());
        // 场景代码：默认GENERAL
        entity.setSceneCode(command.sceneCode() != null ? command.sceneCode() : "GENERAL");
        entity.setStatus("DRAFT");
        entity.setDistributeStrategy(resolveStrategy(command.distributeStrategy()));
        entity.setOwnerId(currentUserContext.userIdOrZero());
        entity.setDeadlineAt(command.deadlineAt());
        entity.setRewardRuleJson(serializeRewardRule(command.rewardRuleJson()));
        entity.setSettingsJson(serializeTaskSettings(command.settingsJson()));
        entity.setReviewWorkflowJson(serializeReviewWorkflow(command.reviewWorkflowJson()));
        // 每人最大领取数：默认1
        entity.setMaxClaimPerUser(command.maxClaimPerUser() == null ? 1 : command.maxClaimPerUser());
        entity.setQuota(0);
        entity.setAcceptanceRequiredFlag(1);
        entity.setAcceptanceStatus("PENDING");
        entity.setRewardSettlementStatus("DRAFT");
        entity.setVersionNo(1);
        entity.setCreatedAt(Instant.now());
        entity.setUpdatedAt(Instant.now());
        taskMapper.insert(entity);

        if (command.templateVersionId() != null) {
            Long clonedVersionId = taskTemplateCloneSupport.cloneTemplateVersionToTask(entity, command.templateVersionId());
            entity.setCurrentTemplateVersionId(clonedVersionId);
            persistImportPayloadContractFromTemplateIfAbsent(entity, clonedVersionId);
            syncTaskReviewWorkflowFromTemplate(entity, clonedVersionId);
            entity.setUpdatedAt(Instant.now());
            taskMapper.updateById(entity);
        }

        return toSummary(entity);
    }

    /**
     * 更新任务
     * 
     * <p>
     * 仅允许更新DRAFT状态的任务，主要更新标题、描述和截止时间。
     * 
     * @param taskId  任务ID
     * @param command 更新命令
     * @return 更新后的任务摘要
     * @throws BusinessException 当任务不存在或非DRAFT状态时抛出
     */
    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:update" })
    @Audit(entityType = "TASK", actionCode = "task.update", entityId = "#taskId")
    public TaskSummary updateTask(Long taskId, TaskUpdateCommand command) {
        TaskEntity entity = requireNotDeleted(taskMapper.selectById(taskId), ErrorCode.TASK_NOT_FOUND);
        // 仅允许编辑DRAFT状态的任务
        if (!"DRAFT".equals(entity.getStatus())) {
            throw new BusinessException(ErrorCode.TASK_NOT_DRAFT);
        }
        entity.setTitle(command.title());
        entity.setDescriptionText(command.descriptionText());
        entity.setDeadlineAt(command.deadlineAt());
        if (command.rewardRuleJson() != null) {
            entity.setRewardRuleJson(serializeRewardRule(command.rewardRuleJson()));
        }
        if (command.settingsJson() != null) {
            entity.setSettingsJson(serializeTaskSettings(command.settingsJson()));
        }
        if (command.distributeStrategy() != null && !command.distributeStrategy().isBlank()) {
            entity.setDistributeStrategy(resolveStrategy(command.distributeStrategy()));
        }
        if (command.reviewWorkflowJson() != null) {
            entity.setReviewWorkflowJson(serializeReviewWorkflow(command.reviewWorkflowJson()));
        } else if (command.reviewWorkflowLevels() != null) {
            entity.setReviewWorkflowJson(reviewWorkflowValidator.toJson(toReviewWorkflowLevels(command.reviewWorkflowLevels())));
        }
        entity.setUpdatedAt(Instant.now());
        taskMapper.updateById(entity);
        return toSummary(entity);
    }

    /** 校验并归一化分发策略：空值默认 FIRST_COME，未知 code 由注册表抛错。 */
    private String resolveStrategy(String code) {
        String resolved = (code == null || code.isBlank())
                ? com.labelhub.core.business.distribute.DistributeStrategy.FIRST_COME
                : code;
        distributeStrategyRegistry.requireStrategy(resolved); // 校验合法性（含 SPI 扩展）
        return resolved;
    }

    private Map<String, Object> parseOptionalJsonMap(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (Exception ex) {
            return null;
        }
    }

    private String serializeRewardRule(Map<String, Object> rule) {
        if (rule == null) {
            return null;
        }
        Object mode = rule.get("mode");
        if (!(mode instanceof String modeText) || modeText.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "奖励规则缺少 mode");
        }
        try {
            return objectMapper.writeValueAsString(rule);
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "奖励规则 JSON 序列化失败");
        }
    }

    private String serializeTaskSettings(Map<String, Object> settings) {
        if (settings == null) {
            return null;
        }
        validateTaskSettings(settings);
        try {
            return objectMapper.writeValueAsString(settings);
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "任务设置 JSON 序列化失败");
        }
    }

    private String serializeReviewWorkflow(Map<String, Object> workflow) {
        if (workflow == null) {
            return reviewWorkflowValidator.validateAndSerializeJson(null);
        }
        return reviewWorkflowValidator.validateAndSerializeFromMap(workflow);
    }

    private Map<String, Object> parseReviewWorkflowJsonMap(String reviewWorkflowJson) {
        String normalized = reviewWorkflowValidator.validateAndSerializeJson(reviewWorkflowJson);
        return parseOptionalJsonMap(normalized);
    }

    @SuppressWarnings("unchecked")
    private void validateTaskSettings(Map<String, Object> settings) {
        if (settings == null || settings.isEmpty()) {
            return;
        }
        Object submissionValue = settings.get("submission");
        if (!(submissionValue instanceof Map<?, ?> submission)) {
            return;
        }
        Object withdrawValue = submission.get("withdraw");
        if (withdrawValue instanceof Map<?, ?> withdraw) {
            validatePositiveInteger(withdraw.get("maxWithdrawCount"), "withdraw.maxWithdrawCount");
        }
        Object appealValue = submission.get("appeal");
        if (appealValue instanceof Map<?, ?> appeal) {
            validatePositiveInteger(appeal.get("maxAppealsPerSubmission"), "appeal.maxAppealsPerSubmission");
            validatePositiveInteger(appeal.get("appealWindowHours"), "appeal.appealWindowHours");
        }
    }

    private void validatePositiveInteger(Object value, String field) {
        if (value == null) {
            return;
        }
        Integer intValue = null;
        if (value instanceof Number number) {
            intValue = number.intValue();
        } else if (value instanceof String text && !text.isBlank()) {
            try {
                intValue = Integer.parseInt(text);
            } catch (NumberFormatException ex) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR, field + " 必须为正整数");
            }
        }
        if (intValue != null && intValue <= 0) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, field + " 必须为正整数");
        }
    }

    /**
     * 导入任务项
     * 
     * <p>
     * 批量导入任务项数据，支持基于sourceKeyField或内容哈希的重复检测。
     * 仅允许向DRAFT或PAUSED状态的任务导入数据。
     * 
     * <p>
     * 核心流程：
     * <ol>
     * <li>验证任务状态（仅DRAFT/PAUSED可导入）</li>
     * <li>解析并验证导入契约</li>
     * <li>创建导入批次记录</li>
     * <li>加载已有数据进行去重</li>
     * <li>逐行处理并插入非重复数据</li>
     * <li>更新批次状态和任务配额</li>
     * </ol>
     * 
     * @param taskId  任务ID
     * @param command 导入命令，包含待导入数据、源文件标识、sourceKeyField等
     * @return 导入批次摘要
     * @throws BusinessException 当任务不存在、状态不允许或校验失败时抛出
     */
    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:import" })
    @Audit(entityType = "TASK", actionCode = "task.import_items", entityId = "#taskId")
    public TaskItemImportBatchSummary importTaskItems(Long taskId, TaskItemImportCommand command) {
        TaskEntity task = requireNotDeleted(taskMapper.selectById(taskId), ErrorCode.TASK_NOT_FOUND);

        // Step1: 状态校验 - 仅DRAFT或PAUSED状态可导入
        TaskStatus current = TaskStatus.valueOf(task.getStatus());
        boolean canImport = TASK_MACHINE.canTransition(current, TaskEvent.PUBLISH)
                || TASK_MACHINE.canTransition(current, TaskEvent.RESUME);
        if (!canImport) {
            throw new BusinessException(ErrorCode.TASK_STATUS_INVALID, "Only draft or paused task can import items");
        }

        // Step2: 解析导入契约并校验数据格式
        TaskImportPayloadContract contract = resolveImportPayloadContract(task);
        assertImportItemsMatchContract(taskId, task, contract, command);
        validateImportSourceKeyField(command.items(), command.sourceKeyField());

        // Step3: 创建导入批次记录
        TaskItemImportBatchEntity batch = new TaskItemImportBatchEntity();
        batch.setTaskId(taskId);
        batch.setSourceFilename(command.sourceFilename());
        batch.setSourceFormat("JSON");
        batch.setTotalRows(command.items().size());
        batch.setImportStatus("PROCESSING");
        batch.setStartedAt(Instant.now());
        batch.setCreatedAt(Instant.now());
        batch.setUpdatedAt(Instant.now());
        taskItemImportBatchMapper.insert(batch);

        // Step4: 加载已有数据用于去重检测
        java.util.Set<String> existingSourceKeys = loadActiveTaskItemSourceKeys(taskId);
        java.util.Set<String> existingPayloadHashes = loadActiveTaskItemPayloadHashes(taskId);
        java.util.Set<String> batchSourceKeys = new java.util.HashSet<>();
        java.util.Set<String> batchPayloadHashes = new java.util.HashSet<>();

        // Step5: 逐行处理导入数据
        int seqNoStart = resolveLastActiveTaskItemSeqNo(taskId);
        int successRows = 0;
        int skippedRows = 0;
        List<Map<String, Object>> importItems = command.items();
        TaskImportPayloadContract effectiveContract = contract;
        if (effectiveContract == null) {
            effectiveContract = TaskImportPayloadContractSupport.buildFromColumnBindings(command.columnBindings());
        }

        for (Map<String, Object> item : importItems) {
            // 按契约过滤行数据
            Map<String, Object> row = TaskImportPayloadContractSupport.filterRowForContract(item, effectiveContract,
                    command.columnBindings());

            // 生成规范化JSON和哈希
            String payload;
            String payloadHash;
            try {
                payload = TaskItemImportDedupeSupport.canonicalPayloadJson(objectMapper, row);
                payloadHash = DigestUtil.sha256Hex(payload);
            } catch (Exception e) {
                payload = "{}";
                payloadHash = DigestUtil.sha256Hex(payload);
            }

            // 解析源数据标识键
            String sourceItemKey = TaskItemImportDedupeSupport.resolveSourceItemKey(
                    row, command.sourceKeyField(), payloadHash);

            // 去重检测：检查sourceKey或payloadHash是否已存在
            if (isDuplicateImport(existingSourceKeys, existingPayloadHashes, batchSourceKeys, batchPayloadHashes,
                    sourceItemKey, payloadHash)) {
                skippedRows++;
                continue;
            }
            batchSourceKeys.add(sourceItemKey);
            batchPayloadHashes.add(payloadHash);

            // 创建任务项实体
            TaskItemEntity entity = new TaskItemEntity();
            entity.setTaskId(taskId);
            entity.setImportBatchId(batch.getId());
            entity.setSeqNo(++seqNoStart);
            entity.setSourceItemKey(sourceItemKey);
            entity.setPayloadJson(payload);
            entity.setPayloadHash(payloadHash);
            entity.setItemStatus("ACTIVE");
            entity.setDifficultyLevel(0);
            entity.setCurrentAssignmentCount(0);
            entity.setCurrentApprovedCount(0);
            entity.setAcceptanceSampledFlag(0);
            entity.setCreatedAt(Instant.now());
            entity.setUpdatedAt(Instant.now());
            taskItemMapper.insert(entity);

            // 更新去重集合
            existingSourceKeys.add(sourceItemKey);
            existingPayloadHashes.add(payloadHash);
            successRows++;
        }

        // Step6: 更新批次状态为完成
        batch.setSuccessRows(successRows);
        batch.setFailedRows(0);
        batch.setImportStatus("COMPLETED");
        batch.setFinishedAt(Instant.now());
        taskItemImportBatchMapper.updateById(batch);

        // Step7: 更新任务配额并锁定导入契约
        if (successRows > 0) {
            task.setQuota(task.getQuota() + successRows);
            task.setUpdatedAt(Instant.now());
            TaskImportPayloadContract lockSource = contract;
            if (lockSource == null) {
                lockSource = TaskImportPayloadContractSupport.buildFromColumnBindings(command.columnBindings());
            }
            maybeLockImportPayloadContract(task, lockSource, command);
            taskMapper.updateById(task);
        }

        return new TaskItemImportBatchSummary(
                batch.getId(), batch.getTaskId(), batch.getSourceFilename(), batch.getSourceFormat(),
                batch.getTotalRows(), successRows, batch.getFailedRows(), skippedRows,
                batch.getImportStatus(), batch.getStartedAt(), batch.getFinishedAt());
    }

    private void validateImportSourceKeyField(List<Map<String, Object>> items, String sourceKeyField) {
        if (sourceKeyField == null || sourceKeyField.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "sourceKeyField is required");
        }
        if (TaskItemImportDedupeSupport.CONTENT_HASH_SOURCE_KEY.equals(sourceKeyField)) {
            return;
        }
        if (!items.isEmpty() && items.get(0).containsKey(sourceKeyField)) {
            return;
        }
        boolean found = false;
        for (Map<String, Object> item : items) {
            if (item.containsKey(sourceKeyField)) {
                found = true;
                break;
            }
        }
        if (!found) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "sourceKeyField not found in import items: " + sourceKeyField);
        }
    }

    private boolean isDuplicateImport(
            java.util.Set<String> existingSourceKeys,
            java.util.Set<String> existingPayloadHashes,
            java.util.Set<String> batchSourceKeys,
            java.util.Set<String> batchPayloadHashes,
            String sourceItemKey,
            String payloadHash) {
        return existingSourceKeys.contains(sourceItemKey)
                || existingPayloadHashes.contains(payloadHash)
                || batchSourceKeys.contains(sourceItemKey)
                || batchPayloadHashes.contains(payloadHash);
    }

    private java.util.Set<String> loadActiveTaskItemSourceKeys(Long taskId) {
        LambdaQueryWrapper<TaskItemEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TaskItemEntity::getTaskId, taskId);
        wrapper.eq(TaskItemEntity::getDeletedFlag, 0);
        wrapper.select(TaskItemEntity::getSourceItemKey);
        return taskItemMapper.selectList(wrapper).stream()
                .map(TaskItemEntity::getSourceItemKey)
                .filter(key -> key != null && !key.isBlank())
                .collect(java.util.stream.Collectors.toCollection(java.util.HashSet::new));
    }

    private java.util.Set<String> loadActiveTaskItemPayloadHashes(Long taskId) {
        LambdaQueryWrapper<TaskItemEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TaskItemEntity::getTaskId, taskId);
        wrapper.eq(TaskItemEntity::getDeletedFlag, 0);
        wrapper.select(TaskItemEntity::getPayloadHash);
        return taskItemMapper.selectList(wrapper).stream()
                .map(TaskItemEntity::getPayloadHash)
                .filter(hash -> hash != null && !hash.isBlank())
                .collect(java.util.stream.Collectors.toCollection(java.util.HashSet::new));
    }

    /**
     * 保存任务模板
     * 
     * <p>
     * 为任务创建新的模板版本，版本号自动递增。同时根据schema自动生成字段定义。
     * 仅允许对DRAFT状态的任务保存模板。
     * 
     * @param taskId  任务ID
     * @param command 模板保存命令，包含模板名称和schema JSON
     * @return 模板版本摘要
     * @throws BusinessException 当任务不存在或非DRAFT状态时抛出
     */
    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:template_save", "business:template:manage" })
    @Audit(entityType = "TASK", actionCode = "task.template_save", entityId = "#command.taskId()")
    public TemplateVersionSummary saveTemplate(Long taskId, TemplateSaveCommand command) {
        TaskEntity task = requireNotDeleted(taskMapper.selectById(taskId), ErrorCode.TASK_NOT_FOUND);
        // 仅允许DRAFT状态任务保存模板
        if (!"DRAFT".equals(task.getStatus())) {
            throw new BusinessException(ErrorCode.TASK_STATUS_INVALID, "Only draft task can save template");
        }

        // 获取当前最新版本号，版本号自动递增
        LambdaQueryWrapper<TemplateVersionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TemplateVersionEntity::getTaskId, taskId);
        wrapper.orderByDesc(TemplateVersionEntity::getVersionNo);
        wrapper.last("LIMIT 1");
        TemplateVersionEntity lastVersion = templateVersionMapper.selectOne(wrapper);
        int nextVersionNo = lastVersion == null ? 1 : lastVersion.getVersionNo() + 1;

        // 创建新版本实体
        TemplateVersionEntity version = new TemplateVersionEntity();
        version.setTaskId(taskId);
        version.setVersionNo(nextVersionNo);
        version.setTemplateName(command.templateName());
        version.setStatus("DRAFT");
        version.setIsCurrent(1);
        try {
            String schema = objectMapper.writeValueAsString(command.schemaJson());
            version.setSchemaJson(schema);
            version.setSchemaChecksum(DigestUtil.sha256Hex(schema));
        } catch (Exception e) {
            version.setSchemaJson("{}");
        }
        version.setWidgetCount(0);
        version.setRequiredFieldCount(0);
        version.setCreatedAt(Instant.now());
        version.setUpdatedAt(Instant.now());
        templateVersionMapper.insert(version);

        // 根据 FormSchema（或兼容旧版 properties）同步字段副表
        syncFieldsFromFormSchema(version.getId(), command.schemaJson());

        return toVersionSummary(version);
    }

    /**
     * 从 FormSchema 遍历 sections[].fields，同步 template_version_fields（先删后插）。
     */
    private void syncFieldsFromFormSchema(Long versionId, Map<String, Object> schemaJson) {
        LambdaQueryWrapper<TemplateVersionFieldEntity> delWrapper = new LambdaQueryWrapper<>();
        delWrapper.eq(TemplateVersionFieldEntity::getTemplateVersionId, versionId);
        templateVersionFieldMapper.delete(delWrapper);

        List<TemplateVersionFieldEntity> fields = collectTemplateFieldsFromSchema(versionId, schemaJson);
        Instant now = Instant.now();
        for (TemplateVersionFieldEntity field : fields) {
            field.setCreatedAt(now);
            field.setUpdatedAt(now);
            templateVersionFieldMapper.insert(field);
        }
    }

    private List<TemplateVersionFieldEntity> collectTemplateFieldsFromSchema(Long versionId,
            Map<String, Object> schemaJson) {
        List<TemplateVersionFieldEntity> fields = new ArrayList<>();
        Object sectionsObj = schemaJson.get("sections");
        if (sectionsObj instanceof List<?> sections) {
            int[] sortNo = { 0 };
            for (Object sectionObj : sections) {
                if (!(sectionObj instanceof Map<?, ?> section)) {
                    continue;
                }
                Object fieldsObj = section.get("fields");
                if (fieldsObj instanceof List<?> sectionFields) {
                    collectFormSchemaFields(versionId, sectionFields, fields, sortNo);
                }
            }
            if (!fields.isEmpty()) {
                return fields;
            }
        }
        Object properties = schemaJson.get("properties");
        if (properties instanceof Map<?, ?> propMap) {
            int sortNo = 0;
            for (Map.Entry<?, ?> entry : propMap.entrySet()) {
                if (!(entry.getValue() instanceof Map<?, ?> fieldDef)) {
                    continue;
                }
                String fieldCode = entry.getKey().toString();
                TemplateVersionFieldEntity field = new TemplateVersionFieldEntity();
                field.setTemplateVersionId(versionId);
                field.setFieldCode(fieldCode);
                field.setFieldPath(fieldCode);
                field.setFieldTitle(fieldDef.get("title") != null ? fieldDef.get("title").toString() : fieldCode);
                field.setWidgetType("TEXT_INPUT");
                field.setValueType(fieldDef.get("type") != null ? fieldDef.get("type").toString().toUpperCase(Locale.ROOT)
                        : "STRING");
                field.setIsRequired(0);
                field.setIsDisplayOnly(0);
                field.setSortNo(++sortNo);
                field.setEnumOptionsJson("[]");
                fields.add(field);
            }
        }
        return fields;
    }

    private void collectFormSchemaFields(
            Long versionId,
            List<?> sectionFields,
            List<TemplateVersionFieldEntity> target,
            int[] sortNo) {
        for (Object fieldObj : sectionFields) {
            if (!(fieldObj instanceof Map<?, ?> field)) {
                continue;
            }
            Object keyObj = field.get("key");
            if (keyObj == null || keyObj.toString().isBlank()) {
                continue;
            }
            String fieldCode = keyObj.toString();
            Object pathObj = field.get("path");
            String fieldPath = pathObj != null && !pathObj.toString().isBlank() ? pathObj.toString() : fieldCode;
            Object componentObj = field.get("component");
            String widgetType = componentObj != null ? componentObj.toString() : "text";

            TemplateVersionFieldEntity entity = new TemplateVersionFieldEntity();
            entity.setTemplateVersionId(versionId);
            entity.setFieldCode(fieldCode);
            entity.setFieldPath(fieldPath);
            Object labelObj = field.get("label");
            entity.setFieldTitle(labelObj != null ? labelObj.toString() : fieldCode);
            entity.setWidgetType(widgetType);
            entity.setValueType(inferValueType(widgetType));
            entity.setIsRequired(Boolean.TRUE.equals(field.get("required")) ? 1 : 0);
            entity.setIsDisplayOnly(isDisplayOnlyField(widgetType, field) ? 1 : 0);
            entity.setSortNo(++sortNo[0]);
            entity.setEnumOptionsJson(serializeFieldOptions(field.get("options")));
            target.add(entity);

            Object nested = field.get("fields");
            if (nested instanceof List<?> nestedFields) {
                collectFormSchemaFields(versionId, nestedFields, target, sortNo);
            }
        }
    }

    private static boolean isDisplayOnlyField(String widgetType, Map<?, ?> field) {
        if ("showItem".equalsIgnoreCase(widgetType)) {
            return true;
        }
        Object meta = field.get("meta");
        if (meta instanceof Map<?, ?> metaMap) {
            Object role = metaMap.get("importRole");
            if (role != null && "display".equalsIgnoreCase(role.toString())) {
                return true;
            }
        }
        return false;
    }

    private static String inferValueType(String widgetType) {
        if (widgetType == null) {
            return "STRING";
        }
        return switch (widgetType.toLowerCase(Locale.ROOT)) {
            case "checkboxgroup", "fileupload", "imageupload" -> "ARRAY";
            case "jsoneditor" -> "OBJECT";
            case "number", "inputnumber" -> "NUMBER";
            case "switch", "radiogroup" -> "STRING";
            default -> "STRING";
        };
    }

    private String serializeFieldOptions(Object options) {
        if (options == null) {
            return "[]";
        }
        try {
            return objectMapper.writeValueAsString(options);
        } catch (Exception e) {
            return "[]";
        }
    }

    private static String resolveFieldPath(TemplateVersionFieldEntity source) {
        if (source.getFieldPath() != null && !source.getFieldPath().isBlank()) {
            return source.getFieldPath();
        }
        return source.getFieldCode();
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public List<TaskItemSummary> listTaskItems(Long taskId, int page, int pageSize) {
        LambdaQueryWrapper<TaskItemEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TaskItemEntity::getTaskId, taskId);
        wrapper.eq(TaskItemEntity::getDeletedFlag, 0);
        wrapper.orderByAsc(TaskItemEntity::getSeqNo);
        IPage<TaskItemEntity> pageResult = taskItemMapper.selectPage(new Page<>(page, pageSize), wrapper);
        return pageResult.getRecords().stream().map(this::toTaskItemSummary).toList();
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public TaskItemDetail getTaskItem(Long taskId, Long taskItemId) {
        TaskItemEntity entity = requireExistingTaskItem(taskItemId);
        if (!taskId.equals(entity.getTaskId())) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Task item not found: " + taskItemId);
        }
        return toTaskItemDetail(entity);
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public PageResponse<TaskItemSummary> listTaskItems(ParsedListQuery query) {
        Long taskId = extractLongFilter(query, "taskId");
        if (taskId == null) {
            return PageResponse.empty();
        }
        LambdaQueryWrapper<TaskItemEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TaskItemEntity::getTaskId, taskId);
        wrapper.eq(TaskItemEntity::getDeletedFlag, 0);
        queryApplier.apply(wrapper, query, TASK_ITEM_QUERY_SPEC);
        if (query.sort().isEmpty()) {
            wrapper.orderByAsc(TaskItemEntity::getSeqNo);
        }
        IPage<TaskItemEntity> pageResult = taskItemMapper.selectPage(new Page<>(query.page(), query.pageSize()),
                wrapper);
        return PageResponse.of(pageResult.getTotal(), query.page(), query.pageSize(),
                pageResult.getRecords().stream().map(this::toTaskItemSummary).toList());
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:assignment:read", "business:task:read" })
    public PageResponse<TaskAssignmentBoardRow> listAssignmentBoard(Long taskId, ParsedListQuery query) {
        TaskEntity task = requireNotDeleted(taskMapper.selectById(taskId), ErrorCode.TASK_NOT_FOUND);
        String assignStatus = extractStringFilter(query, "assignStatus");
        LambdaQueryWrapper<TaskItemEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TaskItemEntity::getTaskId, taskId);
        wrapper.eq(TaskItemEntity::getDeletedFlag, 0);
        applyAssignmentBoardKeyword(wrapper, query.keyword());
        applyAssignStatusFilter(wrapper, taskId, assignStatus);
        if (query.sort().isEmpty()) {
            wrapper.orderByAsc(TaskItemEntity::getSeqNo);
        } else {
            queryApplier.apply(wrapper, query, TASK_ITEM_QUERY_SPEC);
        }
        IPage<TaskItemEntity> pageResult = taskItemMapper.selectPage(new Page<>(query.page(), query.pageSize()),
                wrapper);
        List<TaskItemEntity> items = pageResult.getRecords();
        if (items.isEmpty()) {
            return PageResponse.of(pageResult.getTotal(), query.page(), query.pageSize(), List.of());
        }
        Map<Long, AssignmentEntity> latestByItemId = loadLatestAssignmentsByItemIds(
                taskId,
                items.stream().map(TaskItemEntity::getId).toList());
        List<TaskAssignmentBoardRow> rows = items.stream()
                .map(item -> toAssignmentBoardRow(item, latestByItemId.get(item.getId())))
                .toList();
        return PageResponse.of(pageResult.getTotal(), query.page(), query.pageSize(), rows);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:update" })
    @Audit(entityType = "TASK_ITEM", actionCode = "taskItem.delete", entityId = "#taskItemId")
    public void deleteTaskItem(Long taskItemId) {
        softDeleteTaskItem(requireDeletableTaskItem(taskItemId));
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:update" })
    @Audit(entityType = "TASK_ITEM", actionCode = "taskItem.batch_delete", entityId = "#taskItemIds")
    public void deleteTaskItems(List<Long> taskItemIds) {
        if (taskItemIds == null || taskItemIds.isEmpty()) {
            return;
        }
        for (Long taskItemId : taskItemIds) {
            softDeleteTaskItem(requireDeletableTaskItem(taskItemId));
        }
    }

    private TaskItemEntity requireExistingTaskItem(Long taskItemId) {
        TaskItemEntity entity = taskItemMapper.selectById(taskItemId);
        if (entity == null || entity.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Task item not found: " + taskItemId);
        }
        return entity;
    }

    private TaskItemEntity requireDeletableTaskItem(Long taskItemId) {
        TaskItemEntity entity = requireExistingTaskItem(taskItemId);
        TaskEntity task = requireNotDeleted(taskMapper.selectById(entity.getTaskId()), ErrorCode.TASK_NOT_FOUND);
        if (!"DRAFT".equals(task.getStatus())) {
            throw new BusinessException(ErrorCode.OPERATION_NOT_ALLOWED, "Only draft task items can be deleted");
        }
        if (entity.getCurrentAssignmentCount() != null && entity.getCurrentAssignmentCount() > 0) {
            throw new BusinessException(ErrorCode.OPERATION_NOT_ALLOWED, "Task item has active assignments");
        }
        return entity;
    }

    private void softDeleteTaskItem(TaskItemEntity entity) {
        entity.setSeqNo(releasedSeqNoForDeletedItem(entity.getId()));
        entity.setDeletedFlag(1);
        entity.setUpdatedAt(Instant.now());
        taskItemMapper.updateById(entity);

        TaskEntity task = taskMapper.selectById(entity.getTaskId());
        if (task != null && task.getDeletedFlag() == 0 && task.getQuota() != null && task.getQuota() > 0) {
            task.setQuota(task.getQuota() - 1);
            task.setUpdatedAt(Instant.now());
            taskMapper.updateById(task);
        }
    }

    /**
     * uk_task_items_seq 包含 deleted_flag。软删时若保留原 seq_no，与同 task 下其它已删行会冲突
     * （例如删→导入复用 seq→再删）。用 item id 派生高位 seq，释放活跃序号槽位。
     */
    private static final int RELEASED_TASK_ITEM_SEQ_BASE = 1_000_000;

    private static int releasedSeqNoForDeletedItem(long taskItemId) {
        long slot = Math.floorMod(taskItemId, 2_000_000_000L);
        return RELEASED_TASK_ITEM_SEQ_BASE + (int) slot;
    }

    private int resolveLastActiveTaskItemSeqNo(Long taskId) {
        LambdaQueryWrapper<TaskItemEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TaskItemEntity::getTaskId, taskId);
        wrapper.eq(TaskItemEntity::getDeletedFlag, 0);
        wrapper.select(TaskItemEntity::getSeqNo);
        wrapper.orderByDesc(TaskItemEntity::getSeqNo);
        wrapper.last("LIMIT 1");
        TaskItemEntity last = taskItemMapper.selectOne(wrapper);
        return last == null ? 0 : last.getSeqNo();
    }

    private TaskItemSummary toTaskItemSummary(TaskItemEntity entity) {
        Map<String, Object> payloadPreview = TaskPayloadPreviewSupport.toPayloadPreview(objectMapper, entity.getPayloadJson());
        return new TaskItemSummary(
                entity.getId(), entity.getTaskId(), entity.getSourceItemKey(), entity.getItemStatus(),
                entity.getSeqNo(), entity.getCurrentAssignmentCount(), entity.getCreatedAt(), payloadPreview);
    }

    private TaskItemDetail toTaskItemDetail(TaskItemEntity entity) {
        String rawJson = entity.getPayloadJson();
        if (rawJson == null || rawJson.isBlank()) {
            rawJson = "{}";
        }
        Map<String, Object> payload = parsePayloadMap(rawJson);
        return new TaskItemDetail(
                entity.getId(), entity.getTaskId(), entity.getSourceItemKey(), entity.getItemStatus(),
                entity.getSeqNo(), entity.getCurrentAssignmentCount(), entity.getCreatedAt(),
                payload, rawJson);
    }

    private Map<String, Object> parsePayloadMap(String rawJson) {
        try {
            Map<String, Object> parsed = objectMapper.readValue(rawJson, new TypeReference<>() {
            });
            return parsed == null ? Map.of() : parsed;
        } catch (Exception e) {
            return Map.of();
        }
    }

    private TaskImportPayloadContract resolveImportPayloadContract(TaskEntity task) {
        return TaskImportPayloadContractSupport.parseContract(objectMapper, task.getImportPayloadContractJson());
    }

    private void assertImportItemsMatchContract(Long taskId, TaskEntity task, TaskImportPayloadContract contract,
            TaskItemImportCommand command) {
        List<Map<String, Object>> items = command.items();
        if (items == null || items.isEmpty()) {
            return;
        }
        TaskImportPayloadContract effective = contract;
        if (effective == null) {
            effective = TaskImportPayloadContractSupport.buildFromColumnBindings(command.columnBindings());
        }
        if (effective == null) {
            return;
        }
        TaskImportPayloadContractSupport.assertRowsMatchContract(items, effective);
    }

    private void maybeLockImportPayloadContract(TaskEntity task, TaskImportPayloadContract lockSource,
            TaskItemImportCommand command) {
        if (task.getImportPayloadContractJson() != null && !task.getImportPayloadContractJson().isBlank()) {
            return;
        }
        TaskImportPayloadContract toLock = TaskImportPayloadContractSupport.buildFromColumnBindings(
                command.columnBindings());
        if (toLock == null) {
            toLock = lockSource;
        }
        if (toLock == null) {
            return;
        }
        task.setImportPayloadContractJson(TaskImportPayloadContractSupport.serializeContract(objectMapper, toLock));
    }

    /**
     * 发布时一次性从模板 schema 推断并落库导入契约；读路径不再做运行时推断。
     */
    private void persistImportPayloadContractFromTemplateIfAbsent(TaskEntity task, Long templateVersionId) {
        if (task.getImportPayloadContractJson() != null && !task.getImportPayloadContractJson().isBlank()) {
            return;
        }
        if (templateVersionId == null) {
            return;
        }
        TemplateVersionEntity version = templateVersionMapper.selectById(templateVersionId);
        if (version == null || version.getSchemaJson() == null || version.getSchemaJson().isBlank()) {
            return;
        }
        TaskImportPayloadContract inferred = TaskImportPayloadContractSupport.inferFromFormSchemaJson(objectMapper,
                version.getSchemaJson());
        if (inferred == null) {
            return;
        }
        task.setImportPayloadContractJson(TaskImportPayloadContractSupport.serializeContract(objectMapper, inferred));
    }

    @SuppressWarnings("unchecked")
    private List<String> extractFormSchemaBindingKeys(String schemaJson) {
        try {
            Map<String, Object> root = objectMapper.readValue(schemaJson, new TypeReference<Map<String, Object>>() {
            });
            Object sectionsObj = root.get("sections");
            if (!(sectionsObj instanceof List<?> sections)) {
                return List.of();
            }
            java.util.TreeSet<String> keys = new java.util.TreeSet<>();
            for (Object sectionObj : sections) {
                if (!(sectionObj instanceof Map<?, ?> section)) {
                    continue;
                }
                Object fieldsObj = section.get("fields");
                if (fieldsObj instanceof List<?> fields) {
                    collectFormSchemaBindingKeys(fields, keys);
                }
            }
            return new ArrayList<>(keys);
        } catch (Exception e) {
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    private void collectFormSchemaBindingKeys(List<?> fields, java.util.Set<String> keys) {
        for (Object fieldObj : fields) {
            if (!(fieldObj instanceof Map<?, ?> field)) {
                continue;
            }
            Object path = field.get("path");
            Object key = field.get("key");
            String binding = path != null && !path.toString().isBlank()
                    ? path.toString()
                    : (key != null ? key.toString() : null);
            if (binding != null && !binding.isBlank()) {
                keys.add(binding);
            }
            Object nested = field.get("fields");
            if (nested instanceof List<?> nestedFields) {
                collectFormSchemaBindingKeys(nestedFields, keys);
            }
        }
    }

    private Long extractLongFilter(ParsedListQuery query, String fieldName) {
        for (var filter : query.filters()) {
            if (!fieldName.equals(filter.field())) {
                continue;
            }
            Object value = filter.value();
            if (value instanceof Number number) {
                return number.longValue();
            }
            if (value instanceof String text && !text.isBlank()) {
                return Long.parseLong(text);
            }
        }
        return null;
    }

    private String extractStringFilter(ParsedListQuery query, String fieldName) {
        for (var filter : query.filters()) {
            if (!fieldName.equals(filter.field())) {
                continue;
            }
            Object value = filter.value();
            if (value == null) {
                return null;
            }
            String text = String.valueOf(value).trim();
            return text.isEmpty() ? null : text;
        }
        return null;
    }

    private void applyAssignmentBoardKeyword(LambdaQueryWrapper<TaskItemEntity> wrapper, String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return;
        }
        String q = keyword.trim();
        wrapper.and(w -> w.like(TaskItemEntity::getSourceItemKey, q)
                .or()
                .like(TaskItemEntity::getSeqNo, q));
    }

    private void applyAssignStatusFilter(LambdaQueryWrapper<TaskItemEntity> wrapper, Long taskId, String assignStatus) {
        if (assignStatus == null || assignStatus.isBlank() || "ALL".equalsIgnoreCase(assignStatus)) {
            return;
        }
        String anyExistsSql = "SELECT 1 FROM assignments a WHERE a.item_id = task_items.id AND a.task_id = "
                + taskId
                + " AND a.deleted_flag = 0";
        String assignedExistsSql = "SELECT 1 FROM assignments a WHERE a.item_id = task_items.id AND a.task_id = "
                + taskId
                + " AND a.deleted_flag = 0 AND a.status IN ('CLAIMED','SUBMITTED','EXPIRED')";
        String reassignableExistsSql = "SELECT 1 FROM assignments a WHERE a.item_id = task_items.id AND a.task_id = "
                + taskId
                + " AND a.deleted_flag = 0 AND a.status = '"
                + AssignmentStatus.UNCLAIMED.name()
                + "' AND a.revoked_at IS NOT NULL";
        if ("UNASSIGNED".equalsIgnoreCase(assignStatus)) {
            wrapper.and(w -> w.notExists(anyExistsSql).or().exists(reassignableExistsSql));
        } else if ("ASSIGNED".equalsIgnoreCase(assignStatus)) {
            wrapper.exists(assignedExistsSql);
        } else if (AssignmentStatus.CANCELLED.name().equalsIgnoreCase(assignStatus)) {
            wrapper.exists(anyExistsSql + " AND a.status = '" + AssignmentStatus.CANCELLED.name() + "'");
        }
    }

    private Map<Long, AssignmentEntity> loadLatestAssignmentsByItemIds(Long taskId, List<Long> itemIds) {
        if (itemIds == null || itemIds.isEmpty()) {
            return Map.of();
        }
        LambdaQueryWrapper<AssignmentEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AssignmentEntity::getDeletedFlag, 0)
                .eq(AssignmentEntity::getTaskId, taskId)
                .in(AssignmentEntity::getItemId, itemIds)
                .orderByDesc(AssignmentEntity::getId);
        Map<Long, AssignmentEntity> latest = new LinkedHashMap<>();
        for (AssignmentEntity entity : assignmentMapper.selectList(wrapper)) {
            latest.putIfAbsent(entity.getItemId(), entity);
        }
        return latest;
    }

    private TaskAssignmentBoardRow toAssignmentBoardRow(TaskItemEntity item, AssignmentEntity assignment) {
        Map<String, Object> payloadPreview = TaskPayloadPreviewSupport.toPayloadPreview(objectMapper, item.getPayloadJson());
        boolean assignable = assignment == null || isReassignableAssignment(assignment);
        if (assignment == null) {
            return new TaskAssignmentBoardRow(
                    item.getId(),
                    item.getTaskId(),
                    item.getSourceItemKey(),
                    item.getItemStatus(),
                    item.getSeqNo(),
                    payloadPreview,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    true);
        }
        String labelerName = assignment.getLabelerId() == null
                ? null
                : userDisplayNameResolver.resolve(assignment.getLabelerId());
        return new TaskAssignmentBoardRow(
                item.getId(),
                item.getTaskId(),
                item.getSourceItemKey(),
                item.getItemStatus(),
                item.getSeqNo(),
                payloadPreview,
                assignment.getId(),
                assignment.getStatus(),
                assignment.getAssignType(),
                assignment.getLabelerId(),
                labelerName,
                assignment.getAssignedAt(),
                assignment.getClaimedAt(),
                assignment.getDeadlineAt(),
                assignable);
    }

    private boolean isReassignableAssignment(AssignmentEntity assignment) {
        return AssignmentStatus.UNCLAIMED.name().equals(assignment.getStatus())
                && assignment.getRevokedAt() != null;
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public TemplateVersionDetail getLatestTemplateVersion(Long taskId) {
        TaskEntity task = requireNotDeleted(taskMapper.selectById(taskId), ErrorCode.TASK_NOT_FOUND);
        TemplateVersionEntity v = findLatestTemplateVersionEntity(taskId);
        TaskImportPayloadContract importContract = TaskImportPayloadContractSupport.parseContract(objectMapper,
                task.getImportPayloadContractJson());
        if (importContract == null && v == null) {
            return new TemplateVersionDetail(0L, taskId, 0, Collections.emptyMap(), List.of(), null);
        }
        if (v == null) {
            return new TemplateVersionDetail(0L, taskId, 0, Collections.emptyMap(), List.of(), importContract);
        }
        Map<String, Object> schema;
        try {
            schema = objectMapper.readValue(v.getSchemaJson(), new TypeReference<Map<String, Object>>() {
            });
        } catch (Exception e) {
            schema = Collections.emptyMap();
        }
        LambdaQueryWrapper<TemplateVersionFieldEntity> fw = new LambdaQueryWrapper<>();
        fw.eq(TemplateVersionFieldEntity::getTemplateVersionId, v.getId());
        fw.orderByAsc(TemplateVersionFieldEntity::getSortNo);
        List<TemplateVersionFieldSummary> fields = templateVersionFieldMapper.selectList(fw).stream()
                .map(f -> new TemplateVersionFieldSummary(f.getId(), f.getTemplateVersionId(), f.getFieldCode(),
                        f.getFieldTitle(), f.getWidgetType(), f.getSortNo(),
                        parseJsonMap(f.getEnumOptionsJson()), f.getIsRequired()))
                .toList();
        return new TemplateVersionDetail(v.getId(), v.getTaskId(), v.getVersionNo(), schema, fields, importContract);
    }

    private Long resolveTemplateIdForTask(TaskEntity entity) {
        if (entity.getCurrentTemplateVersionId() != null) {
            TemplateVersionEntity version = templateVersionMapper.selectById(entity.getCurrentTemplateVersionId());
            if (version != null && version.getDeletedFlag() == 0 && version.getTemplateId() != null) {
                return version.getTemplateId();
            }
        }
        LambdaQueryWrapper<TemplatesEntity> templateWrapper = new LambdaQueryWrapper<>();
        templateWrapper.eq(TemplatesEntity::getTaskId, entity.getId());
        templateWrapper.eq(TemplatesEntity::getDeletedFlag, 0);
        templateWrapper.orderByDesc(TemplatesEntity::getUpdatedAt);
        templateWrapper.last("LIMIT 1");
        TemplatesEntity template = templatesMapper.selectOne(templateWrapper);
        return template == null ? null : template.getId();
    }

    /**
     * 优先按 template_versions.task_id；若无则经 templates.task_id → template_id 查最新版本
     * （导入经 templates 主表创建版本时，历史数据可能只有 template_id 无 task_id）。
     */
    private Long resolveTaskIdForTemplateVersion(TemplateVersionEntity version) {
        if (version.getTaskId() != null) {
            return version.getTaskId();
        }
        if (version.getTemplateId() == null) {
            return null;
        }
        TemplatesEntity template = templatesMapper.selectById(version.getTemplateId());
        return template == null ? null : template.getTaskId();
    }

    private TemplateVersionEntity findLatestTemplateVersionEntity(Long taskId) {
        LambdaQueryWrapper<TemplateVersionEntity> byTask = new LambdaQueryWrapper<>();
        byTask.eq(TemplateVersionEntity::getTaskId, taskId);
        byTask.eq(TemplateVersionEntity::getDeletedFlag, 0);
        byTask.orderByDesc(TemplateVersionEntity::getVersionNo);
        byTask.last("LIMIT 1");
        TemplateVersionEntity direct = templateVersionMapper.selectOne(byTask);
        if (direct != null) {
            return direct;
        }
        LambdaQueryWrapper<TemplatesEntity> templateWrapper = new LambdaQueryWrapper<>();
        templateWrapper.eq(TemplatesEntity::getTaskId, taskId);
        templateWrapper.eq(TemplatesEntity::getDeletedFlag, 0);
        templateWrapper.orderByDesc(TemplatesEntity::getUpdatedAt);
        templateWrapper.last("LIMIT 1");
        TemplatesEntity template = templatesMapper.selectOne(templateWrapper);
        if (template == null) {
            return null;
        }
        if (template.getCurrentTemplateVersionId() != null) {
            TemplateVersionEntity current = templateVersionMapper.selectById(template.getCurrentTemplateVersionId());
            if (current != null && current.getDeletedFlag() == 0) {
                return current;
            }
        }
        LambdaQueryWrapper<TemplateVersionEntity> byTemplate = new LambdaQueryWrapper<>();
        byTemplate.eq(TemplateVersionEntity::getTemplateId, template.getId());
        byTemplate.eq(TemplateVersionEntity::getDeletedFlag, 0);
        byTemplate.orderByDesc(TemplateVersionEntity::getVersionNo);
        byTemplate.last("LIMIT 1");
        return templateVersionMapper.selectOne(byTemplate);
    }

    private Map<String, Object> parseJsonMap(String json) {
        if (json == null)
            return Collections.emptyMap();
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {
            });
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }

    /*******************
     * 发布任务
     * 
     * <p>
     * 将任务从DRAFT状态发布为PUBLISHED状态，或从PAUSED状态恢复为PUBLISHED状态。
     * 发布前需检查：
     * <ol>
     * <li>任务项数量大于0</li>
     * <li>模板版本已就绪（已发布）</li>
     * </ol>
     * 
     * <p>
     * 发布流程：
     * <ol>
     * <li>状态校验与转换（DRAFT→PUBLISH 或 PAUSED→RESUME）</li>
     * <li>检查发布就绪状态</li>
     * <li>发布当前模板版本</li>
     * <li>同步任务的当前模板版本ID</li>
     * <li>触发任务分配预生成</li>
     * </ol>
     * 
     * @param taskId 任务ID
     * @throws BusinessException 当任务不存在、状态不允许或就绪检查失败时抛出
     */
    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:publish" })
    @Audit(entityType = "TASK", actionCode = "task.publish", entityId = "#taskId")
    public void publishTask(Long taskId) {
        TaskEntity entity = requireNotDeleted(taskMapper.selectById(taskId), ErrorCode.TASK_NOT_FOUND);

        // Step1: 状态转换 - DRAFT发布或PAUSED恢复
        TaskStatus currentState = TaskStatus.valueOf(entity.getStatus());
        TaskStatus nextState;
        if (TaskStatus.DRAFT.equals(currentState)) {
            nextState = TASK_MACHINE.fire(currentState, TaskEvent.PUBLISH);
        } else if (TaskStatus.PAUSED.equals(currentState)) {
            nextState = TASK_MACHINE.fire(currentState, TaskEvent.RESUME);
        } else {
            throw new BusinessException(ErrorCode.TASK_STATUS_INVALID, "Only draft or paused task can be published");
        }

        // Step2: 检查发布就绪状态（任务项数量、模板就绪）
        PublishReadiness readiness = resolvePublishReadiness(entity, isTemplateReady(entity));
        if (!readiness.publishReady()) {
            if ("TASK_TEMPLATE_NOT_READY".equals(readiness.blockReason())) {
                throw new BusinessException(ErrorCode.TASK_TEMPLATE_NOT_READY);
            }
            throw new BusinessException(ErrorCode.INVALID_OPERATION, readiness.blockReason());
        }

        // Step3: 发布当前模板版本（如果存在）
        LambdaQueryWrapper<TemplateVersionEntity> currentWrapper = new LambdaQueryWrapper<>();
        currentWrapper.eq(TemplateVersionEntity::getTaskId, taskId);
        currentWrapper.eq(TemplateVersionEntity::getIsCurrent, 1);
        TemplateVersionEntity currentTemplate = templateVersionMapper.selectOne(currentWrapper);
        Long resolvedCurrentTemplateVersionId = entity.getCurrentTemplateVersionId();

        if (currentTemplate != null) {
            currentTemplate.setStatus("PUBLISHED");
            currentTemplate.setPublishedAt(Instant.now());
            currentTemplate.setUpdatedAt(Instant.now());
            templateVersionMapper.updateById(currentTemplate);
            syncTaskCurrentTemplateVersion(taskId, currentTemplate.getId());
            resolvedCurrentTemplateVersionId = currentTemplate.getId();
        }

        // Step4: 如果任务未设置当前模板版本，尝试查找已发布的最新版本
        if (entity.getCurrentTemplateVersionId() == null) {
            TemplateVersionEntity latest = findLatestTemplateVersionEntity(taskId);
            if (latest != null && "PUBLISHED".equals(latest.getStatus())) {
                syncTaskCurrentTemplateVersion(taskId, latest.getId());
                resolvedCurrentTemplateVersionId = latest.getId();
            }
        }

        // Step5: 确保模板版本已就绪
        if (resolvedCurrentTemplateVersionId == null) {
            throw new BusinessException(ErrorCode.TASK_TEMPLATE_NOT_READY);
        }

        // Step6: 发布时落库导入契约（历史数据由迁移/首次导入锁定，读路径不再从 schema 推断）
        persistImportPayloadContractFromTemplateIfAbsent(entity, resolvedCurrentTemplateVersionId);

        // Step7: 同步人工审核流程并更新任务状态
        entity.setCurrentTemplateVersionId(resolvedCurrentTemplateVersionId);
        syncTaskReviewWorkflowFromTemplate(entity, resolvedCurrentTemplateVersionId);
        entity.setStatus(nextState.name());
        entity.setPublishedAt(Instant.now());
        entity.setUpdatedAt(Instant.now());
        taskMapper.updateById(entity);

        // Step8: 委托分发策略编排发布（FIRST_COME/QUOTA 预生成进广场；ASSIGN 跳过）
        distributeStrategyRegistry.requireStrategy(entity.getDistributeStrategy())
                .onPublish(new com.labelhub.core.business.distribute.DistributePublishContext(taskId));
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:update" })
    @Audit(entityType = "TASK", actionCode = "task.pause", entityId = "#taskId")
    public void pauseTask(Long taskId) {
        TaskEntity entity = requireNotDeleted(taskMapper.selectById(taskId), ErrorCode.TASK_NOT_FOUND);
        TaskStatus currentState = TaskStatus.valueOf(entity.getStatus());
        TaskStatus nextState = TASK_MACHINE.fire(currentState, TaskEvent.PAUSE);
        entity.setStatus(nextState.name());
        entity.setUpdatedAt(Instant.now());
        taskMapper.updateById(entity);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:update" })
    @Audit(entityType = "TASK", actionCode = "task.delete", entityId = "#taskId")
    public void deleteTask(Long taskId) {
        TaskEntity entity = requireNotDeleted(taskMapper.selectById(taskId), ErrorCode.TASK_NOT_FOUND);
        TaskStatus currentState = TaskStatus.valueOf(entity.getStatus());
        if (!TaskStatus.DRAFT.equals(currentState) && !TaskStatus.PAUSED.equals(currentState)) {
            throw new BusinessException(ErrorCode.TASK_STATUS_INVALID,
                    "Only draft or paused task can be deleted");
        }
        entity.setDeletedFlag(1);
        entity.setUpdatedAt(Instant.now());
        taskMapper.updateById(entity);
    }

    private TaskSummary toSummary(TaskEntity entity) {
        boolean templateReady = isTemplateReady(entity);
        PublishReadiness readiness = resolvePublishReadiness(entity, templateReady);
        return new TaskSummary(entity.getId(), entity.getTenantId(), entity.getTaskCode(), entity.getTitle(),
                entity.getSceneCode(), entity.getStatus(), entity.getDistributeStrategy(), entity.getOwnerId(),
                null, entity.getQuota(), entity.getMaxClaimPerUser(), entity.getCurrentTemplateVersionId(),
                templateReady,
                readiness.publishReady(), readiness.blockReason(), entity.getDeadlineAt(),
                entity.getPublishedAt(), entity.getArchivedAt(), entity.getCreatedAt(), entity.getUpdatedAt());
    }

    private boolean isTemplateReady(TaskEntity task) {
        if (task.getCurrentTemplateVersionId() == null) {
            return false;
        }
        TemplateVersionEntity version = templateVersionMapper.selectById(task.getCurrentTemplateVersionId());
        return version != null && version.getDeletedFlag() == 0 && "PUBLISHED".equals(version.getStatus());
    }

    private PublishReadiness resolvePublishReadiness(TaskEntity task, boolean templateReady) {
        long itemCount = countActiveTaskItems(task.getId());
        if (itemCount <= 0) {
            return new PublishReadiness(false, "TASK_ITEMS_NOT_READY");
        }
        if (!templateReady) {
            return new PublishReadiness(false, "TASK_TEMPLATE_NOT_READY");
        }
        return new PublishReadiness(true, null);
    }

    private long countActiveTaskItems(Long taskId) {
        LambdaQueryWrapper<TaskItemEntity> itemWrapper = new LambdaQueryWrapper<>();
        itemWrapper.eq(TaskItemEntity::getTaskId, taskId);
        itemWrapper.eq(TaskItemEntity::getDeletedFlag, 0);
        Long count = taskItemMapper.selectCount(itemWrapper);
        return count == null ? 0 : count;
    }

    private record PublishReadiness(boolean publishReady, String blockReason) {
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public PageResponse<TemplateVersionSummary> listTemplateVersions(Long taskId, ParsedListQuery query) {
        LambdaQueryWrapper<TemplateVersionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TemplateVersionEntity::getTaskId, taskId);
        wrapper.eq(TemplateVersionEntity::getDeletedFlag, 0);
        wrapper.orderByDesc(TemplateVersionEntity::getVersionNo);
        queryApplier.apply(wrapper, query, ResourceQuerySpec.<TemplateVersionEntity>builder()
                .stringFilter("status", TemplateVersionEntity::getStatus)
                .sortField("versionNo", TemplateVersionEntity::getVersionNo)
                .sortField("createdAt", TemplateVersionEntity::getCreatedAt)
                .build());
        IPage<TemplateVersionEntity> pageResult = templateVersionMapper
                .selectPage(new Page<>(query.page(), query.pageSize()), wrapper);
        return PageResponse.of(pageResult.getTotal(), query.page(), query.pageSize(),
                pageResult.getRecords().stream().map(this::toVersionSummary).toList());
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public TemplateVersionDetailFull getTemplateVersionDetail(Long versionId) {
        TemplateVersionEntity v = templateVersionMapper.selectById(versionId);
        if (v == null || v.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        Map<String, Object> schema = parseJsonMap(v.getSchemaJson());
        LambdaQueryWrapper<TemplateVersionFieldEntity> fw = new LambdaQueryWrapper<>();
        fw.eq(TemplateVersionFieldEntity::getTemplateVersionId, v.getId());
        fw.orderByAsc(TemplateVersionFieldEntity::getSortNo);
        List<TemplateVersionFieldSummary> fields = templateVersionFieldMapper.selectList(fw).stream()
                .map(f -> new TemplateVersionFieldSummary(f.getId(), f.getTemplateVersionId(), f.getFieldCode(),
                        f.getFieldTitle(), f.getWidgetType(), f.getSortNo(),
                        parseJsonMap(f.getEnumOptionsJson()), f.getIsRequired()))
                .toList();
        LambdaQueryWrapper<TemplateReviewDimensionEntity> dw = new LambdaQueryWrapper<>();
        dw.eq(TemplateReviewDimensionEntity::getTemplateVersionId, v.getId());
        dw.orderByAsc(TemplateReviewDimensionEntity::getSortNo);
        List<TemplateReviewDimensionSummary> dimensions = templateReviewDimensionMapper.selectList(dw).stream()
                .map(d -> new TemplateReviewDimensionSummary(d.getId(), d.getTemplateVersionId(), d.getDimensionKey(),
                        d.getDimensionName(), d.getDimensionDesc(), d.getWeight(), d.getScoreMin(), d.getScoreMax(),
                        d.getPassThreshold(), d.getRejectThreshold(), d.getPromptInstruction(),
                        d.getManualReviewHint(), d.getSeverityLevel(), d.getSortNo(), d.getRequiredFlag()))
                .toList();
        return new TemplateVersionDetailFull(v.getId(), v.getTaskId(), v.getVersionNo(), v.getTemplateName(),
                v.getStatus(), v.getIsCurrent(), schema, v.getSchemaChecksum(), v.getReviewPromptTemplate(),
                v.getProviderPlatformKey(), v.getModelId(), toReviewWorkflowLevelDtos(v.getReviewWorkflowJson()),
                fields, dimensions, v.getPublishedAt(), v.getCreatedAt());
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:template_save", "business:template:manage" })
    @Audit(entityType = "TEMPLATE_VERSION", actionCode = "template.create_draft", entityId = "#result.id()", after = AuditSnapshotSource.RESULT)
    public TemplateVersionSummary createDraftFromBase(Long taskId, Long baseVersionId) {
        TaskEntity task = taskMapper.selectById(taskId);
        if (task == null || task.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        TemplateVersionEntity baseVersion = null;
        if (baseVersionId != null) {
            baseVersion = templateVersionMapper.selectById(baseVersionId);
            if (baseVersion == null || baseVersion.getDeletedFlag() == 1) {
                throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
            }
        }
        LambdaQueryWrapper<TemplateVersionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TemplateVersionEntity::getTaskId, taskId);
        wrapper.orderByDesc(TemplateVersionEntity::getVersionNo);
        wrapper.last("LIMIT 1");
        TemplateVersionEntity lastVersion = templateVersionMapper.selectOne(wrapper);
        int nextVersionNo = lastVersion == null ? 1 : lastVersion.getVersionNo() + 1;

        TemplateVersionEntity newVersion = new TemplateVersionEntity();
        newVersion.setTaskId(taskId);
        newVersion.setVersionNo(nextVersionNo);
        newVersion.setTemplateName(
                baseVersion != null ? baseVersion.getTemplateName() + " (Draft)" : "Draft v" + nextVersionNo);
        newVersion.setStatus("DRAFT");
        newVersion.setIsCurrent(1);
        if (baseVersion != null) {
            newVersion.setSchemaJson(baseVersion.getSchemaJson());
            newVersion.setSchemaChecksum(baseVersion.getSchemaChecksum());
            newVersion.setReviewPromptTemplate(baseVersion.getReviewPromptTemplate());
            newVersion.setReviewOutputSchemaJson(baseVersion.getReviewOutputSchemaJson());
            newVersion.setReviewWorkflowJson(baseVersion.getReviewWorkflowJson());
            newVersion.setAcceptanceRuleJson(baseVersion.getAcceptanceRuleJson());
            newVersion.setLlmAssistConfigJson(baseVersion.getLlmAssistConfigJson());
            newVersion.setProviderPlatformKey(baseVersion.getProviderPlatformKey());
            newVersion.setModelId(baseVersion.getModelId());
        } else {
            newVersion.setSchemaJson("{}");
            newVersion.setSchemaChecksum("");
        }
        newVersion.setWidgetCount(0);
        newVersion.setRequiredFieldCount(0);
        newVersion.setCreatedAt(Instant.now());
        newVersion.setUpdatedAt(Instant.now());
        templateVersionMapper.insert(newVersion);

        if (baseVersionId != null) {
            copyTemplateFieldsAndDimensions(baseVersionId, newVersion.getId());
        }

        syncTaskCurrentTemplateVersion(taskId, newVersion.getId());
        return toVersionSummary(newVersion);
    }

    private void copyTemplateFieldsAndDimensions(Long sourceId, Long targetId) {
        LambdaQueryWrapper<TemplateVersionFieldEntity> fWrapper = new LambdaQueryWrapper<>();
        fWrapper.eq(TemplateVersionFieldEntity::getTemplateVersionId, sourceId);
        List<TemplateVersionFieldEntity> sourceFields = templateVersionFieldMapper.selectList(fWrapper);
        for (TemplateVersionFieldEntity sf : sourceFields) {
            TemplateVersionFieldEntity nf = new TemplateVersionFieldEntity();
            nf.setTemplateVersionId(targetId);
            nf.setFieldCode(sf.getFieldCode());
            nf.setFieldPath(resolveFieldPath(sf));
            nf.setFieldTitle(sf.getFieldTitle());
            nf.setWidgetType(sf.getWidgetType());
            nf.setValueType(sf.getValueType());
            nf.setIsRequired(sf.getIsRequired());
            nf.setIsDisplayOnly(sf.getIsDisplayOnly());
            nf.setSortNo(sf.getSortNo());
            nf.setEnumOptionsJson(sf.getEnumOptionsJson());
            nf.setCreatedAt(Instant.now());
            nf.setUpdatedAt(Instant.now());
            templateVersionFieldMapper.insert(nf);
        }
        LambdaQueryWrapper<TemplateReviewDimensionEntity> dWrapper = new LambdaQueryWrapper<>();
        dWrapper.eq(TemplateReviewDimensionEntity::getTemplateVersionId, sourceId);
        List<TemplateReviewDimensionEntity> sourceDims = templateReviewDimensionMapper.selectList(dWrapper);
        for (TemplateReviewDimensionEntity sd : sourceDims) {
            TemplateReviewDimensionEntity nd = new TemplateReviewDimensionEntity();
            nd.setTemplateVersionId(targetId);
            nd.setDimensionKey(sd.getDimensionKey());
            nd.setDimensionName(sd.getDimensionName());
            nd.setDimensionDesc(sd.getDimensionDesc());
            nd.setWeight(sd.getWeight());
            nd.setScoreMin(sd.getScoreMin());
            nd.setScoreMax(sd.getScoreMax());
            nd.setPassThreshold(sd.getPassThreshold());
            nd.setRejectThreshold(sd.getRejectThreshold());
            nd.setPromptInstruction(sd.getPromptInstruction());
            nd.setManualReviewHint(sd.getManualReviewHint());
            nd.setSeverityLevel(sd.getSeverityLevel());
            nd.setSortNo(sd.getSortNo());
            nd.setRequiredFlag(sd.getRequiredFlag());
            nd.setCreatedAt(Instant.now());
            nd.setUpdatedAt(Instant.now());
            templateReviewDimensionMapper.insert(nd);
        }
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:template_save", "business:template:manage" })
    @Audit(entityType = "TEMPLATE_VERSION", actionCode = "template.save_draft", entityId = "#versionId")
    public TemplateVersionDetailFull saveDraft(Long versionId, Map<String, Object> schemaJson,
            String reviewPromptTemplate, List<TemplateReviewDimensionSummary> dimensions) {
        TemplateVersionEntity v = templateVersionMapper.selectById(versionId);
        if (v == null || v.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        if (!"DRAFT".equals(v.getStatus())) {
            throw new BusinessException(ErrorCode.TASK_STATUS_INVALID, "Only draft template can be edited");
        }
        Long linkedTaskId = resolveTaskIdForTemplateVersion(v);
        if (linkedTaskId != null) {
            TaskEntity linkedTask = taskMapper.selectById(linkedTaskId);
            if (linkedTask != null && linkedTask.getDeletedFlag() == 0) {
                TaskImportPayloadContract contract = TaskImportPayloadContractSupport.parseContract(objectMapper,
                        linkedTask.getImportPayloadContractJson());
                if (contract != null) {
                    TaskImportPayloadContractSupport.assertTemplateSchemaRespectsContract(objectMapper, schemaJson,
                            contract);
                }
            }
        }
        try {
            String schema = objectMapper.writeValueAsString(schemaJson);
            v.setSchemaJson(schema);
            v.setSchemaChecksum(DigestUtil.sha256Hex(schema));
        } catch (Exception e) {
            v.setSchemaJson("{}");
        }
        if (reviewPromptTemplate != null) {
            v.setReviewPromptTemplate(reviewPromptTemplate);
        }
        v.setUpdatedAt(Instant.now());
        templateVersionMapper.updateById(v);

        syncFieldsFromFormSchema(versionId, schemaJson);

        // dimensions == null 表示仅更新 FormSchema（及可选 Prompt），不替换审核维度
        if (dimensions != null) {
            replaceReviewDimensions(versionId, dimensions);
        }
        return getTemplateVersionDetail(versionId);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:template_save", "business:template:manage" })
    @Audit(entityType = "TEMPLATE_VERSION", actionCode = "template.save_review_config", entityId = "#versionId")
    public TemplateVersionDetailFull saveReviewConfig(Long versionId, String reviewPromptTemplate,
            String providerPlatformKey, String modelId, List<ReviewWorkflowLevelInput> reviewWorkflowLevels,
            List<TemplateReviewDimensionSummary> dimensions) {
        TemplateVersionEntity v = templateVersionMapper.selectById(versionId);
        if (v == null || v.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        if (!"DRAFT".equals(v.getStatus())) {
            throw new BusinessException(ErrorCode.TASK_STATUS_INVALID, "Only draft template can be edited");
        }
        v.setReviewPromptTemplate(reviewPromptTemplate != null ? reviewPromptTemplate : "");
        v.setProviderPlatformKey(providerPlatformKey);
        v.setModelId(modelId);
        if (reviewWorkflowLevels != null) {
            v.setReviewWorkflowJson(reviewWorkflowValidator.toJson(toReviewWorkflowLevels(reviewWorkflowLevels)));
        }
        v.setUpdatedAt(Instant.now());
        templateVersionMapper.updateById(v);
        replaceReviewDimensions(versionId, dimensions);
        return getTemplateVersionDetail(versionId);
    }

    private void replaceReviewDimensions(Long versionId, List<TemplateReviewDimensionSummary> dimensions) {
        LambdaQueryWrapper<TemplateReviewDimensionEntity> delWrapper = new LambdaQueryWrapper<>();
        delWrapper.eq(TemplateReviewDimensionEntity::getTemplateVersionId, versionId);
        templateReviewDimensionMapper.delete(delWrapper);

        if (dimensions == null) {
            return;
        }
        int sort = 0;
        for (TemplateReviewDimensionSummary d : dimensions) {
            TemplateReviewDimensionEntity nd = new TemplateReviewDimensionEntity();
            nd.setTemplateVersionId(versionId);
            nd.setDimensionKey(d.dimensionKey());
            nd.setDimensionName(d.dimensionName());
            nd.setDimensionDesc(d.dimensionDesc());
            nd.setWeight(d.weight());
            nd.setScoreMin(d.scoreMin());
            nd.setScoreMax(d.scoreMax());
            nd.setPassThreshold(d.passThreshold());
            nd.setRejectThreshold(d.rejectThreshold());
            nd.setPromptInstruction(d.promptInstruction());
            nd.setManualReviewHint(d.manualReviewHint());
            nd.setSeverityLevel(d.severityLevel());
            nd.setSortNo(++sort);
            nd.setRequiredFlag(d.requiredFlag());
            nd.setCreatedAt(Instant.now());
            nd.setUpdatedAt(Instant.now());
            templateReviewDimensionMapper.insert(nd);
        }
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:publish" })
    @Audit(entityType = "TEMPLATE_VERSION", actionCode = "template.publish", entityId = "#versionId")
    public TemplateVersionSummary publishVersion(Long versionId) {
        TemplateVersionEntity v = templateVersionMapper.selectById(versionId);
        if (v == null || v.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        if (!"DRAFT".equals(v.getStatus())) {
            throw new BusinessException(ErrorCode.TASK_STATUS_INVALID, "Only draft can be published");
        }
        v.setReviewWorkflowJson(reviewWorkflowValidator.validateAndSerializeJson(v.getReviewWorkflowJson()));

        LambdaQueryWrapper<TemplateReviewDimensionEntity> dw = new LambdaQueryWrapper<>();
        dw.eq(TemplateReviewDimensionEntity::getTemplateVersionId, versionId);
        List<TemplateReviewDimensionEntity> dims = templateReviewDimensionMapper.selectList(dw);
        if (!dims.isEmpty()) {
            java.math.BigDecimal totalWeight = dims.stream()
                    .map(d -> d.getWeight() != null ? d.getWeight() : java.math.BigDecimal.ZERO)
                    .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
            if (totalWeight.compareTo(new java.math.BigDecimal("100")) != 0) {
                throw new BusinessException(ErrorCode.INVALID_OPERATION,
                        "Sum of review dimensions weights must be exactly 100");
            }
        }

        LambdaQueryWrapper<TemplateVersionEntity> currentWrapper = new LambdaQueryWrapper<>();
        currentWrapper.eq(TemplateVersionEntity::getTaskId, v.getTaskId());
        currentWrapper.eq(TemplateVersionEntity::getIsCurrent, 1);
        currentWrapper.ne(TemplateVersionEntity::getId, versionId);
        List<TemplateVersionEntity> others = templateVersionMapper.selectList(currentWrapper);
        for (TemplateVersionEntity ov : others) {
            ov.setIsCurrent(0);
            ov.setUpdatedAt(Instant.now());
            templateVersionMapper.updateById(ov);
        }

        v.setStatus("PUBLISHED");
        v.setIsCurrent(1);
        v.setPublishedAt(Instant.now());
        v.setUpdatedAt(Instant.now());
        templateVersionMapper.updateById(v);
        Long taskId = resolveTaskIdForTemplateVersion(v);
        if (taskId != null) {
            syncTaskCurrentTemplateVersion(taskId, v.getId());
        }
        return toVersionSummary(v);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:update" })
    @Audit(entityType = "TEMPLATE_VERSION", actionCode = "template.set_as_current", entityId = "#versionId")
    public void setAsCurrent(Long versionId) {
        TemplateVersionEntity v = templateVersionMapper.selectById(versionId);
        if (v == null || v.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        if (!"PUBLISHED".equals(v.getStatus())) {
            throw new BusinessException(ErrorCode.TASK_STATUS_INVALID, "Only published version can be set as current");
        }
        LambdaQueryWrapper<TemplateVersionEntity> currentWrapper = new LambdaQueryWrapper<>();
        currentWrapper.eq(TemplateVersionEntity::getTaskId, v.getTaskId());
        currentWrapper.eq(TemplateVersionEntity::getIsCurrent, 1);
        List<TemplateVersionEntity> others = templateVersionMapper.selectList(currentWrapper);
        for (TemplateVersionEntity ov : others) {
            ov.setIsCurrent(0);
            ov.setUpdatedAt(Instant.now());
            templateVersionMapper.updateById(ov);
        }
        v.setIsCurrent(1);
        v.setUpdatedAt(Instant.now());
        templateVersionMapper.updateById(v);
        Long taskId = resolveTaskIdForTemplateVersion(v);
        if (taskId != null) {
            syncTaskCurrentTemplateVersion(taskId, v.getId());
        }
    }

    private void syncTaskCurrentTemplateVersion(Long taskId, Long versionId) {
        if (taskId == null || versionId == null) {
            return;
        }
        TaskEntity task = taskMapper.selectById(taskId);
        if (task == null || task.getDeletedFlag() == 1) {
            return;
        }
        if (versionId.equals(task.getCurrentTemplateVersionId())) {
            return;
        }
        task.setCurrentTemplateVersionId(versionId);
        task.setUpdatedAt(Instant.now());
        taskMapper.updateById(task);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:update" })
    @Audit(entityType = "TEMPLATE_VERSION", actionCode = "template.archive", entityId = "#versionId")
    public void archiveVersion(Long versionId, String reason) {
        TemplateVersionEntity v = templateVersionMapper.selectById(versionId);
        if (v == null || v.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        v.setStatus("ARCHIVED");
        v.setArchivedAt(Instant.now());
        v.setArchivedReason(reason);
        v.setUpdatedAt(Instant.now());
        templateVersionMapper.updateById(v);
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public VersionDiffResult compareVersions(Long v1Id, Long v2Id) {
        TemplateVersionEntity v1 = templateVersionMapper.selectById(v1Id);
        TemplateVersionEntity v2 = templateVersionMapper.selectById(v2Id);
        if (v1 == null || v2 == null || v1.getDeletedFlag() == 1 || v2.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        Map<String, Object> schema1 = parseJsonMap(v1.getSchemaJson());
        Map<String, Object> schema2 = parseJsonMap(v2.getSchemaJson());
        Object props1 = schema1.get("properties");
        Object props2 = schema2.get("properties");
        if (!(props1 instanceof Map))
            props1 = Collections.emptyMap();
        if (!(props2 instanceof Map))
            props2 = Collections.emptyMap();
        VersionDiffService.DiffResult result = VersionDiffService.compareSchemas(v1Id, v2Id,
                (Map<String, Object>) props1, (Map<String, Object>) props2);
        return new VersionDiffResult(result.v1Id(), result.v2Id(), result.addedFields(),
                result.removedFields(), result.modifiedFields());
    }

    private TemplateVersionSummary toVersionSummary(TemplateVersionEntity e) {
        return new TemplateVersionSummary(e.getId(), e.getTaskId(), e.getVersionNo(), e.getTemplateName(),
                e.getStatus(), e.getPublishedAt(), e.getCreatedAt(), e.getTemplateId(), null,
                e.getIsCurrent(), e.getCreatedBy(), userDisplayNameResolver.resolve(e.getCreatedBy()), null, null);
    }

    private String resolveTaskCodeForCreate(String taskCode) {
        if (taskCode == null || taskCode.isBlank()) {
            return "TASK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }
        return taskCode.trim();
    }

    private void assertTaskCodeAvailable(String taskCode) {
        LambdaQueryWrapper<TaskEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TaskEntity::getDeletedFlag, 0);
        wrapper.eq(TaskEntity::getTaskCode, taskCode);
        Long existingCount = taskMapper.selectCount(wrapper);
        if (existingCount != null && existingCount > 0) {
            throw new BusinessException(ErrorCode.TASK_CODE_DUPLICATE,
                    "Task code already exists: " + taskCode);
        }
    }

    private void syncTaskReviewWorkflowFromTemplate(TaskEntity task, Long templateVersionId) {
        if (task == null || templateVersionId == null) {
            return;
        }
        if (task.getReviewWorkflowJson() != null && !task.getReviewWorkflowJson().isBlank()) {
            return;
        }
        TemplateVersionEntity version = templateVersionMapper.selectById(templateVersionId);
        if (version == null || version.getDeletedFlag() == 1) {
            return;
        }
        String workflowJson = version.getReviewWorkflowJson();
        if (workflowJson == null || workflowJson.isBlank()) {
            return;
        }
        task.setReviewWorkflowJson(reviewWorkflowValidator.validateAndSerializeJson(workflowJson));
    }

    private List<ReviewWorkflowLevel> toReviewWorkflowLevels(List<ReviewWorkflowLevelInput> inputs) {
        if (inputs == null) {
            return List.of();
        }
        return inputs.stream()
                .map(input -> new ReviewWorkflowLevel(
                        input.key().trim(),
                        input.label().trim(),
                        input.actions() == null
                                ? List.of()
                                : input.actions().stream()
                                        .map(action -> action.trim().toLowerCase(Locale.ROOT))
                                        .toList()))
                .toList();
    }

    private List<ReviewWorkflowLevelDto> toReviewWorkflowLevelDtos(String reviewWorkflowJson) {
        return reviewWorkflowResolver.parseDefinition(reviewWorkflowJson).stream()
                .map(level -> new ReviewWorkflowLevelDto(
                        level.key(),
                        level.label(),
                        reviewWorkflowResolver.stageNo(reviewWorkflowJson, level.key()),
                        reviewWorkflowResolver.isFinalLevel(reviewWorkflowJson, level.key()),
                        level.actions()))
                .toList();
    }
}
