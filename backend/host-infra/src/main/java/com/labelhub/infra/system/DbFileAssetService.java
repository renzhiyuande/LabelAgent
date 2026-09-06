package com.labelhub.infra.system;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.datapermission.DataResourceType;
import com.labelhub.core.datapermission.DataScope;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.system.FileAssetService;
import com.labelhub.core.system.SystemDtos.FileAssetDownload;
import com.labelhub.core.system.SystemDtos.FileAssetSummary;
import com.labelhub.infra.business.storage.service.MinioFileStorageService;
import com.labelhub.infra.datapermission.DataScopeApplier;
import com.labelhub.infra.lowcode.query.MybatisQueryApplier;
import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.lowcode.query.spec.FileAssetQuerySpec;
import com.labelhub.infra.persistence.entity.FileAssetEntity;
import com.labelhub.infra.persistence.mapper.FileAssetMapper;
import java.time.Instant;
import java.util.Objects;
import java.util.Set;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbFileAssetService implements FileAssetService {
    private static final String DOWNLOAD_PATH_PREFIX = "/api/v1/files/";
    private static final ResourceQuerySpec<FileAssetEntity> QUERY_SPEC = FileAssetQuerySpec.build();

    private final FileAssetMapper fileAssetMapper;
    private final MinioFileStorageService fileStorageService;
    private final CurrentUserContext currentUserContext;
    private final CurrentUserProvider currentUserProvider;
    private final MybatisQueryApplier queryApplier;

    public DbFileAssetService(
            FileAssetMapper fileAssetMapper,
            MinioFileStorageService fileStorageService,
            CurrentUserContext currentUserContext,
            CurrentUserProvider currentUserProvider,
            MybatisQueryApplier queryApplier) {
        this.fileAssetMapper = fileAssetMapper;
        this.fileStorageService = fileStorageService;
        this.currentUserContext = currentUserContext;
        this.currentUserProvider = currentUserProvider;
        this.queryApplier = queryApplier;
    }

    @Override
    @RequireAnyPermission({ "system:admin", "system:file:read" })
    @DataScope(resource = DataResourceType.FILE)
    public PageResponse<FileAssetSummary> listFiles(ParsedListQuery query) {
        LambdaQueryWrapper<FileAssetEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FileAssetEntity::getDeletedFlag, 0);
        DataScopeApplier.apply(wrapper);
        if (query.keyword() != null && !query.keyword().isBlank()) {
            wrapper.like(FileAssetEntity::getOriginalName, query.keyword().trim());
        }
        queryApplier.apply(wrapper, query, QUERY_SPEC);
        if (query.sort().isEmpty()) {
            wrapper.orderByDesc(FileAssetEntity::getUploadedAt);
        }
        IPage<FileAssetEntity> pageResult = fileAssetMapper.selectPage(new Page<>(query.page(), query.pageSize()),
                wrapper);
        return PageResponse.of(pageResult.getTotal(), query.page(), query.pageSize(),
                pageResult.getRecords().stream().map(this::toSummary).toList());
    }

    @Override
    @RequireAnyPermission({ "system:admin", "system:file:read" })
    public FileAssetSummary getFile(Long id) {
        return toSummary(requireAccessibleAsset(id));
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "system:file:upload" })
    public FileAssetSummary uploadFile(byte[] content, String originalName, String mimeType, String categoryCode) {
        if (content == null || content.length == 0) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "上传文件不能为空");
        }
        String safeName = originalName != null && !originalName.isBlank() ? originalName.trim() : "unnamed";
        String safeCategory = categoryCode != null && !categoryCode.isBlank() ? categoryCode.trim() : "form";
        Long userId = currentUserContext.requireUserId();
        Long fileId = fileStorageService.upload(content, safeName, mimeType, safeCategory, userId);
        return toSummary(fileStorageService.getAsset(fileId));
    }

    @Override
    @RequireAnyPermission({ "system:admin", "system:file:read" })
    public FileAssetDownload downloadFile(Long id) {
        FileAssetEntity asset = requireAccessibleAsset(id);
        touchLastAccessed(asset);
        byte[] content = fileStorageService.download(id);
        String contentType = asset.getMimeType() != null && !asset.getMimeType().isBlank()
                ? asset.getMimeType()
                : "application/octet-stream";
        return new FileAssetDownload(asset.getOriginalName(), contentType, content);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "system:file:delete" })
    public void deleteFile(Long id) {
        FileAssetEntity asset = requireAccessibleAsset(id);
        if (!isSystemAdmin() && !Objects.equals(asset.getUploadedBy(), currentUserContext.requireUserId())) {
            throw new BusinessException(ErrorCode.FILE_ACCESS_DENIED, "仅可删除本人上传的文件");
        }
        asset.setDeletedFlag(1);
        asset.setUpdatedAt(Instant.now());
        fileAssetMapper.updateById(asset);
    }

    private FileAssetEntity requireAccessibleAsset(Long id) {
        FileAssetEntity asset = fileStorageService.getAsset(id);
        if (!canAccess(asset)) {
            throw new BusinessException(ErrorCode.FILE_ACCESS_DENIED, "无权访问该文件");
        }
        return asset;
    }

    private boolean canAccess(FileAssetEntity asset) {
        if (isSystemAdmin()) {
            return true;
        }
        Long userId = currentUserContext.requireUserId();
        if (asset.getIsPublic() != null && asset.getIsPublic() == 1) {
            return true;
        }
        return Objects.equals(asset.getUploadedBy(), userId);
    }

    private boolean isSystemAdmin() {
        AuthenticatedUser user = currentUserProvider.currentUser();
        Set<String> permissions = user.permissions();
        return permissions != null && permissions.contains("system:admin");
    }

    private void touchLastAccessed(FileAssetEntity asset) {
        asset.setLastAccessedAt(Instant.now());
        fileAssetMapper.updateById(asset);
    }

    private FileAssetSummary toSummary(FileAssetEntity asset) {
        return new FileAssetSummary(
                asset.getId(),
                asset.getOriginalName(),
                asset.getMimeType(),
                asset.getSizeBytes(),
                asset.getCategoryCode(),
                asset.getIsPublic() != null && asset.getIsPublic() == 1,
                asset.getUploadedBy(),
                asset.getUploadedAt(),
                DOWNLOAD_PATH_PREFIX + asset.getId() + "/download");
    }
}
