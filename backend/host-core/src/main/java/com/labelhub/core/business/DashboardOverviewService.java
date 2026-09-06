package com.labelhub.core.business;

import com.labelhub.core.business.BusinessDtos.AdminDashboardOverview;
import com.labelhub.core.business.BusinessDtos.AdminDashboardAnalytics;
import com.labelhub.core.business.BusinessDtos.LabelerDashboardAnalytics;
import com.labelhub.core.business.BusinessDtos.LabelerDashboardOverview;
import com.labelhub.core.business.BusinessDtos.OwnerDashboardAnalytics;
import com.labelhub.core.business.BusinessDtos.OwnerDashboardOverview;
import com.labelhub.core.business.BusinessDtos.ReviewerDashboardAnalytics;
import com.labelhub.core.business.BusinessDtos.ReviewerDashboardOverview;

public interface DashboardOverviewService {
    AdminDashboardOverview adminOverview();

    AdminDashboardAnalytics adminAnalytics();

    OwnerDashboardOverview ownerOverview();

    OwnerDashboardAnalytics ownerAnalytics();

    LabelerDashboardOverview labelerOverview();

    LabelerDashboardAnalytics labelerAnalytics();

    ReviewerDashboardOverview reviewerOverview();

    ReviewerDashboardAnalytics reviewerAnalytics();
}
