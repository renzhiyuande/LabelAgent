package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("file_assets")
public class FileAssetEntity extends AbstractEntity {
    private String storageProvider;
    private String bucketName;
    private String objectKey;
    private String originalName;
    private String storedName;
    private String fileExt;
    private String mimeType;
    private Long sizeBytes;
    private String sha256;
    private String categoryCode;
    private String uploadStatus;
    private Integer isPublic;
    private Long uploadedBy;
    private Instant uploadedAt;
    private String scanStatus;
    private Instant lastAccessedAt;
    private Instant expireAt;
}
