package com.labelhub.infra.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.error.ErrorCode;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleMaxUploadSizeReturnsFriendlyMessage() {
        ResponseEntity<ApiResponse<Void>> response = handler
                .handleMaxUploadSize(new MaxUploadSizeExceededException(10 * 1024 * 1024));

        assertThat(response.getStatusCode().value()).isEqualTo(ErrorCode.FILE_UPLOAD_TOO_LARGE.status());
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo(ErrorCode.FILE_UPLOAD_TOO_LARGE.errCode());
        assertThat(response.getBody().message()).contains("上传文件超过大小限制");
        assertThat(response.getBody().message()).contains("10MB");
    }
}
