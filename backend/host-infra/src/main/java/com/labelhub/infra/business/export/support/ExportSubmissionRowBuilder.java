package com.labelhub.infra.business.export.support;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.infra.persistence.entity.AiReviewRecordEntity;
import com.labelhub.infra.persistence.entity.ReviewRecordEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.TaskItemEntity;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class ExportSubmissionRowBuilder {

    private static final List<String> DEFAULT_COLUMNS = List.of(
            "lifecycle.submissionId",
            "lifecycle.taskId",
            "lifecycle.itemId",
            "lifecycle.assignmentId",
            "lifecycle.labelerId",
            "lifecycle.status",
            "lifecycle.submitCount",
            "lifecycle.lastSubmittedAt",
            "lifecycle.finalizedAt",
            "annotate.__draftData");

    private ExportSubmissionRowBuilder() {
    }

    public static List<String> resolveSelectedFields(String fieldMapJson, ObjectMapper objectMapper) {
        if (fieldMapJson == null || fieldMapJson.isBlank()) {
            return DEFAULT_COLUMNS;
        }
        try {
            List<String> parsed = objectMapper.readValue(fieldMapJson, new TypeReference<List<String>>() {
            });
            if (parsed == null || parsed.isEmpty()) {
                return DEFAULT_COLUMNS;
            }
            return parsed.stream().map(String::trim).filter(s -> !s.isEmpty()).toList();
        } catch (Exception ex) {
            return DEFAULT_COLUMNS;
        }
    }

    public static boolean needsReviewData(List<String> fields) {
        return fields.stream().anyMatch(key -> key.startsWith(ExportFieldCatalogSupport.PREFIX_REVIEW));
    }

    public static boolean needsItemPayload(List<String> fields) {
        return fields.stream().anyMatch(key -> key.startsWith(ExportFieldCatalogSupport.PREFIX_PAYLOAD)
                || "lifecycle.sourceItemKey".equals(key)
                || "lifecycle.itemSeqNo".equals(key));
    }

    public static Map<String, Object> buildRawRow(
            SubmissionEntity submission,
            List<String> fields,
            TaskItemEntity item,
            ReviewRecordEntity humanReview,
            AiReviewRecordEntity aiReview,
            ObjectMapper objectMapper) {
        Map<String, Object> draftData = parseMap(submission.getDraftDataJson(), objectMapper);
        Map<String, Object> payloadData = item == null ? Map.of() : parseMap(item.getPayloadJson(), objectMapper);

        Map<String, Object> row = new LinkedHashMap<>();
        for (String fieldKey : fields) {
            Object value = resolveFieldValue(fieldKey, submission, item, draftData, payloadData, humanReview, aiReview);
            row.put(fieldKey, value);
        }
        return row;
    }

    public static Map<String, Object> buildRow(
            SubmissionEntity submission,
            List<String> fields,
            TaskItemEntity item,
            ReviewRecordEntity humanReview,
            AiReviewRecordEntity aiReview,
            ObjectMapper objectMapper,
            ExportFieldDisplaySupport.DisplayContext display) {
        Map<String, Object> raw = buildRawRow(submission, fields, item, humanReview, aiReview, objectMapper);
        if (display == null) {
            Map<String, Object> legacy = new LinkedHashMap<>();
            for (Map.Entry<String, Object> entry : raw.entrySet()) {
                legacy.put(fallbackColumnKey(entry.getKey()), entry.getValue());
            }
            return legacy;
        }
        return display.toDisplayRow(raw);
    }

    private static Object resolveFieldValue(
            String fieldKey,
            SubmissionEntity submission,
            TaskItemEntity item,
            Map<String, Object> draftData,
            Map<String, Object> payloadData,
            ReviewRecordEntity humanReview,
            AiReviewRecordEntity aiReview) {
        if (fieldKey.startsWith(ExportFieldCatalogSupport.PREFIX_LIFECYCLE)) {
            return resolveLifecycle(fieldKey, submission, item);
        }
        if (fieldKey.startsWith(ExportFieldCatalogSupport.PREFIX_PAYLOAD)) {
            return readPath(payloadData, stripPrefix(fieldKey, ExportFieldCatalogSupport.PREFIX_PAYLOAD));
        }
        if (fieldKey.startsWith(ExportFieldCatalogSupport.PREFIX_ANNOTATE)) {
            String path = stripPrefix(fieldKey, ExportFieldCatalogSupport.PREFIX_ANNOTATE);
            if ("__draftData".equals(path)) {
                return draftData.isEmpty() ? null : draftData;
            }
            return readPath(draftData, path);
        }
        if (fieldKey.startsWith(ExportFieldCatalogSupport.PREFIX_RUNTIME)) {
            return readPath(draftData, stripPrefix(fieldKey, ExportFieldCatalogSupport.PREFIX_RUNTIME));
        }
        if (fieldKey.startsWith(ExportFieldCatalogSupport.PREFIX_REVIEW)) {
            return resolveReview(fieldKey, humanReview, aiReview);
        }
        return null;
    }

    private static Object resolveLifecycle(String fieldKey, SubmissionEntity submission, TaskItemEntity item) {
        return switch (fieldKey) {
            case "lifecycle.submissionId" -> submission.getId();
            case "lifecycle.taskId" -> submission.getTaskId();
            case "lifecycle.itemId" -> submission.getItemId();
            case "lifecycle.assignmentId" -> submission.getAssignmentId();
            case "lifecycle.labelerId" -> submission.getLabelerId();
            case "lifecycle.status" -> submission.getCurrentStatus();
            case "lifecycle.submitCount" -> submission.getSubmitCount();
            case "lifecycle.lastSubmittedAt" -> submission.getLastSubmittedAt();
            case "lifecycle.finalizedAt" -> submission.getFinalizedAt();
            case "lifecycle.sourceItemKey" -> item == null ? null : item.getSourceItemKey();
            case "lifecycle.itemSeqNo" -> item == null ? null : item.getSeqNo();
            default -> null;
        };
    }

    private static Object resolveReview(
            String fieldKey,
            ReviewRecordEntity humanReview,
            AiReviewRecordEntity aiReview) {
        return switch (fieldKey) {
            case "review.lastHumanAction" -> humanReview == null ? null : humanReview.getAction();
            case "review.lastHumanLevel" -> humanReview == null ? null : humanReview.getReviewLevel();
            case "review.lastHumanComment" -> humanReview == null ? null : humanReview.getCommentText();
            case "review.lastHumanAt" -> humanReview == null ? null : humanReview.getDecidedAt();
            case "review.lastAiVerdict" -> aiReview == null ? null : aiReview.getVerdict();
            case "review.lastAiScore" -> aiReview == null ? null : aiReview.getTotalScore();
            case "review.lastAiSummary" -> aiReview == null ? null : aiReview.getSummaryText();
            case "review.lastAiAt" -> aiReview == null ? null : aiReview.getFinishedAt();
            default -> null;
        };
    }

    static String fallbackColumnKey(String fieldKey) {
        return fieldKey.replace('.', '_');
    }

    private static String stripPrefix(String fieldKey, String prefix) {
        return fieldKey.substring(prefix.length());
    }

    @SuppressWarnings("unchecked")
    private static Object readPath(Map<String, Object> data, String path) {
        if (path == null || path.isBlank() || data == null || data.isEmpty()) {
            return null;
        }
        Object current = data;
        for (String segment : path.split("\\.")) {
            if (!(current instanceof Map<?, ?> map)) {
                return null;
            }
            current = ((Map<String, Object>) map).get(segment);
        }
        return current;
    }

    private static Map<String, Object> parseMap(String json, ObjectMapper objectMapper) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {
            });
        } catch (Exception ex) {
            return Map.of();
        }
    }

    public static List<String> headersFor(
            List<String> fields,
            ExportFieldDisplaySupport.DisplayContext display) {
        if (display != null) {
            return display.headers();
        }
        List<String> headers = new ArrayList<>(fields.size());
        for (String field : fields) {
            headers.add(fallbackColumnKey(field));
        }
        return headers;
    }
}
