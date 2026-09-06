package com.labelhub.infra.business.dimension.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.audit.Audit;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.DimensionPackSaveCommand;
import com.labelhub.core.business.BusinessDtos.TemplateReviewDimensionPackSummary;
import com.labelhub.core.business.BusinessDtos.TemplateReviewDimensionSummary;
import com.labelhub.core.business.DimensionPackService;
import com.labelhub.core.business.TaskService;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.infra.lowcode.query.MybatisQueryApplier;
import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.lowcode.query.spec.DimensionPackQuerySpec;
import com.labelhub.infra.persistence.entity.TemplateReviewDimensionPackEntity;
import com.labelhub.infra.persistence.mapper.TemplateReviewDimensionPackMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbDimensionPackService implements DimensionPackService {
    private static final ResourceQuerySpec<TemplateReviewDimensionPackEntity> QUERY_SPEC = DimensionPackQuerySpec
            .build();
    private static final TypeReference<List<Map<String, Object>>> DIMENSION_SPECS_TYPE = new TypeReference<>() {
    };

    private final TemplateReviewDimensionPackMapper packMapper;
    private final MybatisQueryApplier queryApplier;
    private final ObjectMapper objectMapper;
    private final TaskService taskService;

    public DbDimensionPackService(TemplateReviewDimensionPackMapper packMapper,
            MybatisQueryApplier queryApplier, ObjectMapper objectMapper, TaskService taskService) {
        this.packMapper = packMapper;
        this.queryApplier = queryApplier;
        this.objectMapper = objectMapper;
        this.taskService = taskService;
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public PageResponse<TemplateReviewDimensionPackSummary> listPacks(ParsedListQuery query) {
        LambdaQueryWrapper<TemplateReviewDimensionPackEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TemplateReviewDimensionPackEntity::getDeletedFlag, 0);
        if (query.keyword() != null && !query.keyword().isBlank()) {
            wrapper.and(w -> w.like(TemplateReviewDimensionPackEntity::getPackName, query.keyword())
                    .or().like(TemplateReviewDimensionPackEntity::getPackCode, query.keyword()));
        }
        queryApplier.apply(wrapper, query, QUERY_SPEC);
        if (query.sort().isEmpty()) {
            wrapper.orderByAsc(TemplateReviewDimensionPackEntity::getSortNo)
                    .orderByDesc(TemplateReviewDimensionPackEntity::getCreatedAt);
        }
        IPage<TemplateReviewDimensionPackEntity> pageResult = packMapper
                .selectPage(new Page<>(query.page(), query.pageSize()), wrapper);
        return PageResponse.of(pageResult.getTotal(), query.page(), query.pageSize(),
                pageResult.getRecords().stream().map(entity -> toSummary(entity, false)).toList());
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public TemplateReviewDimensionPackSummary getPackDetail(Long id) {
        TemplateReviewDimensionPackEntity e = requirePack(id);
        return toSummary(e, true);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin" })
    @Audit(entityType = "DIMENSION_PACK", actionCode = "dimension_pack.create", entityId = "#result.id()", after = com.labelhub.core.audit.AuditSnapshotSource.RESULT)
    public TemplateReviewDimensionPackSummary createPack(DimensionPackSaveCommand command) {
        TemplateReviewDimensionPackEntity e = new TemplateReviewDimensionPackEntity();
        applyCommand(e, command);
        e.setStatus("ACTIVE");
        e.setIsSystemPack(0);
        e.setCreatedAt(Instant.now());
        e.setUpdatedAt(Instant.now());
        packMapper.insert(e);
        return toSummary(e, true);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin" })
    @Audit(entityType = "DIMENSION_PACK", actionCode = "dimension_pack.update", entityId = "#id")
    public TemplateReviewDimensionPackSummary updatePack(Long id, DimensionPackSaveCommand command) {
        TemplateReviewDimensionPackEntity e = requirePack(id);
        applyCommand(e, command);
        e.setUpdatedAt(Instant.now());
        packMapper.updateById(e);
        return toSummary(e, true);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin" })
    @Audit(entityType = "DIMENSION_PACK", actionCode = "dimension_pack.update_status", entityId = "#id")
    public void updatePackStatus(Long id, String status) {
        TemplateReviewDimensionPackEntity e = requirePack(id);
        e.setStatus(status);
        e.setUpdatedAt(Instant.now());
        packMapper.updateById(e);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin" })
    @Audit(entityType = "DIMENSION_PACK", actionCode = "dimension_pack.delete", entityId = "#id")
    public void deletePack(Long id) {
        TemplateReviewDimensionPackEntity e = requirePack(id);
        e.setDeletedFlag(1);
        e.setUpdatedAt(Instant.now());
        packMapper.updateById(e);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:template_save" })
    @Audit(entityType = "DIMENSION_PACK", actionCode = "dimension_pack.apply", entityId = "#packId")
    public void applyPackToTemplateVersion(Long packId, Long templateVersionId) {
        TemplateReviewDimensionPackEntity pack = requirePack(packId);
        if (!"ACTIVE".equals(pack.getStatus())) {
            throw new BusinessException(ErrorCode.TEMPLATE_STATUS_INVALID, "Dimension pack is not active");
        }
        var detail = taskService.getTemplateVersionDetail(templateVersionId);
        if (!"DRAFT".equals(detail.status())) {
            throw new BusinessException(ErrorCode.TASK_STATUS_INVALID, "Only draft template can apply dimension pack");
        }
        List<TemplateReviewDimensionSummary> dimensions = mapPackSpecsToDimensions(
                templateVersionId, readDimensionSpecs(pack));
        if (dimensions.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Dimension pack has no active dimensions");
        }
        taskService.saveDraft(templateVersionId, detail.schemaJson(), null, dimensions);
    }

    private TemplateReviewDimensionPackEntity requirePack(Long id) {
        TemplateReviewDimensionPackEntity e = packMapper.selectById(id);
        if (e == null || e.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TEMPLATE_NOT_FOUND);
        }
        return e;
    }

    private void applyCommand(TemplateReviewDimensionPackEntity entity, DimensionPackSaveCommand command) {
        List<Map<String, Object>> dimensions = command.dimensions() != null ? command.dimensions() : List.of();
        entity.setPackName(command.packName());
        entity.setPackCode(command.packCode());
        entity.setPackDesc(command.packDesc() != null ? command.packDesc() : "");
        entity.setSceneCode(command.sceneCode() != null ? command.sceneCode() : "GENERAL");
        entity.setSortNo(command.sortNo() != null ? command.sortNo() : 0);
        entity.setDimensionCount(dimensions.size());
        entity.setDimensionSpecsJson(writeDimensionSpecs(dimensions));
    }

    private String writeDimensionSpecs(List<Map<String, Object>> dimensions) {
        try {
            return objectMapper.writeValueAsString(dimensions);
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Invalid dimension specs");
        }
    }

    private List<Map<String, Object>> readDimensionSpecs(TemplateReviewDimensionPackEntity entity) {
        if (entity.getDimensionSpecsJson() == null || entity.getDimensionSpecsJson().isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(entity.getDimensionSpecsJson(), DIMENSION_SPECS_TYPE);
        } catch (Exception ex) {
            return List.of();
        }
    }

    private List<TemplateReviewDimensionSummary> mapPackSpecsToDimensions(
            Long templateVersionId, List<Map<String, Object>> specs) {
        List<Map<String, Object>> activeSpecs = specs.stream()
                .filter(spec -> !"INACTIVE".equals(String.valueOf(spec.get("status"))))
                .toList();
        if (activeSpecs.isEmpty()) {
            return List.of();
        }

        double totalRawWeight = activeSpecs.stream()
                .mapToDouble(spec -> readDouble(spec.get("weight"), 1.0))
                .sum();
        if (totalRawWeight <= 0) {
            totalRawWeight = activeSpecs.size();
        }

        List<TemplateReviewDimensionSummary> dimensions = new ArrayList<>();
        int sortNo = 0;
        BigDecimal assignedWeight = BigDecimal.ZERO;
        for (int i = 0; i < activeSpecs.size(); i++) {
            Map<String, Object> spec = activeSpecs.get(i);
            BigDecimal weight;
            if (i == activeSpecs.size() - 1) {
                weight = BigDecimal.valueOf(100).subtract(assignedWeight).setScale(2, RoundingMode.HALF_UP);
            } else {
                double rawWeight = readDouble(spec.get("weight"), 1.0);
                weight = BigDecimal.valueOf(rawWeight / totalRawWeight * 100.0).setScale(2, RoundingMode.HALF_UP);
                assignedWeight = assignedWeight.add(weight);
            }
            dimensions.add(new TemplateReviewDimensionSummary(
                    null,
                    templateVersionId,
                    readString(spec.get("dimensionCode")),
                    readString(spec.get("dimensionName")),
                    null,
                    weight,
                    readBigDecimal(spec.get("scoreMin"), BigDecimal.ZERO),
                    readBigDecimal(spec.get("scoreMax"), new BigDecimal("100")),
                    readBigDecimalOrNull(spec.get("passThreshold")),
                    readBigDecimalOrNull(spec.get("rejectThreshold")),
                    readStringOrNull(spec.get("promptInstruction")),
                    null,
                    "MEDIUM",
                    readInt(spec.get("sortNo"), ++sortNo),
                    1));
        }
        return dimensions;
    }

    private String readString(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private String readStringOrNull(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    private int readInt(Object value, int fallback) {
        if (value == null || "".equals(value)) {
            return fallback;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private double readDouble(Object value, double fallback) {
        if (value == null || "".equals(value)) {
            return fallback;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private BigDecimal readBigDecimal(Object value, BigDecimal fallback) {
        if (value == null || "".equals(value)) {
            return fallback;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        try {
            return new BigDecimal(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private BigDecimal readBigDecimalOrNull(Object value) {
        if (value == null || "".equals(value)) {
            return null;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        try {
            return new BigDecimal(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private TemplateReviewDimensionPackSummary toSummary(TemplateReviewDimensionPackEntity e,
            boolean includeDimensions) {
        return new TemplateReviewDimensionPackSummary(
                e.getId(),
                e.getPackCode() != null ? e.getPackCode() : "",
                e.getPackName(),
                e.getPackDesc() != null ? e.getPackDesc() : "",
                e.getSceneCode() != null ? e.getSceneCode() : "",
                e.getIsSystemPack() != null ? e.getIsSystemPack() : 0,
                e.getSortNo() != null ? e.getSortNo() : 0,
                e.getStatus() != null ? e.getStatus() : "",
                e.getCreatedAt(),
                includeDimensions ? readDimensionSpecs(e) : Collections.emptyList());
    }
}
