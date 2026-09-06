package com.labelhub.app;

import static org.hamcrest.Matchers.closeTo;
import static org.hamcrest.Matchers.greaterThan;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.redis.testcontainers.RedisContainer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@Testcontainers(disabledWithoutDocker = true)
@DisplayName("P1 白盒 — dashboard 聚合接口 (DB/Redis)")
class DashboardControllerWhiteBoxIT {

    @Container
    static MySQLContainer<?> mysql = new MySQLContainer<>(DockerImageName.parse("mysql:8.0"))
            .withDatabaseName("labelhub_dashboard_it")
            .withUsername("test")
            .withPassword("test");

    @Container
    static RedisContainer redis = new RedisContainer(DockerImageName.parse("redis:7-alpine"));

    @DynamicPropertySource
    static void registerDatasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", mysql::getJdbcUrl);
        registry.add("spring.datasource.username", mysql::getUsername);
        registry.add("spring.datasource.password", mysql::getPassword);
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> String.valueOf(redis.getFirstMappedPort()));
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void seedFixture() {
        ResourceDatabasePopulator populator = new ResourceDatabasePopulator();
        populator.addScript(new ClassPathResource("p0_whitebox_minimal_seed.sql"));
        populator.execute(jdbcTemplate.getDataSource());
    }

    @Test
    @DisplayName("WB-DASH-001: admin dashboard 聚合 AI 任务统计")
    void wbDash001_adminOverviewAggregatesAiTasks() throws Exception {
        String adminToken = loginAndGetToken("admin", "admin123");

        Integer aiTaskTotal = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM async_tasks WHERE deleted_flag = 0 AND task_type = 'AI_REVIEW'",
                Integer.class);
        Integer aiTaskSuccess = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM async_tasks WHERE deleted_flag = 0 AND task_type = 'AI_REVIEW' AND status = 'SUCCESS'",
                Integer.class);
        Integer aiTaskFailed = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM async_tasks WHERE deleted_flag = 0 AND task_type = 'AI_REVIEW' AND status IN ('FAILED', 'DEAD_LETTER')",
                Integer.class);
        Integer aiTaskRunning = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM async_tasks WHERE deleted_flag = 0 AND task_type = 'AI_REVIEW' AND status IN ('PENDING', 'RUNNING')",
                Integer.class);

        mockMvc.perform(get("/api/v1/dashboard/admin")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.aiTaskTotal").value(aiTaskTotal))
                .andExpect(jsonPath("$.data.aiTaskSuccess").value(aiTaskSuccess))
                .andExpect(jsonPath("$.data.aiTaskFailed").value(aiTaskFailed))
                .andExpect(jsonPath("$.data.aiTaskRunning").value(aiTaskRunning));
    }

    @Test
    @DisplayName("WB-DASH-001A: admin analytics 聚合用户增长、任务状态、漏斗与角色占比")
    void wbDash001a_adminAnalyticsAggregatesCharts() throws Exception {
        String adminToken = loginAndGetToken("admin", "admin123");

        jdbcTemplate.update(
                "INSERT INTO users (id, tenant_id, created_by, updated_by, deleted_flag, username, password_hash, display_name, status, created_at, updated_at) " +
                        "VALUES (21001, 1, 0, 0, 0, 'dash_admin_user_1', 'x', 'Dash Admin User 1', 'ACTIVE', '2026-06-03 10:00:00', CURRENT_TIMESTAMP(3))");
        jdbcTemplate.update(
                "INSERT INTO users (id, tenant_id, created_by, updated_by, deleted_flag, username, password_hash, display_name, status, created_at, updated_at) " +
                        "VALUES (21002, 1, 0, 0, 0, 'dash_admin_user_2', 'x', 'Dash Admin User 2', 'ACTIVE', '2026-06-08 11:00:00', CURRENT_TIMESTAMP(3))");
        jdbcTemplate.update(
                "INSERT INTO tasks (id, tenant_id, created_by, updated_by, deleted_flag, task_code, owner_id, title, scene_code, status, created_at, updated_at) " +
                        "VALUES (22001, 1, 0, 0, 0, 'DASH-ADMIN-1', 1001, 'Admin Dashboard Published', 'IMAGE', 'PUBLISHED', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))");
        jdbcTemplate.update(
                "INSERT INTO tasks (id, tenant_id, created_by, updated_by, deleted_flag, task_code, owner_id, title, scene_code, status, created_at, updated_at) " +
                        "VALUES (22002, 1, 0, 0, 0, 'DASH-ADMIN-2', 1001, 'Admin Dashboard Archived', 'IMAGE', 'ARCHIVED', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))");
        jdbcTemplate.update(
                "INSERT INTO submissions (id, tenant_id, created_by, updated_by, deleted_flag, assignment_id, task_id, item_id, labeler_id, current_template_version_id, current_status, current_round_no, submit_count, return_count, withdraw_count, appeal_count, reopen_count, version_no, created_at, updated_at) " +
                        "VALUES (23001, 1, 0, 0, 0, 50001, 22001, 60001, 11001, 13001, 'AI_REVIEWING', 1, 1, 0, 0, 0, 0, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))");
        jdbcTemplate.update(
                "INSERT INTO submissions (id, tenant_id, created_by, updated_by, deleted_flag, assignment_id, task_id, item_id, labeler_id, current_template_version_id, current_status, current_round_no, submit_count, return_count, withdraw_count, appeal_count, reopen_count, version_no, created_at, updated_at) " +
                        "VALUES (23002, 1, 0, 0, 0, 50002, 22001, 60002, 11001, 13001, 'HUMAN_REVIEWING', 1, 1, 0, 0, 0, 0, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))");
        jdbcTemplate.update(
                "INSERT INTO submissions (id, tenant_id, created_by, updated_by, deleted_flag, assignment_id, task_id, item_id, labeler_id, current_template_version_id, current_status, current_round_no, submit_count, return_count, withdraw_count, appeal_count, reopen_count, version_no, created_at, updated_at) " +
                        "VALUES (23003, 1, 0, 0, 0, 50003, 22001, 60003, 11001, 13001, 'REVISION_REQUIRED', 1, 1, 1, 0, 0, 0, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))");
        jdbcTemplate.update(
                "INSERT INTO submissions (id, tenant_id, created_by, updated_by, deleted_flag, assignment_id, task_id, item_id, labeler_id, current_template_version_id, current_status, current_round_no, submit_count, return_count, withdraw_count, appeal_count, reopen_count, version_no, created_at, updated_at) " +
                        "VALUES (23004, 1, 0, 0, 0, 50004, 22001, 60004, 11001, 13001, 'APPROVED', 1, 1, 0, 0, 0, 0, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))");
        jdbcTemplate.update(
                "INSERT INTO user_roles (id, tenant_id, created_by, updated_by, deleted_flag, user_id, role_id, effective_at, created_at, updated_at) " +
                        "VALUES (24001, 1, 0, 0, 0, 21001, 2002, '2026-06-03 10:00:00', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))");
        jdbcTemplate.update(
                "INSERT INTO user_roles (id, tenant_id, created_by, updated_by, deleted_flag, user_id, role_id, effective_at, created_at, updated_at) " +
                        "VALUES (24002, 1, 0, 0, 0, 21002, 2004, '2026-06-08 11:00:00', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))");

        Double approvalRate = jdbcTemplate.queryForObject(
                "SELECT ROUND((SUM(CASE WHEN current_status IN ('AI_PASSED', 'APPROVED') THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 1) " +
                        "FROM submissions WHERE deleted_flag = 0",
                Double.class);
        Integer newUsersOn0603 = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE deleted_flag = 0 AND DATE(created_at) = '2026-06-03'",
                Integer.class);
        Integer cumulativeUsersOn0603 = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE deleted_flag = 0 AND DATE(created_at) <= '2026-06-03'",
                Integer.class);
        Integer newUsersOn0608 = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE deleted_flag = 0 AND DATE(created_at) = '2026-06-08'",
                Integer.class);
        Integer cumulativeUsersOn0608 = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE deleted_flag = 0 AND DATE(created_at) <= '2026-06-08'",
                Integer.class);
        Integer submittedTotal = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM submissions WHERE deleted_flag = 0",
                Integer.class);
        Integer aiReviewing = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM submissions WHERE deleted_flag = 0 AND current_status = 'AI_REVIEWING'",
                Integer.class);
        Integer humanReviewing = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM submissions WHERE deleted_flag = 0 AND current_status = 'HUMAN_REVIEWING'",
                Integer.class);
        Integer needsRevision = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM submissions WHERE deleted_flag = 0 " +
                        "AND current_status IN ('AI_REJECTED', 'REVISION_REQUIRED', 'RETURNED', 'REJECTED')",
                Integer.class);
        Integer approved = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM submissions WHERE deleted_flag = 0 AND current_status IN ('AI_PASSED', 'APPROVED')",
                Integer.class);
        Integer publishedTasks = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM tasks WHERE deleted_flag = 0 AND status = 'PUBLISHED'",
                Integer.class);
        Integer archivedTasks = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM tasks WHERE deleted_flag = 0 AND status = 'ARCHIVED'",
                Integer.class);
        Integer adminUsers = jdbcTemplate.queryForObject(
                "SELECT COUNT(DISTINCT user_id) FROM user_roles WHERE deleted_flag = 0 AND role_id = 2002",
                Integer.class);
        Integer reviewerUsers = jdbcTemplate.queryForObject(
                "SELECT COUNT(DISTINCT user_id) FROM user_roles WHERE deleted_flag = 0 AND role_id = 2004",
                Integer.class);

        mockMvc.perform(get("/api/v1/dashboard/admin/analytics")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.approvalRate").value(closeTo(approvalRate, 0.01)))
                .andExpect(jsonPath("$.data.userGrowthTrend.length()").value(7))
                .andExpect(jsonPath("$.data.userGrowthTrend[1].statDate").value("2026-06-03"))
                .andExpect(jsonPath("$.data.userGrowthTrend[1].newUserCount").value(String.valueOf(newUsersOn0603)))
                .andExpect(jsonPath("$.data.userGrowthTrend[1].cumulativeUserCount").value(String.valueOf(cumulativeUsersOn0603)))
                .andExpect(jsonPath("$.data.userGrowthTrend[6].statDate").value("2026-06-08"))
                .andExpect(jsonPath("$.data.userGrowthTrend[6].newUserCount").value(String.valueOf(newUsersOn0608)))
                .andExpect(jsonPath("$.data.userGrowthTrend[6].cumulativeUserCount").value(String.valueOf(cumulativeUsersOn0608)))
                .andExpect(jsonPath("$.data.taskStatusDistribution.length()").value(greaterThan(1)))
                .andExpect(jsonPath("$.data.taskStatusDistribution[?(@.status=='已发布')].count").value(String.valueOf(publishedTasks)))
                .andExpect(jsonPath("$.data.taskStatusDistribution[?(@.status=='已归档')].count").value(String.valueOf(archivedTasks)))
                .andExpect(jsonPath("$.data.submissionFunnel.length()").value(5))
                .andExpect(jsonPath("$.data.submissionFunnel[0].stage").value("提交总量"))
                .andExpect(jsonPath("$.data.submissionFunnel[0].count").value(String.valueOf(submittedTotal)))
                .andExpect(jsonPath("$.data.submissionFunnel[1].count").value(String.valueOf(aiReviewing)))
                .andExpect(jsonPath("$.data.submissionFunnel[2].count").value(String.valueOf(humanReviewing)))
                .andExpect(jsonPath("$.data.submissionFunnel[3].count").value(String.valueOf(needsRevision)))
                .andExpect(jsonPath("$.data.submissionFunnel[4].count").value(String.valueOf(approved)))
                .andExpect(jsonPath("$.data.roleDistribution.length()").value(greaterThan(1)))
                .andExpect(jsonPath("$.data.roleDistribution[?(@.roleCode=='ADMIN')].userCount").value(String.valueOf(adminUsers)))
                .andExpect(jsonPath("$.data.roleDistribution[?(@.roleCode=='REVIEWER')].userCount").value(String.valueOf(reviewerUsers)));
    }

    @Test
    @DisplayName("WB-DASH-002: owner dashboard 按当前 owner 的任务聚合")
    void wbDash002_ownerOverviewScopesToCurrentOwner() throws Exception {
        String adminToken = loginAndGetToken("admin", "admin123");
        Long adminUserId = jdbcTemplate.queryForObject(
                "SELECT id FROM users WHERE username = 'admin' AND deleted_flag = 0 LIMIT 1",
                Long.class);

        Integer submissionTotal = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM submissions s JOIN tasks t ON t.id = s.task_id " +
                        "WHERE s.deleted_flag = 0 AND t.deleted_flag = 0 AND t.owner_id = ?",
                Integer.class,
                adminUserId);
        Integer reviewInFlight = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM submissions s JOIN tasks t ON t.id = s.task_id " +
                        "WHERE s.deleted_flag = 0 AND t.deleted_flag = 0 AND t.owner_id = ? " +
                        "AND s.current_status IN ('AI_REVIEWING', 'HUMAN_REVIEWING')",
                Integer.class,
                adminUserId);
        Integer approvedTotal = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM submissions s JOIN tasks t ON t.id = s.task_id " +
                        "WHERE s.deleted_flag = 0 AND t.deleted_flag = 0 AND t.owner_id = ? " +
                        "AND s.current_status IN ('AI_PASSED', 'APPROVED')",
                Integer.class,
                adminUserId);
        Integer acceptanceOpen = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM task_acceptance_records a JOIN tasks t ON t.id = a.task_id " +
                        "WHERE a.deleted_flag = 0 AND t.deleted_flag = 0 AND t.owner_id = ? " +
                        "AND a.status IN ('PENDING', 'SAMPLING', 'REOPENED')",
                Integer.class,
                adminUserId);
        Integer exportOpen = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM export_jobs e JOIN tasks t ON t.id = e.task_id " +
                        "WHERE e.deleted_flag = 0 AND t.deleted_flag = 0 AND t.owner_id = ? " +
                        "AND e.status IN ('PENDING', 'RUNNING')",
                Integer.class,
                adminUserId);
        Integer settlementOpen = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM reward_settlement_batches b JOIN tasks t ON t.id = b.task_id " +
                        "WHERE b.deleted_flag = 0 AND t.deleted_flag = 0 AND t.owner_id = ? " +
                        "AND b.status IN ('DRAFT', 'CONFIRMED')",
                Integer.class,
                adminUserId);

        mockMvc.perform(get("/api/v1/dashboard/owner")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.submissionTotal").value(submissionTotal))
                .andExpect(jsonPath("$.data.reviewInFlight").value(reviewInFlight))
                .andExpect(jsonPath("$.data.approvedTotal").value(approvedTotal))
                .andExpect(jsonPath("$.data.acceptanceOpen").value(acceptanceOpen))
                .andExpect(jsonPath("$.data.exportOpen").value(exportOpen))
                .andExpect(jsonPath("$.data.settlementOpen").value(settlementOpen));
    }

    @Test
    @DisplayName("WB-DASH-003: owner analytics 聚合统计宽表与效率榜")
    void wbDash003_ownerAnalyticsAggregatesStatsTables() throws Exception {
        String adminToken = loginAndGetToken("admin", "admin123");
        Long adminUserId = jdbcTemplate.queryForObject(
                "SELECT id FROM users WHERE username = 'admin' AND deleted_flag = 0 LIMIT 1",
                Long.class);

        seedOwnerAnalyticsStats();

        Integer taskCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM tasks WHERE deleted_flag = 0 AND owner_id = ?",
                Integer.class,
                adminUserId);
        Integer distinctLabelers = jdbcTemplate.queryForObject(
                "SELECT COUNT(DISTINCT labeler_id) FROM submissions s JOIN tasks t ON t.id = s.task_id " +
                        "WHERE s.deleted_flag = 0 AND t.deleted_flag = 0 AND t.owner_id = ?",
                Integer.class,
                adminUserId);
        Integer submissionTotal = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM submissions s JOIN tasks t ON t.id = s.task_id " +
                        "WHERE s.deleted_flag = 0 AND t.deleted_flag = 0 AND t.owner_id = ?",
                Integer.class,
                adminUserId);
        Integer approvedTotal = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM submissions s JOIN tasks t ON t.id = s.task_id " +
                        "WHERE s.deleted_flag = 0 AND t.deleted_flag = 0 AND t.owner_id = ? " +
                        "AND s.current_status IN ('AI_PASSED', 'APPROVED')",
                Integer.class,
                adminUserId);
        double approvalRate = submissionTotal == null || submissionTotal == 0
                ? 0.0
                : Math.round((approvedTotal * 1000.0 / submissionTotal)) / 10.0;

        mockMvc.perform(get("/api/v1/dashboard/owner/analytics")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.taskCount").value(String.valueOf(taskCount)))
                .andExpect(jsonPath("$.data.activeLabelerCount").value(distinctLabelers))
                .andExpect(jsonPath("$.data.approvalRate").value(approvalRate))
                .andExpect(jsonPath("$.data.avgAiScore").value(94.5))
                .andExpect(jsonPath("$.data.submissionTrend.length()").value(7))
                .andExpect(jsonPath("$.data.submissionTrend[0].statDate").value("2026-06-02"))
                .andExpect(jsonPath("$.data.submissionTrend[0].submittedCount").value(4))
                .andExpect(jsonPath("$.data.submissionTrend[0].approvedCount").value(2))
                .andExpect(jsonPath("$.data.submissionTrend[0].needsRevisionCount").value(1))
                .andExpect(jsonPath("$.data.submissionTrend[0].avgAiScore").value(93.5))
                .andExpect(jsonPath("$.data.statusDistribution.length()").value(4))
                .andExpect(jsonPath("$.data.labelerEfficiency[0].submitCount").value(8))
                .andExpect(jsonPath("$.data.labelerEfficiency[0].qualityScore").value(96.0))
                .andExpect(jsonPath("$.data.labelerEfficiency[1].submitCount").value(5))
                .andExpect(jsonPath("$.data.labelerEfficiency[1].qualityScore").value(91.0));
    }

    @Test
    @DisplayName("WB-DASH-004: labeler analytics 聚合个人趋势与任务参与")
    void wbDash004_labelerAnalyticsAggregatesPersonalStats() throws Exception {
        String labelerToken = loginAndGetToken("labeler_001", "admin123");

        seedLabelerAnalyticsStats();

        mockMvc.perform(get("/api/v1/dashboard/labeler/analytics")
                        .header("Authorization", "Bearer " + labelerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.todaySubmittedCount").value("2"))
                .andExpect(jsonPath("$.data.activeTaskCount").value("2"))
                .andExpect(jsonPath("$.data.avgQualityScore").value(closeTo(93.4, 0.01)))
                .andExpect(jsonPath("$.data.rewardAmountTotal").value(0.0))
                .andExpect(jsonPath("$.data.submissionTrend.length()").value(7))
                .andExpect(jsonPath("$.data.submissionTrend[0].statDate").value("2026-06-02"))
                .andExpect(jsonPath("$.data.submissionTrend[0].submittedCount").value("3"))
                .andExpect(jsonPath("$.data.submissionTrend[0].approvedCount").value("2"))
                .andExpect(jsonPath("$.data.submissionTrend[0].needsRevisionCount").value("1"))
                .andExpect(jsonPath("$.data.submissionTrend[0].qualityScore").value(closeTo(94.0, 0.01)))
                .andExpect(jsonPath("$.data.submissionTrend[0].platformQualityBaseline").value(closeTo(94.3, 0.01)))
                .andExpect(jsonPath("$.data.resultDistribution.length()").value(3))
                .andExpect(jsonPath("$.data.resultDistribution[0].count").value("4"))
                .andExpect(jsonPath("$.data.taskParticipation.length()").value(greaterThan(0)));
    }

    @Test
    @DisplayName("WB-DASH-005: reviewer analytics 聚合审核趋势与团队对比")
    void wbDash005_reviewerAnalyticsAggregatesPersonalStats() throws Exception {
        String adminToken = loginAndGetToken("admin", "admin123");

        seedReviewerAnalyticsStats();

        mockMvc.perform(get("/api/v1/dashboard/reviewer/analytics")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.todayReviewedCount").value("2"))
                .andExpect(jsonPath("$.data.approvalRate").value(closeTo(57.1, 0.01)))
                .andExpect(jsonPath("$.data.avgReviewLatencyMinutes").value(closeTo(15.0, 0.01)))
                .andExpect(jsonPath("$.data.reviewTrend.length()").value(7))
                .andExpect(jsonPath("$.data.reviewTrend[0].statDate").value("2026-06-02"))
                .andExpect(jsonPath("$.data.reviewTrend[0].approvedCount").value("2"))
                .andExpect(jsonPath("$.data.reviewTrend[0].rejectedCount").value("1"))
                .andExpect(jsonPath("$.data.reviewTrend[0].returnedCount").value("0"))
                .andExpect(jsonPath("$.data.reviewTrend[0].avgReviewLatencyMinutes").value(closeTo(15.0, 0.01)))
                .andExpect(jsonPath("$.data.decisionDistribution.length()").value(3))
                .andExpect(jsonPath("$.data.decisionDistribution[0].count").value("4"))
                .andExpect(jsonPath("$.data.personalVsTeam.length()").value(3))
                .andExpect(jsonPath("$.data.personalVsTeam[0].scopeLabel").value("今日"))
                .andExpect(jsonPath("$.data.personalVsTeam[0].personalCount").value("2"))
                .andExpect(jsonPath("$.data.personalVsTeam[0].teamAverageCount").value(closeTo(2.0, 0.01)));
    }

    private void seedOwnerAnalyticsStats() {
        jdbcTemplate.update(
                "INSERT INTO task_stats_snapshot " +
                        "(id, tenant_id, created_by, updated_by, deleted_flag, task_id, item_total_count, in_progress_count, submitted_count, ai_reviewing_count, ai_rejected_count, human_reviewing_count, needs_revision_count, approved_count, active_labeler_count, avg_ai_score, refreshed_at) " +
                        "VALUES (29001, 1, 0, 0, 0, 15001, 20, 3, 2, 1, 1, 1, 2, 4, 3, 94.50, CURRENT_TIMESTAMP(3))");
        jdbcTemplate.update(
                "INSERT INTO task_stats_daily " +
                        "(id, tenant_id, created_by, updated_by, deleted_flag, task_id, stat_date, submit_count, revision_count, ai_reject_count, approve_count, active_labeler_count, avg_ai_score) " +
                        "VALUES (29101, 1, 0, 0, 0, 15001, '2026-06-02', 4, 1, 0, 2, 2, 93.50)");
        jdbcTemplate.update(
                "INSERT INTO task_stats_daily " +
                        "(id, tenant_id, created_by, updated_by, deleted_flag, task_id, stat_date, submit_count, revision_count, ai_reject_count, approve_count, active_labeler_count, avg_ai_score) " +
                        "VALUES (29102, 1, 0, 0, 0, 15001, '2026-06-05', 3, 0, 1, 2, 2, 95.00)");
        jdbcTemplate.update(
                "INSERT INTO user_stats_daily " +
                        "(id, tenant_id, created_by, updated_by, deleted_flag, user_id, role_code, task_id, stat_date, submit_count, quality_score_avg, reward_amount, settled_reward_amount) " +
                        "VALUES (29201, 1, 0, 0, 0, 16001, 'LABELER', 15001, '2026-06-02', 8, 96.00, 0.00, 0.00)");
        jdbcTemplate.update(
                "INSERT INTO user_stats_daily " +
                        "(id, tenant_id, created_by, updated_by, deleted_flag, user_id, role_code, task_id, stat_date, submit_count, quality_score_avg, reward_amount, settled_reward_amount) " +
                        "VALUES (29202, 1, 0, 0, 0, 16002, 'LABELER', 15001, '2026-06-05', 5, 91.00, 0.00, 0.00)");
    }

    private void seedLabelerAnalyticsStats() {
        jdbcTemplate.update(
                "INSERT INTO user_stats_daily " +
                        "(id, tenant_id, created_by, updated_by, deleted_flag, user_id, role_code, task_id, stat_date, submit_count, approve_count, reject_count, return_count, quality_score_avg, reward_amount, settled_reward_amount) " +
                        "VALUES (29301, 1, 0, 0, 0, 11001, 'LABELER', 15001, '2026-06-02', 3, 2, 1, 0, 94.00, 0.00, 0.00)");
        jdbcTemplate.update(
                "INSERT INTO user_stats_daily " +
                        "(id, tenant_id, created_by, updated_by, deleted_flag, user_id, role_code, task_id, stat_date, submit_count, approve_count, reject_count, return_count, quality_score_avg, reward_amount, settled_reward_amount) " +
                        "VALUES (29302, 1, 0, 0, 0, 11001, 'LABELER', 15001, '2026-06-05', 2, 1, 0, 1, 91.00, 0.00, 0.00)");
        jdbcTemplate.update(
                "INSERT INTO user_stats_daily " +
                        "(id, tenant_id, created_by, updated_by, deleted_flag, user_id, role_code, task_id, stat_date, submit_count, approve_count, reject_count, return_count, quality_score_avg, reward_amount, settled_reward_amount) " +
                        "VALUES (29303, 1, 0, 0, 0, 11001, 'LABELER', 15001, '2026-06-08', 2, 1, 0, 1, 95.00, 0.00, 0.00)");
        jdbcTemplate.update(
                "INSERT INTO user_stats_daily " +
                        "(id, tenant_id, created_by, updated_by, deleted_flag, user_id, role_code, task_id, stat_date, submit_count, approve_count, reject_count, return_count, quality_score_avg, reward_amount, settled_reward_amount) " +
                        "VALUES (29304, 1, 0, 0, 0, 11003, 'LABELER', 15001, '2026-06-02', 2, 1, 0, 0, 88.00, 0.00, 0.00)");
        jdbcTemplate.update(
                "INSERT INTO user_stats_daily " +
                        "(id, tenant_id, created_by, updated_by, deleted_flag, user_id, role_code, task_id, stat_date, submit_count, approve_count, reject_count, return_count, quality_score_avg, reward_amount, settled_reward_amount) " +
                        "VALUES (29305, 1, 0, 0, 0, 11003, 'LABELER', 15001, '2026-06-05', 1, 1, 0, 0, 90.00, 0.00, 0.00)");
        jdbcTemplate.update(
                "INSERT INTO user_stats_daily " +
                        "(id, tenant_id, created_by, updated_by, deleted_flag, user_id, role_code, task_id, stat_date, submit_count, approve_count, reject_count, return_count, quality_score_avg, reward_amount, settled_reward_amount) " +
                        "VALUES (29306, 1, 0, 0, 0, 11003, 'LABELER', 15001, '2026-06-08', 3, 2, 0, 0, 89.00, 0.00, 0.00)");
    }

    private void seedReviewerAnalyticsStats() {
        jdbcTemplate.update(
                "INSERT INTO user_stats_daily " +
                        "(id, tenant_id, created_by, updated_by, deleted_flag, user_id, role_code, stat_date, approve_count, reject_count, return_count, avg_review_latency_sec, reward_amount, settled_reward_amount) " +
                        "VALUES (29401, 1, 0, 0, 0, 1001, 'REVIEWER', '2026-06-02', 2, 1, 0, 900, 0.00, 0.00)");
        jdbcTemplate.update(
                "INSERT INTO user_stats_daily " +
                        "(id, tenant_id, created_by, updated_by, deleted_flag, user_id, role_code, stat_date, approve_count, reject_count, return_count, avg_review_latency_sec, reward_amount, settled_reward_amount) " +
                        "VALUES (29402, 1, 0, 0, 0, 1001, 'REVIEWER', '2026-06-05', 1, 0, 1, 1200, 0.00, 0.00)");
        jdbcTemplate.update(
                "INSERT INTO user_stats_daily " +
                        "(id, tenant_id, created_by, updated_by, deleted_flag, user_id, role_code, stat_date, approve_count, reject_count, return_count, avg_review_latency_sec, reward_amount, settled_reward_amount) " +
                        "VALUES (29403, 1, 0, 0, 0, 1001, 'REVIEWER', '2026-06-08', 1, 0, 1, 600, 0.00, 0.00)");
        jdbcTemplate.update(
                "INSERT INTO user_stats_daily " +
                        "(id, tenant_id, created_by, updated_by, deleted_flag, user_id, role_code, stat_date, approve_count, reject_count, return_count, avg_review_latency_sec, reward_amount, settled_reward_amount) " +
                        "VALUES (29404, 1, 0, 0, 0, 19991, 'REVIEWER', '2026-06-02', 1, 1, 0, 600, 0.00, 0.00)");
        jdbcTemplate.update(
                "INSERT INTO user_stats_daily " +
                        "(id, tenant_id, created_by, updated_by, deleted_flag, user_id, role_code, stat_date, approve_count, reject_count, return_count, avg_review_latency_sec, reward_amount, settled_reward_amount) " +
                        "VALUES (29405, 1, 0, 0, 0, 19991, 'REVIEWER', '2026-06-08', 2, 0, 0, 300, 0.00, 0.00)");
    }

    private String loginAndGetToken(String username, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String body = result.getResponse().getContentAsString();
        return body.replaceAll(".*\"accessToken\":\"([^\"]+)\".*", "$1");
    }
}
