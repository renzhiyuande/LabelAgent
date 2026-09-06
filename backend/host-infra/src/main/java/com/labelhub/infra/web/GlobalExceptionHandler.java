package com.labelhub.infra.web;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.util.TraceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.util.unit.DataSize;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusiness(BusinessException ex) {
        return failure(ex.errorCode(), ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getField() + " " + error.getDefaultMessage())
                .orElse(ErrorCode.VALIDATION_ERROR.defaultMessage());
        return failure(ErrorCode.VALIDATION_ERROR, message);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuthentication(AuthenticationException ex) {
        return failure(ErrorCode.AUTH_UNAUTHENTICATED, ErrorCode.AUTH_UNAUTHENTICATED.defaultMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
        return failure(ErrorCode.AUTH_FORBIDDEN, ErrorCode.AUTH_FORBIDDEN.defaultMessage());
    }

    @ExceptionHandler(DuplicateKeyException.class)
    public ResponseEntity<ApiResponse<Void>> handleDuplicateKey(DuplicateKeyException ex) {
        log.warn("Duplicate key traceId={}", TraceContext.currentTraceId(), ex);
        return failure(ErrorCode.RESOURCE_CONFLICT, ErrorCode.RESOURCE_CONFLICT.defaultMessage());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        log.warn("Upload size exceeded traceId={} maxBytes={}", TraceContext.currentTraceId(), ex.getMaxUploadSize());
        return failure(ErrorCode.FILE_UPLOAD_TOO_LARGE, uploadSizeExceededMessage(ex.getMaxUploadSize()));
    }

    @ExceptionHandler(MultipartException.class)
    public ResponseEntity<ApiResponse<Void>> handleMultipart(MultipartException ex) {
        MaxUploadSizeExceededException sizeExceeded = findCause(ex, MaxUploadSizeExceededException.class);
        if (sizeExceeded != null) {
            return handleMaxUploadSize(sizeExceeded);
        }
        log.warn("Multipart request failed traceId={}", TraceContext.currentTraceId(), ex);
        return failure(ErrorCode.VALIDATION_ERROR, "文件上传失败，请检查文件格式与大小");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnknown(Exception ex) {
        MaxUploadSizeExceededException sizeExceeded = findCause(ex, MaxUploadSizeExceededException.class);
        if (sizeExceeded != null) {
            return handleMaxUploadSize(sizeExceeded);
        }
        log.error("Unhandled exception traceId={}", TraceContext.currentTraceId(), ex);
        return failure(ErrorCode.SYSTEM_ERROR, ErrorCode.SYSTEM_ERROR.defaultMessage());
    }

    private static String uploadSizeExceededMessage(long maxBytes) {
        if (maxBytes <= 0) {
            return "上传文件超过大小限制，请缩小文件后重试";
        }
        if (maxBytes % (1024 * 1024) == 0) {
            long megabytes = maxBytes / (1024 * 1024);
            return "上传文件超过大小限制（最大 " + megabytes + "MB），请缩小文件后重试";
        }
        return "上传文件超过大小限制（最大 " + DataSize.ofBytes(maxBytes) + "），请缩小文件后重试";
    }

    private static <T extends Throwable> T findCause(Throwable ex, Class<T> type) {
        for (Throwable current = ex; current != null; current = current.getCause()) {
            if (type.isInstance(current)) {
                return type.cast(current);
            }
        }
        return null;
    }

    private ResponseEntity<ApiResponse<Void>> failure(ErrorCode code, String message) {
        return ResponseEntity.status(code.status())
                .body(ApiResponse.failure(code.errCode(), message, TraceContext.currentTraceId()));
    }
}
