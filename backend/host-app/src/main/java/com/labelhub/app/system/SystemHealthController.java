package com.labelhub.app.system;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.util.TraceContext;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SystemHealthController {
    @GetMapping("/api/v1/system/health")
    public ApiResponse<Map<String, Object>> publicHealth() {
        return ApiResponse.success(Map.of("status", "UP", "time", Instant.now().toString()), TraceContext.currentTraceId());
    }

    @GetMapping("/internal/v1/system/health")
    public ApiResponse<Map<String, Object>> internalHealth() {
        return ApiResponse.success(Map.of("status", "UP", "scope", "internal"), TraceContext.currentTraceId());
    }

    @GetMapping("/api/v1/system/examples/page")
    public ApiResponse<PageResponse<Map<String, String>>> pageExample() {
        return ApiResponse.success(PageResponse.of(1, 1, 10, List.of(Map.of("name", "foundation"))),
                TraceContext.currentTraceId());
    }

    @GetMapping("/api/v1/system/examples/detail")
    public ApiResponse<Map<String, String>> detailExample() {
        return ApiResponse.success(Map.of("name", "foundation", "stage", "01"), TraceContext.currentTraceId());
    }
}

