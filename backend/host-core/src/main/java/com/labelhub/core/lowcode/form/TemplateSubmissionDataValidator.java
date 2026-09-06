package com.labelhub.core.lowcode.form;

import java.util.Map;

/**
 * 按模板版本 schema 校验标注提交数据的 SPI，由 infra 实现并在提交链路调用。
 */
public interface TemplateSubmissionDataValidator {

    /**
     * 按模板 schema 清洗富文本 HTML 字段（就地修改 {@code submitData}）。
     */
    void sanitizeAnnotateSubmitData(Long templateVersionId, Map<String, Object> submitData);

    /**
     * 校验失败时抛出 {@link com.labelhub.core.error.BusinessException}（{@code VALIDATION_ERROR}）。
     */
    void validateAnnotateSubmitData(Long templateVersionId, Map<String, Object> submitData);
}
