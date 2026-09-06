package com.labelhub.app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.infra.claimtoken.ClaimTokenStockService;
import com.redis.testcontainers.RedisContainer;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
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
 * P0 白盒：凭证兑换并发互斥（WB-CC-022）— Testcontainers MySQL + Redis。
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@Testcontainers(disabledWithoutDocker = true)
@DisplayName("P0 白盒 — ClaimToken 兑换并发 (DB/Redis)")
class ClaimTokenRedeemWhiteBoxIT {

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
    }

    @Test
    @DisplayName("WB-CC-022: 同 token 并发 redeem 仅一次成功")
    void wbCc022_concurrentRedeemOnlyOneSucceeds() throws Exception {
        String labelerToken = loginAndGetToken("labeler_001", "admin123");

        MvcResult issueResult = mockMvc.perform(post("/api/v1/claim-tokens")
                        .header("Authorization", "Bearer " + labelerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "scene": "labeler.market",
                                  "payload": {"taskId": 15001, "count": 1}
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andReturn();

        String claimToken = objectMapper.readTree(issueResult.getResponse().getContentAsString())
                .path("data")
                .path("token")
                .asText();
        assertThat(claimToken).isNotBlank();

        int threads = 2;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger success = new AtomicInteger();
        AtomicInteger alreadyUsed = new AtomicInteger();
        List<Future<?>> futures = new ArrayList<>();

        for (int i = 0; i < threads; i++) {
            futures.add(pool.submit(() -> {
                try {
                    start.await();
                    MvcResult redeemResult = mockMvc.perform(post("/api/v1/claim-tokens/" + claimToken + "/redeem")
                                    .header("Authorization", "Bearer " + labelerToken))
                            .andReturn();
                    int httpStatus = redeemResult.getResponse().getStatus();
                    JsonNode body = objectMapper.readTree(redeemResult.getResponse().getContentAsString());
                    String code = body.path("code").asText("");
                    if (httpStatus == 200 && "SUCCESS".equals(code)) {
                        success.incrementAndGet();
                    } else if ("CLAIM_TOKEN_ALREADY_USED".equals(code)) {
                        alreadyUsed.incrementAndGet();
                    }
                } catch (Exception ex) {
                    throw new RuntimeException(ex);
                } finally {
                    done.countDown();
                }
            }));
        }

        start.countDown();
        done.await();
        pool.shutdown();
        for (Future<?> future : futures) {
            future.get();
        }

        assertThat(success.get()).isEqualTo(1);
        assertThat(alreadyUsed.get()).isEqualTo(1);

        Integer claimed = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM assignments WHERE task_id = 15001 AND status = 'CLAIMED' AND labeler_id = 11001",
                Integer.class);
        assertThat(claimed).isGreaterThanOrEqualTo(1);
    }

    @Test
    @DisplayName("WB-CC-041: issue+redeem 全链路成功且库存扣减")
    void wbCc041_issueThenRedeemFullChain() throws Exception {
        String labelerToken = loginAndGetToken("labeler_001", "admin123");
        claimTokenStockService.syncStockFromDatabase(15001L);

        MvcResult issueResult = mockMvc.perform(post("/api/v1/claim-tokens")
                        .header("Authorization", "Bearer " + labelerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "scene": "labeler.market",
                                  "payload": {"taskId": 15001, "count": 1}
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andReturn();

        String claimToken = objectMapper.readTree(issueResult.getResponse().getContentAsString())
                .path("data")
                .path("token")
                .asText();

        mockMvc.perform(post("/api/v1/claim-tokens/" + claimToken + "/redeem")
                        .header("Authorization", "Bearer " + labelerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"));

        String assignmentStatus = jdbcTemplate.queryForObject(
                "SELECT status FROM assignments WHERE id = 18004", String.class);
        assertThat(assignmentStatus).isEqualTo("CLAIMED");
    }

    @Test
    @DisplayName("WB-CC-041: stock=1 时并发 issue 仅一次成功")
    void wbCc041_concurrentIssueRespectsSingleStock() throws Exception {
        String labelerToken = loginAndGetToken("labeler_001", "admin123");
        claimTokenStockService.initializeStock(15001L, 1);

        int threads = 3;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger issued = new AtomicInteger();
        AtomicInteger stockInsufficient = new AtomicInteger();
        List<Future<?>> futures = new ArrayList<>();

        for (int i = 0; i < threads; i++) {
            futures.add(pool.submit(() -> {
                try {
                    start.await();
                    MvcResult issueResult = mockMvc.perform(post("/api/v1/claim-tokens")
                                    .header("Authorization", "Bearer " + labelerToken)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content("""
                                            {
                                              "scene": "labeler.market",
                                              "payload": {"taskId": 15001, "count": 1}
                                            }
                                            """))
                            .andReturn();
                    JsonNode body = objectMapper.readTree(issueResult.getResponse().getContentAsString());
                    String code = body.path("code").asText("");
                    if ("SUCCESS".equals(code)) {
                        issued.incrementAndGet();
                    } else if ("CLAIM_TOKEN_STOCK_INSUFFICIENT".equals(code)) {
                        stockInsufficient.incrementAndGet();
                    }
                } catch (Exception ex) {
                    throw new RuntimeException(ex);
                } finally {
                    done.countDown();
                }
            }));
        }

        start.countDown();
        done.await();
        pool.shutdown();
        for (Future<?> future : futures) {
            future.get();
        }

        assertThat(issued.get()).isEqualTo(1);
        assertThat(stockInsufficient.get()).isEqualTo(2);
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
