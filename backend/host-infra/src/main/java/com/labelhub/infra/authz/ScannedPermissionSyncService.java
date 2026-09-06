package com.labelhub.infra.authz;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.authz.export.PermissionCodeMetadata;
import com.labelhub.core.authz.export.ScannedPermissionManifest;
import com.labelhub.domain.model.Status;
import com.labelhub.infra.persistence.entity.PermissionEntity;
import com.labelhub.infra.persistence.mapper.PermissionMapper;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class ScannedPermissionSyncService {
    private static final Logger log = LoggerFactory.getLogger(ScannedPermissionSyncService.class);

    private final PermissionMapper permissionMapper;

    public ScannedPermissionSyncService(PermissionMapper permissionMapper) {
        this.permissionMapper = permissionMapper;
    }

    @Transactional
    public int syncFromManifest(ScannedPermissionManifest manifest) {
        if (manifest == null || manifest.permissions() == null || manifest.permissions().isEmpty()) {
            log.info("Scanned permission manifest is empty, skip sync");
            return 0;
        }

        Set<String> existingCodes = loadExistingPermissionCodes();
        int inserted = 0;
        for (ScannedPermissionManifest.PermissionItem item : manifest.permissions()) {
            if (item.code() == null || item.code().isBlank() || existingCodes.contains(item.code())) {
                continue;
            }
            PermissionEntity entity = new PermissionEntity();
            entity.setPermissionCode(item.code());
            entity.setPermissionName(PermissionCodeMetadata.permissionName(item.code()));
            entity.setModuleCode(PermissionCodeMetadata.moduleCode(item.code()));
            entity.setApiPattern(null);
            entity.setStatus(Status.ACTIVE);
            permissionMapper.insert(entity);
            existingCodes.add(item.code());
            inserted++;
            log.info("Registered scanned permission: {}", item.code());
        }

        if (inserted > 0) {
            log.info("Synced {} scanned permission(s) into permissions table", inserted);
        } else {
            log.info("All scanned permissions already exist in permissions table");
        }
        return inserted;
    }

    private Set<String> loadExistingPermissionCodes() {
        List<PermissionEntity> entities = permissionMapper.selectList(new LambdaQueryWrapper<PermissionEntity>()
                .eq(PermissionEntity::getDeletedFlag, 0));
        Set<String> codes = HashSet.newHashSet(entities.size());
        for (PermissionEntity entity : entities) {
            if (entity.getPermissionCode() != null && !entity.getPermissionCode().isBlank()) {
                codes.add(entity.getPermissionCode());
            }
        }
        return codes;
    }
}
