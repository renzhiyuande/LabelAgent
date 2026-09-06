package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.AdminDashboardAnalytics;
import com.labelhub.core.business.BusinessDtos.AdminDashboardOverview;
import com.labelhub.core.business.BusinessDtos.LabelerDashboardAnalytics;
import com.labelhub.core.business.BusinessDtos.LabelerDashboardOverview;
import com.labelhub.core.business.BusinessDtos.OwnerDashboardAnalytics;
import com.labelhub.core.business.BusinessDtos.OwnerDashboardOverview;
import com.labelhub.core.business.BusinessDtos.ReviewerDashboardAnalytics;
import com.labelhub.core.business.BusinessDtos.ReviewerDashboardOverview;
import com.labelhub.core.business.DashboardOverviewService;
import com.labelhub.core.util.TraceContext;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DashboardController {
    private final DashboardOverviewService dashboardOverviewService;

    public DashboardController(DashboardOverviewService dashboardOverviewService) {
        this.dashboardOverviewService = dashboardOverviewService;
    }

    @GetMapping("/admin")
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<AdminDashboardOverview> adminOverview() {
        return ok(dashboardOverviewService.adminOverview());
    }

    @GetMapping("/admin/analytics")
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<AdminDashboardAnalytics> adminAnalytics() {
        return ok(dashboardOverviewService.adminAnalytics());
    }

    @GetMapping("/owner")
    @RequireAnyPermission({ "system:admin", "business:task:read", "business:submission:read" })
    public ApiResponse<OwnerDashboardOverview> ownerOverview() {
        return ok(dashboardOverviewService.ownerOverview());
    }

    @GetMapping("/owner/analytics")
    @RequireAnyPermission({ "system:admin", "business:task:read", "business:submission:read" })
    public ApiResponse<OwnerDashboardAnalytics> ownerAnalytics() {
        return ok(dashboardOverviewService.ownerAnalytics());
    }

    @GetMapping("/labeler")
    @RequireAnyPermission({ "system:admin", "business:labeler:workbench" })
    public ApiResponse<LabelerDashboardOverview> labelerOverview() {
        return ok(dashboardOverviewService.labelerOverview());
    }

    @GetMapping("/labeler/analytics")
    @RequireAnyPermission({ "system:admin", "business:labeler:workbench" })
    public ApiResponse<LabelerDashboardAnalytics> labelerAnalytics() {
        return ok(dashboardOverviewService.labelerAnalytics());
    }

    @GetMapping("/reviewer")
    @RequireAnyPermission({ "system:admin", "business:reviewer:workbench" })
    public ApiResponse<ReviewerDashboardOverview> reviewerOverview() {
        return ok(dashboardOverviewService.reviewerOverview());
    }

    @GetMapping("/reviewer/analytics")
    @RequireAnyPermission({ "system:admin", "business:reviewer:workbench" })
    public ApiResponse<ReviewerDashboardAnalytics> reviewerAnalytics() {
        return ok(dashboardOverviewService.reviewerAnalytics());
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
