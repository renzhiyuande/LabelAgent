package com.labelhub.infra.system.admin;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.audit.Audit;
import com.labelhub.core.audit.AuditSnapshotSource;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.core.lowcode.LowCodeDtos.OptionSourceItem;
import com.labelhub.core.system.SystemDtos.DictItemCommand;
import com.labelhub.core.system.SystemDtos.DictItemSummary;
import com.labelhub.core.system.SystemDtos.DictTypeCommand;
import com.labelhub.core.system.SystemDtos.DictTypeSummary;
import com.labelhub.core.system.SystemDtos.PageQuery;
import com.labelhub.domain.model.Status;
import com.labelhub.infra.persistence.entity.DictItemEntity;
import com.labelhub.infra.persistence.entity.DictTypeEntity;
import com.labelhub.infra.persistence.mapper.DictItemMapper;
import com.labelhub.infra.persistence.mapper.DictTypeMapper;
import com.labelhub.infra.lowcode.query.MybatisQueryApplier;
import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.lowcode.query.spec.DictTypeQuerySpec;
import com.labelhub.infra.system.admin.mapper.DictAdminMapper;
import com.labelhub.infra.util.Jsons;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DictAdminService {
    private static final ResourceQuerySpec<DictTypeEntity> DICT_TYPE_QUERY_SPEC = DictTypeQuerySpec.build();

    private final DictTypeMapper dictTypeMapper;
    private final DictItemMapper dictItemMapper;
    private final AdminSupport adminSupport;
    private final MybatisQueryApplier queryApplier;
    private final DictAdminMapper dictAdminMapper;

    public DictAdminService(
            DictTypeMapper dictTypeMapper,
            DictItemMapper dictItemMapper,
            AdminSupport adminSupport,
            MybatisQueryApplier queryApplier,
            DictAdminMapper dictAdminMapper) {
        this.dictTypeMapper = dictTypeMapper;
        this.dictItemMapper = dictItemMapper;
        this.adminSupport = adminSupport;
        this.queryApplier = queryApplier;
        this.dictAdminMapper = dictAdminMapper;
    }

    @RequireAnyPermission({"system:admin"})
    public PageResponse<DictTypeSummary> listDictTypes(PageQuery query) {
        var wrapper = adminSupport.<DictTypeEntity>activeWrapper();
        if (query.keyword() != null && !query.keyword().isBlank()) {
            wrapper.like(DictTypeEntity::getDictCode, query.keyword());
        }
        var page = dictTypeMapper.selectPage(adminSupport.page(query), wrapper);
        return PageResponse.of(page.getTotal(), query.normalizedPage(), query.normalizedPageSize(),
                page.getRecords().stream().map(this::toDictTypeSummary).toList());
    }

    @RequireAnyPermission({"system:admin"})
    public PageResponse<DictTypeSummary> listDictTypes(ParsedListQuery query) {
        var wrapper = adminSupport.<DictTypeEntity>activeWrapper();
        if (query.keyword() != null && !query.keyword().isBlank()) {
            wrapper.and(item -> item.like(DictTypeEntity::getDictCode, query.keyword()).or()
                    .like(DictTypeEntity::getDictName, query.keyword()));
        }
        queryApplier.apply(wrapper, query, DICT_TYPE_QUERY_SPEC);
        var page = dictTypeMapper.selectPage(adminSupport.page(query.page(), query.pageSize()), wrapper);
        return PageResponse.of(page.getTotal(), query.page(), query.pageSize(),
                page.getRecords().stream().map(this::toDictTypeSummary).toList());
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "DICT_TYPE", actionCode = "dictType.create", entityId = "#result.id()", after = AuditSnapshotSource.RESULT)
    @org.springframework.cache.annotation.CacheEvict(value = "dictTypes", allEntries = true)
    public DictTypeSummary createDictType(DictTypeCommand command) {
        DictTypeEntity entity = new DictTypeEntity();
        dictAdminMapper.applyType(command, entity);
        entity.setStatus(Status.ACTIVE);
        dictTypeMapper.insert(entity);
        return toDictTypeSummary(entity);
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "DICT_TYPE", actionCode = "dictType.update", entityId = "#id")
    @org.springframework.cache.annotation.CacheEvict(value = "dictTypes", allEntries = true)
    public DictTypeSummary updateDictType(Long id, DictTypeCommand command) {
        DictTypeEntity entity = adminSupport.requireEntity(dictTypeMapper.selectById(id), "dict type");
        dictAdminMapper.applyType(command, entity);
        dictTypeMapper.updateById(entity);
        return toDictTypeSummary(entity);
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "DICT_TYPE", actionCode = "dictType.status", entityId = "#id")
    public void setDictTypeStatus(Long id, String status) {
        DictTypeEntity entity = adminSupport.requireEntity(dictTypeMapper.selectById(id), "dict type");
        entity.setStatus(status);
        dictTypeMapper.updateById(entity);
    }

    @RequireAnyPermission({"system:admin"})
    public DictTypeSummary getDictType(Long id) {
        DictTypeEntity entity = adminSupport.requireEntity(dictTypeMapper.selectById(id), "dict type");
        return toDictTypeSummary(entity);
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "DICT_TYPE", actionCode = "dictType.delete", entityId = "#id")
    @org.springframework.cache.annotation.CacheEvict(value = "dictTypes", allEntries = true)
    public void deleteDictType(Long id) {
        DictTypeEntity entity = adminSupport.requireEntity(dictTypeMapper.selectById(id), "dict type");
        entity.setDeletedFlag(1);
        dictTypeMapper.updateById(entity);
        dictItemMapper.update(
                null,
                new LambdaUpdateWrapper<DictItemEntity>()
                        .eq(DictItemEntity::getDeletedFlag, 0)
                        .eq(DictItemEntity::getDictTypeId, id)
                        .set(DictItemEntity::getDeletedFlag, 1)
        );
    }

    @RequireAnyPermission({"system:admin"})
    public PageResponse<DictItemSummary> listDictItems(Long dictTypeId, PageQuery query) {
        var wrapper = new LambdaQueryWrapper<DictItemEntity>()
                .eq(DictItemEntity::getDeletedFlag, 0)
                .eq(DictItemEntity::getDictTypeId, dictTypeId);
        if (query.keyword() != null && !query.keyword().isBlank()) {
            wrapper.and(condition -> condition
                    .like(DictItemEntity::getItemCode, query.keyword())
                    .or()
                    .like(DictItemEntity::getItemLabel, query.keyword()));
        }
        wrapper.orderByAsc(DictItemEntity::getSortNo, DictItemEntity::getId);
        var page = dictItemMapper.selectPage(adminSupport.page(query), wrapper);
        return PageResponse.of(page.getTotal(), query.normalizedPage(), query.normalizedPageSize(),
                page.getRecords().stream().map(this::toDictItemSummary).toList());
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "DICT_ITEM", actionCode = "dictItem.create", entityId = "#result.id()", after = AuditSnapshotSource.RESULT)
    public DictItemSummary createDictItem(DictItemCommand command) {
        DictItemEntity entity = new DictItemEntity();
        applyDictItemCommand(entity, command);
        entity.setStatus(Status.ACTIVE);
        dictItemMapper.insert(entity);
        return toDictItemSummary(entity);
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "DICT_ITEM", actionCode = "dictItem.update", entityId = "#id")
    public DictItemSummary updateDictItem(Long id, DictItemCommand command) {
        DictItemEntity entity = adminSupport.requireEntity(dictItemMapper.selectById(id), "dict item");
        applyDictItemCommand(entity, command);
        dictItemMapper.updateById(entity);
        return toDictItemSummary(entity);
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "DICT_ITEM", actionCode = "dictItem.status", entityId = "#id")
    public void setDictItemStatus(Long id, String status) {
        DictItemEntity entity = adminSupport.requireEntity(dictItemMapper.selectById(id), "dict item");
        entity.setStatus(status);
        dictItemMapper.updateById(entity);
    }

    @RequireAnyPermission({"system:admin"})
    public DictItemSummary getDictItem(Long id) {
        DictItemEntity entity = adminSupport.requireEntity(dictItemMapper.selectById(id), "dict item");
        return toDictItemSummary(entity);
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "DICT_ITEM", actionCode = "dictItem.delete", entityId = "#id")
    public void deleteDictItem(Long id) {
        DictItemEntity entity = adminSupport.requireEntity(dictItemMapper.selectById(id), "dict item");
        entity.setDeletedFlag(1);
        dictItemMapper.updateById(entity);
    }

    public List<DictItemSummary> getActiveDictItems(String dictCode) {
        DictTypeEntity type = dictTypeMapper.selectOne(new LambdaQueryWrapper<DictTypeEntity>()
                .eq(DictTypeEntity::getDeletedFlag, 0)
                .eq(DictTypeEntity::getStatus, Status.ACTIVE)
                .eq(DictTypeEntity::getDictCode, dictCode));
        if (type == null) {
            return List.of();
        }
        return dictItemMapper.selectList(new LambdaQueryWrapper<DictItemEntity>()
                        .eq(DictItemEntity::getDeletedFlag, 0)
                        .eq(DictItemEntity::getDictTypeId, type.getId())
                        .eq(DictItemEntity::getStatus, Status.ACTIVE)
                        .orderByAsc(DictItemEntity::getSortNo, DictItemEntity::getId))
                .stream()
                .map(this::toDictItemSummary)
                .toList();
    }

    public List<OptionItem> getActiveDictOptions(String dictCode) {
        return getActiveDictItems(dictCode).stream()
                .map(item -> new OptionItem(item.itemLabel(), item.itemValue(), item.className(), item.tone()))
                .toList();
    }

    /** 模板 remote.source 可选的字典数据源，key 形如 dict:{dictCode}。 */
    public List<OptionSourceItem> listActiveDictOptionSources() {
        return dictTypeMapper.selectList(new LambdaQueryWrapper<DictTypeEntity>()
                        .eq(DictTypeEntity::getDeletedFlag, 0)
                        .eq(DictTypeEntity::getStatus, Status.ACTIVE)
                        .orderByAsc(DictTypeEntity::getDictCode))
                .stream()
                .map(type -> new OptionSourceItem("dict:" + type.getDictCode(), type.getDictName()))
                .toList();
    }

    public DictTypeSummary toDictTypeSummary(DictTypeEntity entity) {
        return dictAdminMapper.toTypeSummary(entity);
    }

    public DictItemSummary toDictItemSummary(DictItemEntity entity) {
        DictItemSummary base = dictAdminMapper.toItemSummary(entity);
        Map<String, Object> ext = readExtJson(entity.getExtJson());
        return new DictItemSummary(
                base.id(),
                base.dictTypeId(),
                base.itemCode(),
                base.itemLabel(),
                base.itemValue(),
                base.sortNo(),
                base.isDefault(),
                base.status(),
                stringValue(ext.get("className")),
                stringValue(ext.get("tone")));
    }

    private void applyDictItemCommand(DictItemEntity entity, DictItemCommand command) {
        dictAdminMapper.applyItem(command, entity);
        entity.setSortNo(command.sortNo() == null ? 0 : command.sortNo());
        entity.setIsDefault(Boolean.TRUE.equals(command.isDefault()) ? 1 : 0);
        Map<String, Object> ext = readExtJson(entity.getExtJson());
        if (command.className() != null) {
            if (command.className().isBlank()) {
                ext.remove("className");
            } else {
                ext.put("className", command.className());
            }
        }
        if (command.tone() != null) {
            if (command.tone().isBlank()) {
                ext.remove("tone");
            } else {
                ext.put("tone", command.tone());
            }
        }
        entity.setExtJson(ext.isEmpty() ? null : Jsons.write(ext));
    }

    private Map<String, Object> readExtJson(String extJson) {
        if (extJson == null || extJson.isBlank()) {
            return new HashMap<>();
        }
        try {
            return new HashMap<>(Jsons.readMap(extJson));
        } catch (RuntimeException ex) {
            return new HashMap<>();
        }
    }

    private String stringValue(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }
}
