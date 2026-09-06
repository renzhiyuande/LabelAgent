package com.labelhub.infra.system;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.system.SystemDtos.FileAssetDownload;
import com.labelhub.core.system.SystemDtos.FileAssetSummary;
import com.labelhub.infra.business.storage.service.MinioFileStorageService;
import com.labelhub.infra.lowcode.query.MybatisQueryApplier;
import com.labelhub.infra.persistence.entity.FileAssetEntity;
import com.labelhub.infra.persistence.mapper.FileAssetMapper;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("P2 白盒 — DbFileAssetService")
class DbFileAssetServiceWhiteBoxTest {

    @Mock
    private FileAssetMapper fileAssetMapper;
    @Mock
    private MinioFileStorageService fileStorageService;
    @Mock
    private MybatisQueryApplier queryApplier;

    private DbFileAssetService service;

    @BeforeEach
    void setUp() {
        CurrentUserContext currentUserContext = new CurrentUserContext(() -> adminUser());
        service = new DbFileAssetService(
                fileAssetMapper,
                fileStorageService,
                currentUserContext,
                () -> adminUser(),
                queryApplier);
    }

    @Test
    @DisplayName("WB-FILE-001: uploadFile 写入 file_asset 并返回摘要")
    void wbFile001_uploadFilePersistsAssetMetadata() {
        byte[] content = "png-bytes".getBytes();
        FileAssetEntity asset = fileAsset(88001L, "demo.png", "image/png", 1001L);
        when(fileStorageService.upload(eq(content), eq("demo.png"), eq("image/png"), eq("form"), eq(1001L)))
                .thenReturn(88001L);
        when(fileStorageService.getAsset(88001L)).thenReturn(asset);

        FileAssetSummary summary = service.uploadFile(content, "demo.png", "image/png", "form");

        assertThat(summary.id()).isEqualTo(88001L);
        assertThat(summary.originalName()).isEqualTo("demo.png");
        assertThat(summary.downloadUrl()).contains("/api/v1/files/88001/download");
        verify(fileStorageService).upload(content, "demo.png", "image/png", "form", 1001L);
    }

    @Test
    @DisplayName("WB-FILE-002: 空文件上传拒绝")
    void wbFile002_uploadEmptyFileIsRejected() {
        assertThatThrownBy(() -> service.uploadFile(new byte[0], "empty.png", "image/png", "form"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).errorCode())
                        .isEqualTo(ErrorCode.VALIDATION_ERROR));
    }

    @Test
    @DisplayName("WB-FILE-003: downloadFile 返回流式内容与 Content-Type")
    void wbFile003_downloadFileReturnsContentAndMimeType() {
        FileAssetEntity asset = fileAsset(88002L, "report.csv", "text/csv", 1001L);
        when(fileStorageService.getAsset(88002L)).thenReturn(asset);
        when(fileStorageService.download(88002L)).thenReturn("a,b".getBytes());

        FileAssetDownload download = service.downloadFile(88002L);

        assertThat(download.fileName()).isEqualTo("report.csv");
        assertThat(download.contentType()).isEqualTo("text/csv");
        assertThat(download.content()).isEqualTo("a,b".getBytes());
        verify(fileAssetMapper).updateById(org.mockito.ArgumentMatchers.<FileAssetEntity>any());
    }

    @Test
    @DisplayName("WB-FILE-004: deleteFile 软删本人上传文件")
    void wbFile004_deleteFileSoftDeletesOwnedAsset() {
        FileAssetEntity asset = fileAsset(88003L, "owned.png", "image/png", 1001L);
        when(fileStorageService.getAsset(88003L)).thenReturn(asset);

        service.deleteFile(88003L);

        assertThat(asset.getDeletedFlag()).isEqualTo(1);
        verify(fileAssetMapper).updateById(asset);
    }

    @Test
    @DisplayName("WB-FILE-005: 非 admin 仅可访问本人或公开文件")
    void wbFile005_nonAdminCannotAccessOthersPrivateFile() {
        CurrentUserContext labelerContext = new CurrentUserContext(() -> labelerUser());
        DbFileAssetService labelerService = new DbFileAssetService(
                fileAssetMapper,
                fileStorageService,
                labelerContext,
                () -> labelerUser(),
                queryApplier);
        FileAssetEntity othersAsset = fileAsset(88004L, "private.png", "image/png", 11001L);
        when(fileStorageService.getAsset(88004L)).thenReturn(othersAsset);

        assertThatThrownBy(() -> labelerService.downloadFile(88004L))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).errorCode())
                        .isEqualTo(ErrorCode.FILE_ACCESS_DENIED));
    }

    private static AuthenticatedUser labelerUser() {
        return new AuthenticatedUser(
                11002L,
                "labeler_002",
                "Labeler",
                Set.of("LABELER"),
                Set.of("business:labeler:workbench"),
                List.of(),
                Set.of());
    }

    private static AuthenticatedUser adminUser() {
        return new AuthenticatedUser(
                1001L, "admin", "admin", Set.of("ADMIN"), Set.of("system:admin"), List.of(), Set.of());
    }

    private static FileAssetEntity fileAsset(long id, String name, String mime, long uploadedBy) {
        FileAssetEntity asset = new FileAssetEntity();
        asset.setId(id);
        asset.setOriginalName(name);
        asset.setMimeType(mime);
        asset.setSizeBytes(9L);
        asset.setCategoryCode("form");
        asset.setIsPublic(0);
        asset.setUploadedBy(uploadedBy);
        asset.setUploadedAt(Instant.now());
        asset.setDeletedFlag(0);
        return asset;
    }
}
