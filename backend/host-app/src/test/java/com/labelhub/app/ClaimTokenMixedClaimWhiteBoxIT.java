package com.labelhub.app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
 * P2 白盒：直连 vs 凭证混合抢单（WB-CC-042）。
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@Testcontainers(disabledWithoutDocker = true)
@DisplayName("P2 白盒 — 混合抢单 (DB/Redis)")
class ClaimTokenMixedClaimWhiteBoxIT {

    private static final long MIXED_TASK_ID = 15006L;

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
    void seedFixture() {
        ResourceDatabasePopulator populator = new ResourceDatabasePopulator();
        populator.addScript(new ClassPathResource("p0_whitebox_minimal_seed.sql"));
        populator.execute(jdbcTemplate.getDataSource());
        claimTokenStockService.initializeStock(MIXED_TASK_ID, 3);
    }

    @Test
    @DisplayName("WB-CC-042: 2 直连 + 3 凭证竞争 3 题，总领取不超过库存")
    void wbCc042_mixedDirectAndTokenClaimRespectsCapacity() throws Exception {
        AtomicInteger directSuccess = new AtomicInteger();
        AtomicInteger tokenIssueSuccess = new AtomicInteger();
        AtomicInteger tokenRedeemSuccess = new AtomicInteger();

        for (String username : List.of("labeler_001", "labeler_002")) {
            String token = loginAndGetToken(username, "admin123");
            if (tryDirectClaim(token)) {
                directSuccess.incrementAndGet();
            }
        }
        claimTokenStockService.syncStockFromDatabase(MIXED_TASK_ID);

        runConcurrent(
                List.of(
                        new Participant("labeler_003", Mode.TOKEN),
                        new Participant("labeler_004", Mode.TOKEN),
                        new Participant("labeler_005", Mode.TOKEN)),
                participant -> {
                    String token = loginAndGetToken(participant.username(), "admin123");
                    String claimToken = tryIssueToken(token);
                    if (claimToken != null) {
                        tokenIssueSuccess.incrementAndGet();
                        if (tryRedeem(token, claimToken)) {
                            tokenRedeemSuccess.incrementAndGet();
                        }
                    }
                });

        Integer claimedCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM assignments WHERE task_id = ? AND status = 'CLAIMED'",
                Integer.class,
                MIXED_TASK_ID);
        Integer unclaimedCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM assignments WHERE task_id = ? AND status = 'UNCLAIMED'",
                Integer.class,
                MIXED_TASK_ID);
        Integer duplicateItems = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*) FROM (
                          SELECT item_id FROM assignments
                          WHERE task_id = ? AND status = 'CLAIMED'
                          GROUP BY item_id HAVING COUNT(*) > 1
                        ) dup
                        """,
                Integer.class,
                MIXED_TASK_ID);
        Integer draftSubmissions = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*) FROM submissions s
                        JOIN assignments a ON a.id = s.assignment_id
                        WHERE a.task_id = ? AND a.status = 'CLAIMED' AND s.current_status = 'DRAFT'
                        """,
                Integer.class,
                MIXED_TASK_ID);

        assertThat(claimedCount).isEqualTo(3);
        assertThat(unclaimedCount).isZero();
        assertThat(duplicateItems).isZero();
        assertThat(draftSubmissions).isEqualTo(3);
        assertThat(directSuccess.get()).isEqualTo(2);
        assertThat(tokenIssueSuccess.get()).isLessThanOrEqualTo(3);
        assertThat(tokenRedeemSuccess.get()).isEqualTo(1);
        assertThat(directSuccess.get() + tokenRedeemSuccess.get()).isEqualTo(3);
    }

    private void runConcurrent(List<Participant> participants, ConcurrentAction action) throws Exception {
        int threads = participants.size();
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        List<Future<?>> futures = new ArrayList<>();

        for (Participant participant : participants) {
            futures.add(pool.submit(() -> {
                try {
                    start.await();
                    action.run(participant);
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
    }

    private boolean tryDirectClaim(String accessToken) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/labeler/tasks/" + MIXED_TASK_ID + "/claim-batch")
                        .param("count", "1")
                        .header("Authorization", "Bearer " + accessToken))
                .andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return result.getResponse().getStatus() == 200 && "SUCCESS".equals(body.path("code").asText(""));
    }

    private String tryIssueToken(String accessToken) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/claim-tokens")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "scene": "labeler.market",
                                  "payload": {"taskId": %d, "count": 1}
                                }
                                """.formatted(MIXED_TASK_ID)))
                .andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        if (!"SUCCESS".equals(body.path("code").asText(""))) {
            return null;
        }
        String token = body.path("data").path("token").asText("");
        return token.isBlank() ? null : token;
    }

    private boolean tryRedeem(String accessToken, String claimToken) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/claim-tokens/" + claimToken + "/redeem")
                        .header("Authorization", "Bearer " + accessToken))
                .andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return result.getResponse().getStatus() == 200 && "SUCCESS".equals(body.path("code").asText(""));
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

    private enum Mode {
        DIRECT,
        TOKEN
    }

    private record Participant(String username, Mode mode) {}

    @FunctionalInterface
    private interface ConcurrentAction {
        void run(Participant participant) throws Exception;
    }
}
