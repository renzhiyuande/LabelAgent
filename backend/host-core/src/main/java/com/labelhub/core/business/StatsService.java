package com.labelhub.core.business;

import com.labelhub.core.business.BusinessDtos.DailyStatsBackfillResult;
import com.labelhub.core.business.BusinessDtos.PlatformStatsOverview;
import com.labelhub.core.business.BusinessDtos.TaskStatsOverview;
import java.time.LocalDate;

public interface StatsService {
    /** 按任务实时聚合并刷新统计快照，返回任务维度概览。 */
    TaskStatsOverview taskOverview(Long taskId);

    /** 平台维度概览（实时聚合，不落快照）。 */
    PlatformStatsOverview platformOverview();

    /** 从提交状态流水回填指定日期区间的任务/用户每日统计表（幂等覆盖）。 */
    DailyStatsBackfillResult backfillDailyStats(LocalDate from, LocalDate to);
}
