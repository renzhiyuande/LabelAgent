package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.DailyStatsBackfillResult;
import com.labelhub.core.business.BusinessDtos.PlatformStatsOverview;
import com.labelhub.core.business.BusinessDtos.TaskStatsOverview;
import com.labelhub.core.business.StatsService;
import com.labelhub.core.util.TraceContext;
import java.time.LocalDate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/stats")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class StatsController {
    private final StatsService statsService;

    public StatsController(StatsService statsService) {
        this.statsService = statsService;
    }

    @GetMapping("/platform")
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<PlatformStatsOverview> platformOverview() {
        return ok(statsService.platformOverview());
    }

    @GetMapping("/tasks/{taskId}")
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public ApiResponse<TaskStatsOverview> taskOverview(@PathVariable Long taskId) {
        return ok(statsService.taskOverview(taskId));
    }

    @PostMapping("/daily/backfill")
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<DailyStatsBackfillResult> backfillDaily(
            @RequestParam String from,
            @RequestParam String to) {
        return ok(statsService.backfillDailyStats(LocalDate.parse(from), LocalDate.parse(to)));
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
