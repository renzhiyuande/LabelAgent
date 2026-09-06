package com.labelhub.infra.business.storage.service;

import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.persistence.entity.FileAssetEntity;
import com.labelhub.infra.persistence.mapper.FileAssetMapper;
import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.time.Instant;
import com.labelhub.core.util.DigestUtil;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/** 基于 MinIO 的文件存储服务：落地对象存储并维护 file_assets 元数据。 */
@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class MinioFileStorageService {
    private static final Logger log = LoggerFactory.getLogger(MinioFileStorageService.class);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final MinioClient minioClient;
    private final FileAssetMapper fileAssetMapper;

    @Value("${labelhub.storage.minio.bucket:labelhub}")
    private String bucket;

    public MinioFileStorageService(MinioClient minioClient, FileAssetMapper fileAssetMapper) {
        this.minioClient = minioClient;
        this.fileAssetMapper = fileAssetMapper;
    }

    /** 上传字节内容并登记 file_assets，返回文件资产 id。 */
    public Long upload(byte[] content, String originalName, String mimeType, String categoryCode, Long uploadedBy) {
        ensureBucket();
        String ext = extractExt(originalName);
        String objectKey = categoryCode + "/" + LocalDate.now().format(DATE_FMT) + "/" + UUID.randomUUID() + ext;
        try (InputStream in = new ByteArrayInputStream(content)) {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectKey)
                    .stream(in, content.length, -1)
                    .contentType(mimeType != null ? mimeType : "application/octet-stream")
                    .build());
        } catch (Exception ex) {
            log.error("MinIO upload failed: {}", ex.getMessage(), ex);
            throw new BusinessException(ErrorCode.FILE_STORAGE_UNAVAILABLE, "文件上传到对象存储失败");
        }

        FileAssetEntity e = new FileAssetEntity();
        e.setStorageProvider("MINIO");
        e.setBucketName(bucket);
        e.setObjectKey(objectKey);
        e.setOriginalName(originalName);
        e.setStoredName(objectKey.substring(objectKey.lastIndexOf('/') + 1));
        e.setFileExt(ext.isEmpty() ? null : ext.substring(1));
        e.setMimeType(mimeType);
        e.setSizeBytes((long) content.length);
        e.setSha256(sha256Hex(content));
        e.setCategoryCode(categoryCode);
        e.setUploadStatus("SUCCESS");
        e.setIsPublic(0);
        e.setUploadedBy(uploadedBy != null ? uploadedBy : 0L);
        e.setUploadedAt(Instant.now());
        e.setScanStatus("PENDING");
        e.setCreatedAt(Instant.now());
        e.setUpdatedAt(Instant.now());
        fileAssetMapper.insert(e);
        return e.getId();
    }

    public FileAssetEntity getAsset(Long fileId) {
        FileAssetEntity e = fileAssetMapper.selectById(fileId);
        if (e == null || e.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.FILE_NOT_FOUND, "文件不存在");
        }
        return e;
    }

    /** 按 file_assets id 从对象存储读取字节内容。 */
    public byte[] download(Long fileId) {
        FileAssetEntity e = getAsset(fileId);
        try (InputStream in = minioClient.getObject(GetObjectArgs.builder()
                .bucket(e.getBucketName())
                .object(e.getObjectKey())
                .build())) {
            return in.readAllBytes();
        } catch (Exception ex) {
            log.error("MinIO download failed: {}", ex.getMessage(), ex);
            throw new BusinessException(ErrorCode.FILE_STORAGE_UNAVAILABLE, "从对象存储读取文件失败");
        }
    }

    private void ensureBucket() {
        try {
            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
            }
        } catch (Exception ex) {
            log.error("MinIO ensure bucket failed: {}", ex.getMessage(), ex);
            throw new BusinessException(ErrorCode.FILE_STORAGE_UNAVAILABLE, "对象存储不可用");
        }
    }

    private String extractExt(String name) {
        if (name == null) {
            return "";
        }
        int dot = name.lastIndexOf('.');
        return dot >= 0 ? name.substring(dot) : "";
    }

    private String sha256Hex(byte[] content) {
        return DigestUtil.sha256Hex(content);
    }
}
