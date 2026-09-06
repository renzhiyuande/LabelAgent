package com.labelhub.infra.business.submission.support;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.infra.persistence.entity.SubmissionVersionEntity;
import com.labelhub.infra.persistence.mapper.SubmissionVersionMapper;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class SubmissionVersionReader {
    private final SubmissionVersionMapper submissionVersionMapper;
    private final ObjectMapper objectMapper;

    public SubmissionVersionReader(SubmissionVersionMapper submissionVersionMapper, ObjectMapper objectMapper) {
        this.submissionVersionMapper = submissionVersionMapper;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> readSubmitDataByVersionId(Long submissionVersionId) {
        if (submissionVersionId == null) {
            return Map.of();
        }
        SubmissionVersionEntity version = submissionVersionMapper.selectById(submissionVersionId);
        if (version == null || version.getDeletedFlag() == 1) {
            return Map.of();
        }
        return readMap(version.getSubmitDataJson());
    }

    public Map<String, Object> readPreviousSubmitData(Long submissionVersionId) {
        if (submissionVersionId == null) {
            return Map.of();
        }
        SubmissionVersionEntity version = submissionVersionMapper.selectById(submissionVersionId);
        if (version == null || version.getDeletedFlag() == 1 || version.getPreviousVersionId() == null) {
            return Map.of();
        }
        return readSubmitDataByVersionId(version.getPreviousVersionId());
    }

    private Map<String, Object> readMap(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {
            });
        } catch (Exception ignored) {
            return Map.of();
        }
    }
}
