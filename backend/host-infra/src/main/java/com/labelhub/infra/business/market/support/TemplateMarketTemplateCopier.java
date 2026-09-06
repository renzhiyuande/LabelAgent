package com.labelhub.infra.business.market.support;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.infra.persistence.entity.TemplateMarketEntity;
import com.labelhub.infra.persistence.entity.TemplateReviewDimensionEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionFieldEntity;
import com.labelhub.infra.persistence.entity.TemplatesEntity;
import com.labelhub.infra.persistence.mapper.TemplateReviewDimensionMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionFieldMapper;
import com.labelhub.infra.persistence.mapper.TemplatesMapper;
import java.time.Instant;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class TemplateMarketTemplateCopier {
    private final TemplatesMapper templatesMapper;
    private final TemplateVersionFieldMapper templateVersionFieldMapper;
    private final TemplateReviewDimensionMapper templateReviewDimensionMapper;

    public TemplateMarketTemplateCopier(
            TemplatesMapper templatesMapper,
            TemplateVersionFieldMapper templateVersionFieldMapper,
            TemplateReviewDimensionMapper templateReviewDimensionMapper) {
        this.templatesMapper = templatesMapper;
        this.templateVersionFieldMapper = templateVersionFieldMapper;
        this.templateReviewDimensionMapper = templateReviewDimensionMapper;
    }

    public String resolveInstallTemplateCode(String baseCode, Long marketId) {
        String sanitized = baseCode != null && !baseCode.isBlank() ? baseCode.trim() : "TMPL";
        String candidate = sanitized + "-M" + marketId;
        int suffix = 0;
        while (templateCodeExists(candidate)) {
            suffix++;
            candidate = sanitized + "-M" + marketId + "-" + suffix;
        }
        return candidate;
    }

    public void copyVersionContent(
            TemplateVersionEntity target, TemplateVersionEntity source, TemplateMarketEntity market) {
        target.setSchemaJson(firstNonBlank(source.getSchemaJson(), market.getSchemaJson(), "{}"));
        target.setSchemaChecksum(firstNonBlank(source.getSchemaChecksum(), ""));
        target.setReviewPromptTemplate(
                firstNonBlank(source.getReviewPromptTemplate(), market.getReviewPromptTemplate()));
        target.setReviewOutputSchemaJson(
                firstNonBlank(source.getReviewOutputSchemaJson(), market.getReviewOutputSchemaJson()));
        target.setReviewWorkflowJson(firstNonBlank(source.getReviewWorkflowJson(), market.getReviewWorkflowJson()));
        target.setAcceptanceRuleJson(firstNonBlank(source.getAcceptanceRuleJson(), market.getAcceptanceRuleJson()));
        target.setLlmAssistConfigJson(firstNonBlank(source.getLlmAssistConfigJson(), market.getLlmAssistConfigJson()));
        target.setProviderPlatformKey(source.getProviderPlatformKey());
        target.setModelId(source.getModelId());
    }

    public void copyTemplateFieldsAndDimensions(Long sourceVersionId, Long targetVersionId) {
        LambdaQueryWrapper<TemplateVersionFieldEntity> fieldWrapper = new LambdaQueryWrapper<>();
        fieldWrapper.eq(TemplateVersionFieldEntity::getTemplateVersionId, sourceVersionId);
        List<TemplateVersionFieldEntity> sourceFields = templateVersionFieldMapper.selectList(fieldWrapper);
        Instant now = Instant.now();
        for (TemplateVersionFieldEntity sourceField : sourceFields) {
            TemplateVersionFieldEntity copied = new TemplateVersionFieldEntity();
            copied.setTemplateVersionId(targetVersionId);
            copied.setFieldCode(sourceField.getFieldCode());
            copied.setFieldPath(resolveFieldPath(sourceField));
            copied.setFieldTitle(sourceField.getFieldTitle());
            copied.setWidgetType(sourceField.getWidgetType());
            copied.setValueType(sourceField.getValueType());
            copied.setIsRequired(sourceField.getIsRequired());
            copied.setIsDisplayOnly(sourceField.getIsDisplayOnly());
            copied.setSortNo(sourceField.getSortNo());
            copied.setEnumOptionsJson(sourceField.getEnumOptionsJson());
            copied.setCreatedAt(now);
            copied.setUpdatedAt(now);
            templateVersionFieldMapper.insert(copied);
        }

        LambdaQueryWrapper<TemplateReviewDimensionEntity> dimensionWrapper = new LambdaQueryWrapper<>();
        dimensionWrapper.eq(TemplateReviewDimensionEntity::getTemplateVersionId, sourceVersionId);
        List<TemplateReviewDimensionEntity> sourceDimensions = templateReviewDimensionMapper
                .selectList(dimensionWrapper);
        for (TemplateReviewDimensionEntity sourceDimension : sourceDimensions) {
            TemplateReviewDimensionEntity copied = new TemplateReviewDimensionEntity();
            copied.setTemplateVersionId(targetVersionId);
            copied.setDimensionKey(sourceDimension.getDimensionKey());
            copied.setDimensionName(sourceDimension.getDimensionName());
            copied.setDimensionDesc(sourceDimension.getDimensionDesc());
            copied.setWeight(sourceDimension.getWeight());
            copied.setScoreMin(sourceDimension.getScoreMin());
            copied.setScoreMax(sourceDimension.getScoreMax());
            copied.setPassThreshold(sourceDimension.getPassThreshold());
            copied.setRejectThreshold(sourceDimension.getRejectThreshold());
            copied.setPromptInstruction(sourceDimension.getPromptInstruction());
            copied.setManualReviewHint(sourceDimension.getManualReviewHint());
            copied.setSeverityLevel(sourceDimension.getSeverityLevel());
            copied.setSortNo(sourceDimension.getSortNo());
            copied.setRequiredFlag(sourceDimension.getRequiredFlag());
            copied.setCreatedAt(now);
            copied.setUpdatedAt(now);
            templateReviewDimensionMapper.insert(copied);
        }
    }

    private boolean templateCodeExists(String templateCode) {
        LambdaQueryWrapper<TemplatesEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TemplatesEntity::getDeletedFlag, 0);
        wrapper.eq(TemplatesEntity::getTemplateCode, templateCode);
        Long count = templatesMapper.selectCount(wrapper);
        return count != null && count > 0;
    }

    private static String resolveFieldPath(TemplateVersionFieldEntity source) {
        if (source.getFieldPath() != null && !source.getFieldPath().isBlank()) {
            return source.getFieldPath();
        }
        return source.getFieldCode();
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return values.length > 0 ? values[values.length - 1] : "";
    }
}
