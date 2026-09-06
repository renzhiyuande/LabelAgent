package com.labelhub.app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.infra.claimtoken.ClaimTokenStockService;
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
 * P1 白盒：配额放量与凭证抢单（WB-QTA-001/003、WB-XSYS-007）。
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@Testcontainers(disabledWithoutDocker = true)
@DisplayName("P1 白盒 — 配额放量 (DB/Redis)")
class QuotaReleaseWhiteBoxIT {

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
        registry.add("labelhub.claim-token.stock-reservation-enabled", () -> "true");
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ClaimTokenStockService claimTokenStockService;

    @BeforeEach
    void seedP0Fixture() {
        ResourceDatabasePopulator populator = new ResourceDatabasePopulator();
        populator.addScript(new ClassPathResource("p0_whitebox_minimal_seed.sql"));
        populator.execute(jdbcTemplate.getDataSource());
        jdbcTemplate.update("DELETE FROM task_quota_release_batches WHERE task_id = 15005");
        jdbcTemplate.update("UPDATE tasks SET quota = 0 WHERE id = 15005");
        claimTokenStockService.initializeStock(15005L, 0);
    }

    @Test
    @DisplayName("WB-QTA-001-IT: releaseQuota 写 batch 并累加 Redis stock")
    void wbQta001_it_releaseQuotaIncrementsStock() throws Exception {
        String adminToken = loginAndGetToken("admin", "admin123");

        mockMvc.perform(post("/api/v1/owner/tasks/15005/quota-releases")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"releaseCount\":10,\"remark\":\"P1 IT\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.releaseCount").value(10))
                .andExpect(jsonPath("$.data.stockRemaining").value(10));

        Integer batchCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM task_quota_release_batches WHERE task_id = 15005 AND deleted_flag = 0",
                Integer.class);
        assertThat(batchCount).isEqualTo(1);

        Integer taskQuota = jdbcTemplate.queryForObject("SELECT quota FROM tasks WHERE id = 15005", Integer.class);
        assertThat(taskQuota).isEqualTo(10);
    }

    @Test
    @DisplayName("WB-QTA-003-IT: 连续两次 releaseQuota 累加 stock=10")
    void wbQta003_it_repeatedReleaseAccumulatesStock() throws Exception {
        String adminToken = loginAndGetToken("admin", "admin123");

        mockMvc.perform(post("/api/v1/owner/tasks/15005/quota-releases")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"releaseCount\":5}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.stockRemaining").value(5));

        mockMvc.perform(post("/api/v1/owner/tasks/15005/quota-releases")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"releaseCount\":5}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.stockRemaining").value(10));

        Integer taskQuota = jdbcTemplate.queryForObject("SELECT quota FROM tasks WHERE id = 15005", Integer.class);
        assertThat(taskQuota).isEqualTo(10);

        Integer batchCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM task_quota_release_batches WHERE task_id = 15005 AND deleted_flag = 0",
                Integer.class);
        assertThat(batchCount).isEqualTo(2);
    }

    @Test
    @DisplayName("WB-XSYS-007: releaseQuota 后凭证 issue 受 stock 约束")
    void wbXsys007_releaseThenClaimRespectsStock() throws Exception {
        String adminToken = loginAndGetToken("admin", "admin123");
        String labelerToken = loginAndGetToken("labeler_001", "admin123");

        mockMvc.perform(post("/api/v1/owner/tasks/15005/quota-releases")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"releaseCount\":2}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"));

        MvcResult firstIssue = mockMvc.perform(post("/api/v1/claim-tokens")
                        .header("Authorization", "Bearer " + labelerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "scene": "labeler.market",
                                  "payload": {"taskId": 15005, "count": 1}
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andReturn();

        MvcResult secondIssue = mockMvc.perform(post("/api/v1/claim-tokens")
                        .header("Authorization", "Bearer " + labelerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "scene": "labeler.market",
                                  "payload": {"taskId": 15005, "count": 1}
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andReturn();

        MvcResult thirdIssue = mockMvc.perform(post("/api/v1/claim-tokens")
                        .header("Authorization", "Bearer " + labelerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "scene": "labeler.market",
                                  "payload": {"taskId": 15005, "count": 1}
                                }
                                """))
                .andReturn();
        JsonNode thirdBody = objectMapper.readTree(thirdIssue.getResponse().getContentAsString());
        assertThat(thirdBody.path("code").asText("")).isEqualTo("CLAIM_TOKEN_STOCK_INSUFFICIENT");

        String firstToken = objectMapper.readTree(firstIssue.getResponse().getContentAsString())
                .path("data").path("token").asText();
        mockMvc.perform(post("/api/v1/claim-tokens/" + firstToken + "/redeem")
                        .header("Authorization", "Bearer " + labelerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"));

        String assignmentStatus = jdbcTemplate.queryForObject(
                "SELECT status FROM assignments WHERE id = 18005", String.class);
        assertThat(assignmentStatus).isEqualTo("CLAIMED");
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
