package com.labelhub.app.review;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.review.AiReviewContext;
import com.labelhub.core.review.AiReviewEngine;
import com.labelhub.core.review.AiReviewResult;
import com.labelhub.infra.async.AsyncTaskWorker;
import com.labelhub.infra.business.llm.agent.AgentLlmCredentialResolver;
import com.labelhub.infra.business.llm.agent.AgentLlmCredentialResolver.LlmCredentials;
import com.labelhub.infra.business.review.engine.PyAgentAiReviewEngine;
import com.labelhub.infra.persistence.entity.LlmModelEntity;
import com.labelhub.infra.persistence.entity.LlmProviderEntity;
import com.labelhub.infra.persistence.mapper.LlmModelMapper;
import com.labelhub.infra.persistence.mapper.LlmProviderMapper;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.Socket;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * DeepSeek 真实 AI 预审联调（需本地 MySQL + Python Agent + API Key）。
 *
 * <p>运行：
 * <pre>
 *   export LABELHUB_LIVE_LLM_TEST=1
 *   cd agent && uvicorn app.main:app --port 8000
 *   cd backend && mvn -pl host-app test -Dtest=DeepseekAiReviewLiveIT
 * </pre>
 *
 * <p>数据库模型：llm_models.id = 9200203，model_code = deepseek-v4-flash
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = {
            "spring.datasource.hikari.initialization-fail-timeout=0",
            "spring.datasource.hikari.connection-timeout=2000"
        })
@AutoConfigureMockMvc
@ActiveProfiles("live")
class DeepseekAiReviewLiveIT {
    static final long DEEPSEEK_DB_MODEL_ID = 9200203L;
    static final String DEEPSEEK_MODEL_CODE = "deepseek-v4-flash";
    static final String DEEPSEEK_PLATFORM = "deepseek";
    static final String DEFAULT_LIVE_DATASOURCE_URL =
            "jdbc:mysql://127.0.0.1:3306/labelhub?useUnicode=true&characterEncoding=utf8"
                    + "&serverTimezone=Asia/Shanghai&rewriteBatchedStatements=true"
                    + "&allowPublicKeyRetrieval=true&useSSL=false";
    static final String DEFAULT_LIVE_DATASOURCE_USERNAME = "root";
    static final String DEFAULT_LIVE_DATASOURCE_PASSWORD = "TEST_ONLY_DB_PASSWORD";
    static final String DEFAULT_LIVE_REDIS_HOST = "127.0.0.1";
    static final int DEFAULT_LIVE_REDIS_PORT = 6379;
    static final String DEFAULT_LIVE_MINIO_ENDPOINT = "http://127.0.0.1:9000";
    static final String DEFAULT_LIVE_MINIO_ACCESS_KEY = "labelhub";
    static final String DEFAULT_LIVE_MINIO_SECRET_KEY = "TEST_ONLY_MINIO_SECRET_KEY";
    static final String DEFAULT_LIVE_MINIO_BUCKET = "labelhub";
    static final long LIVE_SUBMISSION_ID = 910238000011L;
    static final long LIVE_ASSIGNMENT_ID = 910237000011L;
    static final long LIVE_TEMPLATE_VERSION_ID = 910232000002L;
    static final String LIVE_LABELER_USERNAME = "seed_labeler_ben";
    static final String LIVE_LABELER_PASSWORD =
            System.getenv().getOrDefault("LABELHUB_LIVE_LABELER_PASSWORD", "TEST_ONLY_LABELER_PASSWORD");

    @Autowired
    LlmModelMapper llmModelMapper;
    @Autowired
    LlmProviderMapper llmProviderMapper;
    @Autowired
    AgentLlmCredentialResolver credentialResolver;
    @Autowired
    ObjectMapper objectMapper;
    @Autowired
    MockMvc mockMvc;
    @Autowired
    JdbcTemplate jdbcTemplate;
    @Autowired
    AsyncTaskWorker asyncTaskWorker;

    @DynamicPropertySource
    static void registerLiveDefaults(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> envOrDefault("LABELHUB_DATASOURCE_URL", DEFAULT_LIVE_DATASOURCE_URL));
        registry.add("spring.datasource.username", () -> envOrDefault("LABELHUB_DATASOURCE_USERNAME", DEFAULT_LIVE_DATASOURCE_USERNAME));
        registry.add("spring.datasource.password", () -> envOrDefault("LABELHUB_DATASOURCE_PASSWORD", DEFAULT_LIVE_DATASOURCE_PASSWORD));
        registry.add("labelhub.claim-token.stock-reservation-enabled", () -> "false");
        registry.add("labelhub.storage.minio.endpoint", () -> envOrDefault("LABELHUB_MINIO_ENDPOINT", DEFAULT_LIVE_MINIO_ENDPOINT));
        registry.add("labelhub.storage.minio.access-key", () -> envOrDefault("LABELHUB_MINIO_ACCESS_KEY", DEFAULT_LIVE_MINIO_ACCESS_KEY));
        registry.add("labelhub.storage.minio.secret-key", () -> envOrDefault("LABELHUB_MINIO_SECRET_KEY", DEFAULT_LIVE_MINIO_SECRET_KEY));
        registry.add("labelhub.storage.minio.bucket", () -> envOrDefault("LABELHUB_MINIO_BUCKET", DEFAULT_LIVE_MINIO_BUCKET));
        registry.add("labelhub.security.llm-outbound-allow-localhost", () -> "true");
    }

    private static void assumeLivePrerequisites() {
        assumeLiveFlag();
        assumeMysqlReachable();
        assumeRedisReachable();
        assumeAgentReachable();
    }

    private static void assumeLiveFlag() {
        assumeTrue("1".equals(System.getenv("LABELHUB_LIVE_LLM_TEST")),
                "Set LABELHUB_LIVE_LLM_TEST=1 to run live DeepSeek integration test");
    }

    private static void assumeMysqlReachable() {
        assumeTrue(
                isTcpReachable(mysqlHost(), mysqlPort(), 1500),
                "MySQL not reachable at " + mysqlHost() + ":" + mysqlPort() + " — start local DB or set LABELHUB_DATASOURCE_URL");
    }

    private static void assumeRedisReachable() {
        String redisHost = System.getenv().getOrDefault("SPRING_DATA_REDIS_HOST", DEFAULT_LIVE_REDIS_HOST);
        int redisPort = parseInt(System.getenv().get("SPRING_DATA_REDIS_PORT"), DEFAULT_LIVE_REDIS_PORT);
        assumeTrue(
                isTcpReachable(redisHost, redisPort, 1500),
                "Redis not reachable at " + redisHost + ":" + redisPort + " — start local Redis first");
    }

    private static void assumeAgentReachable() {
        String baseUrl = System.getenv().getOrDefault("LABELHUB_AGENT_BASE_URL", "http://127.0.0.1:8000");
        URI uri = URI.create(baseUrl);
        String host = uri.getHost() == null ? "127.0.0.1" : uri.getHost();
        int port = uri.getPort() > 0 ? uri.getPort() : 80;
        assumeTrue(
                isTcpReachable(host, port, 1500),
                "Python Agent not reachable at " + baseUrl + " — start uvicorn first");
    }

    @BeforeEach
    void resetReplayFixture() {
        assumeLivePrerequisites();
        requireLiveFixture();
        jdbcTemplate.update(
                "DELETE FROM ai_review_dimension_scores WHERE ai_review_id IN "
                        + "(SELECT id FROM ai_review_records WHERE submission_id = ?)",
                LIVE_SUBMISSION_ID);
        jdbcTemplate.update("DELETE FROM ai_review_records WHERE submission_id = ?", LIVE_SUBMISSION_ID);
        jdbcTemplate.update(
                "DELETE FROM submission_status_histories WHERE submission_id = ?",
                LIVE_SUBMISSION_ID);
        jdbcTemplate.update(
                "DELETE FROM async_tasks WHERE biz_type = 'SUBMISSION' AND biz_id = ?",
                LIVE_SUBMISSION_ID);
        jdbcTemplate.update("DELETE FROM submission_versions WHERE submission_id = ?", LIVE_SUBMISSION_ID);
        jdbcTemplate.update(
                """
                UPDATE submissions
                   SET current_version_id = NULL,
                       approved_version_id = NULL,
                       current_round_no = 1,
                       current_status = 'DRAFT',
                       current_review_level = NULL,
                       next_review_level = NULL,
                       submit_count = 0,
                       return_count = 0,
                       reopen_count = 0,
                       withdraw_count = 0,
                       appeal_count = 0,
                       last_submitted_at = NULL,
                       revision_required_at = NULL,
                       revision_deadline_at = NULL,
                       finalized_at = NULL,
                       last_action_code = 'SAVE_DRAFT',
                       last_action_at = draft_saved_at,
                       last_return_reason_text = NULL,
                       last_ai_review_id = NULL,
                       last_review_record_id = NULL,
                       updated_at = CURRENT_TIMESTAMP(3)
                 WHERE id = ?
                """,
                LIVE_SUBMISSION_ID);
        jdbcTemplate.update(
                """
                UPDATE assignments
                   SET status = 'CLAIMED',
                       current_round_no = 1,
                       closed_at = NULL,
                       canceled_at = NULL,
                       revoked_at = NULL,
                       cancel_reason = NULL,
                       updated_at = CURRENT_TIMESTAMP(3)
                 WHERE id = ?
                """,
                LIVE_ASSIGNMENT_ID);
    }

    @Test
    void loadsDeepseekModelFromDatabase() {
        assumeLivePrerequisites();
        LlmModelEntity model = llmModelMapper.selectById(DEEPSEEK_DB_MODEL_ID);
        assumeTrue(model != null && model.getDeletedFlag() != null && model.getDeletedFlag() == 0,
                "llm_models row " + DEEPSEEK_DB_MODEL_ID + " not found — apply V45 seed first");
        assertThat(model.getModelCode()).isEqualTo(DEEPSEEK_MODEL_CODE);
        assertThat(model.getStatus()).isEqualToIgnoringCase("ACTIVE");

        LlmProviderEntity provider = llmProviderMapper.selectById(model.getProviderId());
        assertThat(provider).isNotNull();
        assertThat(provider.getProviderCode()).isEqualTo(DEEPSEEK_PLATFORM);
        assertThat(provider.getBaseUrl()).isNotBlank();

        LlmCredentials credentials = credentialResolver.resolve(DEEPSEEK_PLATFORM).orElse(null);
        assumeTrue(credentials != null && credentials.apiKey() != null && !credentials.apiKey().isBlank(),
                "DeepSeek provider API key not configured in llm_providers — fill it in admin UI");
    }

    @Test
    void pyAgentAiReviewWithDeepseekFromDatabaseCatalog() {
        assumeLivePrerequisites();
        LlmModelEntity model = llmModelMapper.selectById(DEEPSEEK_DB_MODEL_ID);
        assumeTrue(model != null, "llm_models row missing");
        LlmProviderEntity provider = llmProviderMapper.selectById(model.getProviderId());
        assumeTrue(provider != null, "llm_providers row missing");

        LlmCredentials credentials = credentialResolver.resolve(provider.getProviderCode()).orElse(null);
        assumeTrue(credentials != null, "DeepSeek credentials unavailable");

        String agentBaseUrl = System.getenv().getOrDefault("LABELHUB_AGENT_BASE_URL", "http://127.0.0.1:8000");
        String internalToken = System.getenv().getOrDefault("LABELHUB_INTERNAL_TOKEN", "test-internal-token");
        AiReviewEngine engine = new PyAgentAiReviewEngine(agentBaseUrl, internalToken, objectMapper, credentialResolver);

        AiReviewContext context = new AiReviewContext(
                910238000001L,
                910239000001L,
                910230000001L,
                910237000001L,
                1,
                provider.getProviderCode(),
                model.getModelCode(),
                "你是 LabelHub 偏好对比标注 AI 预审助手。请评估标注质量并输出 JSON：scores、verdict、reason。",
                "{}",
                Map.of(
                        "choice", "A",
                        "reason", "回答 A 给出了定义和类比，结构更清晰，信息更完整。"),
                Map.of(
                        "prompt", "什么是机器学习？请用简洁语言解释。",
                        "response_a", "机器学习是让计算机从数据中自动学习规律，而无需显式编程的技术。",
                        "response_b", "机器学习就是 AI。"),
                List.of(
                        new AiReviewContext.AiReviewDimensionSpec(
                                "ACCURACY",
                                "准确性",
                                BigDecimal.valueOf(0.4),
                                BigDecimal.ZERO,
                                BigDecimal.valueOf(100),
                                BigDecimal.valueOf(70),
                                BigDecimal.valueOf(40),
                                "标注选择是否准确"),
                        new AiReviewContext.AiReviewDimensionSpec(
                                "COMPLETENESS",
                                "完整性",
                                BigDecimal.valueOf(0.3),
                                BigDecimal.ZERO,
                                BigDecimal.valueOf(100),
                                BigDecimal.valueOf(70),
                                BigDecimal.valueOf(40),
                                "理由是否充分")),
                List.of());

        AiReviewResult result = engine.review(context);

        assertThat(result.platformKey()).isEqualTo(DEEPSEEK_PLATFORM);
        assertThat(result.modelId()).isEqualTo(DEEPSEEK_MODEL_CODE);
        assertThat(result.verdict()).isIn(Set.of("PASS", "REJECT", "REQUIRE_HUMAN"));
        assertThat(result.totalScore()).isNotNull();
        assertThat(result.totalScore().doubleValue()).isBetween(0.0, 100.0);
        assertThat(result.summary()).isNotBlank();
        assertThat(result.dimensions()).hasSize(2);
        assertThat(result.providerRequestId()).isNotBlank();
    }

    @Test
    void submitPathPersistsLiveAiReviewAndTransitionsSubmission() throws Exception {
        assumeLivePrerequisites();
        loadsDeepseekModelFromDatabase();

        String draftJson = jdbcTemplate.queryForObject(
                "SELECT draft_data_json FROM submissions WHERE id = ?",
                String.class,
                LIVE_SUBMISSION_ID);
        assertThat(draftJson).isNotBlank();

        String labelerToken = loginAndGetToken(LIVE_LABELER_USERNAME, LIVE_LABELER_PASSWORD);
        mockMvc.perform(post("/api/v1/labeler/submissions/{submissionId}/submit", LIVE_SUBMISSION_ID)
                        .header("Authorization", "Bearer " + labelerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "finalSubmitData", objectMapper.readValue(draftJson, Map.class),
                                "comment", "live deepseek replay"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"));

        Long currentVersionId = jdbcTemplate.queryForObject(
                "SELECT current_version_id FROM submissions WHERE id = ?",
                Long.class,
                LIVE_SUBMISSION_ID);
        assertThat(currentVersionId).isPositive();

        Integer queuedTasks = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM async_tasks WHERE biz_type = 'SUBMISSION' AND biz_id = ? AND task_type = 'AI_REVIEW'",
                Integer.class,
                LIVE_SUBMISSION_ID);
        assertThat(queuedTasks).isGreaterThanOrEqualTo(1);

        asyncTaskWorker.poll();

        long aiReviewId = awaitLatestAiReviewId(LIVE_SUBMISSION_ID, 30_000);
        assertThat(aiReviewId).isPositive();

        String asyncStatus = awaitAsyncTaskStatus(LIVE_SUBMISSION_ID, 10_000);
        assertThat(asyncStatus).isEqualTo("SUCCESS");

        String finalStatus = awaitSubmissionStatus(
                LIVE_SUBMISSION_ID,
                10_000,
                "AI_PASSED",
                "AI_REJECTED",
                "HUMAN_REVIEWING");
        assertThat(finalStatus).isIn("AI_PASSED", "AI_REJECTED", "HUMAN_REVIEWING");

        Map<String, Object> record = jdbcTemplate.queryForMap(
                """
                SELECT id, submission_version_id, platform_key, model_id, status, verdict, total_score, summary_text, async_task_id
                  FROM ai_review_records
                 WHERE id = ?
                """,
                aiReviewId);
        assertThat(((Number) record.get("submission_version_id")).longValue()).isEqualTo(currentVersionId);
        assertThat(record.get("platform_key")).isEqualTo(DEEPSEEK_PLATFORM);
        assertThat(record.get("model_id")).isEqualTo(DEEPSEEK_MODEL_CODE);
        assertThat(record.get("status")).isEqualTo("SUCCESS");
        assertThat(record.get("verdict")).isIn("PASS", "REJECT", "REQUIRE_HUMAN");
        assertThat(record.get("total_score")).isNotNull();
        assertThat(record.get("summary_text")).isNotNull();
        assertThat(record.get("async_task_id")).isNotNull();

        Integer dimensionCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM ai_review_dimension_scores WHERE ai_review_id = ?",
                Integer.class,
                aiReviewId);
        assertThat(dimensionCount).isGreaterThan(0);

        Integer statusHistoryCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM submission_status_histories WHERE submission_id = ?",
                Integer.class,
                LIVE_SUBMISSION_ID);
        assertThat(statusHistoryCount).isGreaterThanOrEqualTo(3);

        Long lastAiReviewId = jdbcTemplate.queryForObject(
                "SELECT last_ai_review_id FROM submissions WHERE id = ?",
                Long.class,
                LIVE_SUBMISSION_ID);
        assertThat(lastAiReviewId).isEqualTo(aiReviewId);
    }

    private void requireLiveFixture() {
        Integer fixtureCount = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                  FROM submissions
                 WHERE id = ?
                   AND assignment_id = ?
                   AND current_template_version_id = ?
                """,
                Integer.class,
                LIVE_SUBMISSION_ID,
                LIVE_ASSIGNMENT_ID,
                LIVE_TEMPLATE_VERSION_ID);
        assumeTrue(fixtureCount != null && fixtureCount == 1,
                "Live seed fixture 910238000011 missing — import preference_compare_full_flow_seed.sql first");
    }

    private String loginAndGetToken(String username, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", username,
                                "password", password))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andReturn();
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        return root.path("data").path("accessToken").asText();
    }

    private long awaitLatestAiReviewId(long submissionId, long timeoutMs) throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeoutMs;
        Long latestId = null;
        while (System.currentTimeMillis() < deadline) {
            latestId = jdbcTemplate.query(
                    "SELECT id FROM ai_review_records WHERE submission_id = ? ORDER BY id DESC LIMIT 1",
                    rs -> rs.next() ? rs.getLong(1) : null,
                    submissionId);
            if (latestId != null && latestId > 0) {
                return latestId;
            }
            Thread.sleep(300);
        }
        return latestId == null ? 0L : latestId;
    }

    private String awaitAsyncTaskStatus(long submissionId, long timeoutMs) throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeoutMs;
        String latestStatus = null;
        while (System.currentTimeMillis() < deadline) {
            latestStatus = jdbcTemplate.query(
                    """
                    SELECT status
                      FROM async_tasks
                     WHERE biz_type = 'SUBMISSION' AND biz_id = ?
                     ORDER BY id DESC
                     LIMIT 1
                    """,
                    rs -> rs.next() ? rs.getString(1) : null,
                    submissionId);
            if ("SUCCESS".equals(latestStatus) || "DEAD_LETTER".equals(latestStatus)) {
                return latestStatus;
            }
            Thread.sleep(300);
        }
        return latestStatus;
    }

    private String awaitSubmissionStatus(long submissionId, long timeoutMs, String... acceptable) throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            String statusValue = jdbcTemplate.queryForObject(
                    "SELECT current_status FROM submissions WHERE id = ?",
                    String.class,
                    submissionId);
            for (String candidate : acceptable) {
                if (candidate.equals(statusValue)) {
                    return statusValue;
                }
            }
            Thread.sleep(200);
        }
        return jdbcTemplate.queryForObject(
                "SELECT current_status FROM submissions WHERE id = ?",
                String.class,
                submissionId);
    }

    private static String envOrDefault(String key, String fallback) {
        String value = System.getenv(key);
        return value == null || value.isBlank() ? fallback : value;
    }

    private static String mysqlHost() {
        String url = envOrDefault("LABELHUB_DATASOURCE_URL", DEFAULT_LIVE_DATASOURCE_URL);
        String normalized = url.replaceFirst("^jdbc:mysql://", "");
        int slash = normalized.indexOf('/');
        String hostPort = slash >= 0 ? normalized.substring(0, slash) : normalized;
        int colon = hostPort.indexOf(':');
        return colon >= 0 ? hostPort.substring(0, colon) : hostPort;
    }

    private static int mysqlPort() {
        String url = envOrDefault("LABELHUB_DATASOURCE_URL", DEFAULT_LIVE_DATASOURCE_URL);
        String normalized = url.replaceFirst("^jdbc:mysql://", "");
        int slash = normalized.indexOf('/');
        String hostPort = slash >= 0 ? normalized.substring(0, slash) : normalized;
        int colon = hostPort.indexOf(':');
        return colon >= 0 ? parseInt(hostPort.substring(colon + 1), 3306) : 3306;
    }

    private static int parseInt(String value, int fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private static boolean isTcpReachable(String host, int port, int timeoutMs) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), timeoutMs);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }
}
