package com.labelhub.infra.lowcode.query.spec;

import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.persistence.entity.FileAssetEntity;

public final class FileAssetQuerySpec {
    private FileAssetQuerySpec() {
    }

    public static ResourceQuerySpec<FileAssetEntity> build() {
        return ResourceQuerySpec.<FileAssetEntity>builder()
                .stringFilter("categoryCode", FileAssetEntity::getCategoryCode)
                .prefixFilter("mimeTypePrefix", FileAssetEntity::getMimeType)
                .stringFilter("mimeType", FileAssetEntity::getMimeType)
                .longFilter("uploadedBy", FileAssetEntity::getUploadedBy)
                .integerFilter("isPublic", FileAssetEntity::getIsPublic)
                .instantFilter("uploadedAt", FileAssetEntity::getUploadedAt)
                .sortField("originalName", FileAssetEntity::getOriginalName)
                .sortField("mimeType", FileAssetEntity::getMimeType)
                .sortField("sizeBytes", FileAssetEntity::getSizeBytes)
                .sortField("uploadedAt", FileAssetEntity::getUploadedAt)
                .build();
    }
}
