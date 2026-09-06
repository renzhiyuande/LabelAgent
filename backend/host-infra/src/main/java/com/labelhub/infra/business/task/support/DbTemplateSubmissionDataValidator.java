package com.labelhub.infra.business.task.support;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.form.FormSchemaHtmlSanitizer;
import com.labelhub.core.lowcode.form.FormSchemaValidationOptions;
import com.labelhub.core.lowcode.form.FormSchemaValidator;
import com.labelhub.core.lowcode.form.TemplateSubmissionDataValidator;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbTemplateSubmissionDataValidator implements TemplateSubmissionDataValidator {

    private final TemplateVersionMapper templateVersionMapper;
    private final ObjectMapper objectMapper;

    public DbTemplateSubmissionDataValidator(
            TemplateVersionMapper templateVersionMapper,
            ObjectMapper objectMapper) {
        this.templateVersionMapper = templateVersionMapper;
        this.objectMapper = objectMapper;
    }

    @Override
    public void sanitizeAnnotateSubmitData(Long templateVersionId, Map<String, Object> submitData) {
        if (templateVersionId == null || submitData == null || submitData.isEmpty()) {
            return;
        }
        Map<String, Object> schemaRoot = loadSchemaRoot(templateVersionId);
        if (schemaRoot.isEmpty()) {
            return;
        }
        FormSchemaHtmlSanitizer.sanitizeAnnotatePayload(schemaRoot, submitData);
    }

    @Override
    public void validateAnnotateSubmitData(Long templateVersionId, Map<String, Object> submitData) {
        if (templateVersionId == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "提交缺少模板版本");
        }
        Map<String, Object> schemaRoot = loadSchemaRoot(templateVersionId);
        if (schemaRoot.isEmpty()) {
            return;
        }
        Map<String, Object> payload = submitData == null ? Map.of() : submitData;
        sanitizeAnnotateSubmitData(templateVersionId, payload);
        FormSchemaValidator.requireValidAnnotatePayload(
                schemaRoot,
                payload,
                FormSchemaValidationOptions.forAssignment());
    }

    private Map<String, Object> loadSchemaRoot(Long templateVersionId) {
        TemplateVersionEntity version = templateVersionMapper.selectById(templateVersionId);
        if (version == null || Integer.valueOf(1).equals(version.getDeletedFlag())) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND, "模板版本不存在");
        }
        return parseSchema(version.getSchemaJson());
    }

    private Map<String, Object> parseSchema(String schemaJson) {
        if (schemaJson == null || schemaJson.isBlank()) {
            return Map.of();
        }
        try {
            Map<String, Object> parsed = objectMapper.readValue(schemaJson, new TypeReference<>() {
            });
            return parsed == null ? Map.of() : parsed;
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "模板 schema 无法解析");
        }
    }
}
