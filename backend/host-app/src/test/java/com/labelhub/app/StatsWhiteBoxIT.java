package com.labelhub.app;

import static org.assertj.core.api.Assertions.assertThat;
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

/**
 * P1 白盒：统计分析（WB-STS-001~003、WB-XSYS-008）。
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@Testcontainers(disabledWithoutDocker = true)
@DisplayName("P1 白盒 — 统计分析 (DB/Redis)")
class StatsWhiteBoxIT {

    @Container
    static MySQLContainer<?> mysql = new MySQLContainer<>(DockerImageName.parse("mysql:8.0"))
            .withDatabaseName("labelhub_it")
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
        jdbcTemplate.update("DELETE FROM task_stats_daily WHERE task_id = 15001");
        jdbcTemplate.update("DELETE FROM user_stats_daily WHERE task_id = 15001");
    }

    @Test
    @DisplayName("WB-STS-002: platformOverview 聚合与库表一致")
    void wbSts002_platformOverviewMatchesDatabase() throws Exception {
        String adminToken = loginAndGetToken("admin", "admin123");

        Integer totalTasks = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM tasks WHERE deleted_flag = 0", Integer.class);
        Integer publishedTasks = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM tasks WHERE deleted_flag = 0 AND status = 'PUBLISHED'", Integer.class);
        Integer totalSubmissions = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM submissions WHERE deleted_flag = 0", Integer.class);
        Integer approvedSubmissions = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM submissions WHERE deleted_flag = 0 AND current_status = 'APPROVED'", Integer.class);

        mockMvc.perform(get("/api/v1/stats/platform")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.totalTasks").value(totalTasks))
                .andExpect(jsonPath("$.data.publishedTasks").value(publishedTasks))
                .andExpect(jsonPath("$.data.totalSubmissions").value(totalSubmissions))
                .andExpect(jsonPath("$.data.approvedSubmissions").value(approvedSubmissions));
    }

    @Test
    @DisplayName("WB-STS-003: backfillDailyStats 按历史补录 3 天日报")
    void wbSts003_backfillDailyStatsCreatesThreeDailyRows() throws Exception {
        String adminToken = loginAndGetToken("admin", "admin123");

        mockMvc.perform(post("/api/v1/stats/daily/backfill")
                        .param("from", "2026-06-01")
                        .param("to", "2026-06-03")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.fromDate").value("2026-06-01"))
                .andExpect(jsonPath("$.data.toDate").value("2026-06-03"))
                .andExpect(jsonPath("$.data.taskDailyRows").value(3));

        Integer dailyRows = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM task_stats_daily WHERE task_id = 15001 AND deleted_flag = 0",
                Integer.class);
        assertThat(dailyRows).isEqualTo(3);

        Integer submitOnDay1 = jdbcTemplate.queryForObject(
                "SELECT submit_count FROM task_stats_daily WHERE task_id = 15001 AND stat_date = '2026-06-01'",
                Integer.class);
        assertThat(submitOnDay1).isEqualTo(1);

        Integer approveOnDay2 = jdbcTemplate.queryForObject(
                "SELECT approve_count FROM task_stats_daily WHERE task_id = 15001 AND stat_date = '2026-06-02'",
                Integer.class);
        assertThat(approveOnDay2).isEqualTo(1);

        Integer rejectOnDay3 = jdbcTemplate.queryForObject(
                "SELECT reject_count FROM task_stats_daily WHERE task_id = 15001 AND stat_date = '2026-06-03'",
                Integer.class);
        assertThat(rejectOnDay3).isEqualTo(1);
    }

    @Test
    @DisplayName("WB-XSYS-008: backfillDailyStats 重复执行幂等")
    void wbXsys008_backfillDailyStatsIsIdempotent() throws Exception {
        String adminToken = loginAndGetToken("admin", "admin123");

        for (int i = 0; i < 2; i++) {
            mockMvc.perform(post("/api/v1/stats/daily/backfill")
                            .param("from", "2026-06-01")
                            .param("to", "2026-06-03")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value("SUCCESS"))
                    .andExpect(jsonPath("$.data.taskDailyRows").value(3));
        }

        Integer dailyRows = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM task_stats_daily WHERE task_id = 15001 AND deleted_flag = 0",
                Integer.class);
        assertThat(dailyRows).isEqualTo(3);

        Integer approveOnDay2 = jdbcTemplate.queryForObject(
                "SELECT approve_count FROM task_stats_daily WHERE task_id = 15001 AND stat_date = '2026-06-02'",
                Integer.class);
        assertThat(approveOnDay2).isEqualTo(1);
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
