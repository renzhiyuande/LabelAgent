package com.labelhub.infra.business.task.support;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.business.market.support.TemplateMarketTemplateCopier;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.entity.TemplatesEntity;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.persistence.mapper.TemplatesMapper;
import java.time.Instant;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 将已有模板版本克隆到新任务（互不影响，不共享模板主表记录）。
 */
@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class TaskTemplateCloneSupport {
    private final TemplatesMapper templatesMapper;
    private final TemplateVersionMapper templateVersionMapper;
    private final TemplateMarketTemplateCopier templateCopier;

    public TaskTemplateCloneSupport(
            TemplatesMapper templatesMapper,
            TemplateVersionMapper templateVersionMapper,
            TemplateMarketTemplateCopier templateCopier) {
        this.templatesMapper = templatesMapper;
        this.templateVersionMapper = templateVersionMapper;
        this.templateCopier = templateCopier;
    }

    public Long cloneTemplateVersionToTask(TaskEntity task, Long sourceVersionId) {
        if (task == null || task.getId() == null || sourceVersionId == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "templateVersionId is required");
        }
        TemplateVersionEntity sourceVersion = requireSourceVersion(sourceVersionId);
        TemplatesEntity sourceTemplate = requireSourceTemplate(sourceVersion.getTemplateId());
        Instant now = Instant.now();

        TemplatesEntity targetTemplate = new TemplatesEntity();
        targetTemplate.setTaskId(task.getId());
        targetTemplate.setTemplateCode(resolveCloneTemplateCode(task.getTaskCode()));
        targetTemplate.setTemplateName(resolveCloneTemplateName(task.getTitle(), sourceTemplate.getTemplateName()));
        targetTemplate.setSceneCode(
                task.getSceneCode() != null && !task.getSceneCode().isBlank()
                        ? task.getSceneCode()
                        : (sourceTemplate.getSceneCode() != null ? sourceTemplate.getSceneCode() : "GENERAL"));
        targetTemplate.setDescriptionText(
                sourceTemplate.getDescriptionText() != null
                        ? "克隆自模板 " + sourceTemplate.getTemplateCode()
                        : "克隆自模板版本");
        targetTemplate.setLatestVersionNo(1);
        targetTemplate.setStatus("DRAFT");
        targetTemplate.setCreatedAt(now);
        targetTemplate.setUpdatedAt(now);
        templatesMapper.insert(targetTemplate);

        TemplateVersionEntity targetVersion = new TemplateVersionEntity();
        targetVersion.setTemplateId(targetTemplate.getId());
        targetVersion.setTaskId(task.getId());
        targetVersion.setVersionNo(1);
        targetVersion.setTemplateName(targetTemplate.getTemplateName());
        targetVersion.setStatus("DRAFT");
        targetVersion.setIsCurrent(1);
        copyVersionContent(targetVersion, sourceVersion);
        targetVersion.setWidgetCount(sourceVersion.getWidgetCount() != null ? sourceVersion.getWidgetCount() : 0);
        targetVersion.setRequiredFieldCount(
                sourceVersion.getRequiredFieldCount() != null ? sourceVersion.getRequiredFieldCount() : 0);
        targetVersion.setCreatedAt(now);
        targetVersion.setUpdatedAt(now);
        templateVersionMapper.insert(targetVersion);

        templateCopier.copyTemplateFieldsAndDimensions(sourceVersion.getId(), targetVersion.getId());

        targetTemplate.setCurrentTemplateVersionId(targetVersion.getId());
        targetTemplate.setUpdatedAt(now);
        templatesMapper.updateById(targetTemplate);

        return targetVersion.getId();
    }

    private TemplateVersionEntity requireSourceVersion(Long sourceVersionId) {
        TemplateVersionEntity version = templateVersionMapper.selectById(sourceVersionId);
        if (version == null || version.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TEMPLATE_NOT_FOUND, "Source template version not found");
        }
        if ("ARCHIVED".equals(version.getStatus())) {
            throw new BusinessException(ErrorCode.TEMPLATE_STATUS_INVALID, "Archived template version cannot be cloned");
        }
        return version;
    }

    private TemplatesEntity requireSourceTemplate(Long templateId) {
        if (templateId == null) {
            throw new BusinessException(ErrorCode.TEMPLATE_NOT_FOUND, "Source template not found");
        }
        TemplatesEntity template = templatesMapper.selectById(templateId);
        if (template == null || template.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TEMPLATE_NOT_FOUND, "Source template not found");
        }
        return template;
    }

    private String resolveCloneTemplateCode(String taskCode) {
        String base = taskCode != null && !taskCode.isBlank() ? taskCode.trim() : "TASK";
        String candidate = base + "-tpl";
        int suffix = 0;
        while (templateCodeExists(candidate)) {
            suffix++;
            candidate = base + "-tpl-" + suffix;
        }
        return candidate;
    }

    private String resolveCloneTemplateName(String taskTitle, String sourceTemplateName) {
        if (taskTitle != null && !taskTitle.isBlank()) {
            return taskTitle.trim() + " · 标注模板";
        }
        if (sourceTemplateName != null && !sourceTemplateName.isBlank()) {
            return sourceTemplateName.trim();
        }
        return "标注模板";
    }

    private boolean templateCodeExists(String templateCode) {
        LambdaQueryWrapper<TemplatesEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TemplatesEntity::getDeletedFlag, 0);
        wrapper.eq(TemplatesEntity::getTemplateCode, templateCode);
        Long count = templatesMapper.selectCount(wrapper);
        return count != null && count > 0;
    }

    private static void copyVersionContent(TemplateVersionEntity target, TemplateVersionEntity source) {
        target.setSchemaJson(source.getSchemaJson() != null && !source.getSchemaJson().isBlank() ? source.getSchemaJson() : "{}");
        target.setSchemaChecksum(source.getSchemaChecksum() != null ? source.getSchemaChecksum() : "");
        target.setReviewPromptTemplate(source.getReviewPromptTemplate());
        target.setReviewOutputSchemaJson(source.getReviewOutputSchemaJson());
        target.setReviewWorkflowJson(source.getReviewWorkflowJson());
        target.setAcceptanceRuleJson(source.getAcceptanceRuleJson());
        target.setLlmAssistConfigJson(source.getLlmAssistConfigJson());
        target.setProviderPlatformKey(source.getProviderPlatformKey());
        target.setModelId(source.getModelId());
    }
}
