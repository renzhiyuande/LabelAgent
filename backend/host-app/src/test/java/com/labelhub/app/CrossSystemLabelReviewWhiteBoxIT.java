package com.labelhub.app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

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
 * P0 白盒跨系统集成：依赖 Testcontainers MySQL + Redis。
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@Testcontainers(disabledWithoutDocker = true)
@DisplayName("P0 白盒 — 跨系统联动 (DB/Redis)")
class CrossSystemLabelReviewWhiteBoxIT {

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

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void seedP0Fixture() {
        ResourceDatabasePopulator populator = new ResourceDatabasePopulator();
        populator.addScript(new ClassPathResource("p0_whitebox_minimal_seed.sql"));
        populator.execute(jdbcTemplate.getDataSource());
    }

    @Test
    @DisplayName("WB-XSYS-001: 提交 → AI 入队 → 状态迁移")
    void wbXsys001_submitEnqueuesAiReviewAndTransitionsStatus() throws Exception {
        String labelerToken = loginAndGetToken("labeler_001", "admin123");

        mockMvc.perform(post("/api/v1/labeler/submissions/19001/submit")
                        .header("Authorization", "Bearer " + labelerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"finalSubmitData\":{\"label_text\":\"A\"},\"comment\":null}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"));

        String status = jdbcTemplate.queryForObject(
                "SELECT current_status FROM submissions WHERE id = 19001", String.class);
        assertThat(status).isIn("SUBMITTED", "AI_REVIEWING");

        Integer asyncCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM async_tasks WHERE biz_type = 'SUBMISSION' AND biz_id = 19001 AND task_type = 'AI_REVIEW'",
                Integer.class);
        assertThat(asyncCount).isGreaterThanOrEqualTo(1);
    }

    @Test
    @DisplayName("WB-REV-001-IT: 提交后 Mock AI 审核写入 ai_review_records")
    void wbRev001_it_mockAiReviewWritesRecordAfterSubmit() throws Exception {
        String labelerToken = loginAndGetToken("labeler_001", "admin123");

        mockMvc.perform(post("/api/v1/labeler/submissions/19001/submit")
                        .header("Authorization", "Bearer " + labelerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"finalSubmitData\":{\"label_text\":\"ai-review\"},\"comment\":null}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"));

        Integer reviewRecords = awaitAiReviewRecordCount(19001, 20_000);
        assertThat(reviewRecords).isGreaterThanOrEqualTo(1);

        String settledStatus = jdbcTemplate.queryForObject(
                "SELECT current_status FROM submissions WHERE id = 19001", String.class);
        assertThat(settledStatus).isIn("AI_PASSED", "HUMAN_REVIEWING", "AI_REJECTED");
    }

    @Test
    @DisplayName("WB-AUTH-003-DB: 连续 5 次失败后第 6 次登录账号锁定")
    void wbAuth003_accountLockedAfterRepeatedFailures() throws Exception {
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"username\":\"lock_test_001\",\"password\":\"wrong-password\"}"))
                    .andExpect(status().isUnauthorized());
        }

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"lock_test_001\",\"password\":\"wrong-password\"}"))
                .andExpect(status().is(423))
                .andExpect(jsonPath("$.code").value("AUTH_009"));
    }

    @Test
    @DisplayName("WB-AUTH-004-IT: refresh 轮换后旧 refresh token 不可复用")
    void wbAuth004_refreshRotatesAndRevokesOldToken() throws Exception {
        MvcResult login = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"admin123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andReturn();

        String body = login.getResponse().getContentAsString();
        String oldRefresh = extractJsonField(body, "refreshToken");

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + oldRefresh + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + oldRefresh + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_004"));

        String status = jdbcTemplate.queryForObject(
                "SELECT status FROM auth_refresh_tokens WHERE refresh_token_hash = ?",
                String.class,
                sha256TokenHash(oldRefresh));
        assertThat(status).isEqualTo("DISABLED");
    }

    @Test
    @DisplayName("WB-AUTH-005-DB: labeler 无 admin 权限访问 /admin/users 返回 403")
    void wbAuth005_forbiddenWithoutPermissionInDbMode() throws Exception {
        String labelerToken = loginAndGetToken("labeler_001", "admin123");
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + labelerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("WB-XSYS-002: 终审通过 → 奖励明细预写 → labeler 可查")
    void wbXsys002_finalApproveRecordsRewardDetail() throws Exception {
        String adminToken = loginAndGetToken("admin", "admin123");

        mockMvc.perform(post("/api/v1/reviewer/audit-pool/19002/approve")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"commentText\":\"P0 终审通过\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"));

        String status = jdbcTemplate.queryForObject(
                "SELECT current_status FROM submissions WHERE id = 19002", String.class);
        assertThat(status).isEqualTo("APPROVED");

        Integer detailCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM reward_settlement_details WHERE submission_id = 19002 AND deleted_flag = 0",
                Integer.class);
        assertThat(detailCount).isEqualTo(1);

        BigDecimal amount = jdbcTemplate.queryForObject(
                "SELECT amount FROM reward_settlement_details WHERE submission_id = 19002 AND deleted_flag = 0",
                BigDecimal.class);
        assertThat(amount).isEqualByComparingTo(new BigDecimal("5.00"));

        String labelerToken = loginAndGetToken("labeler_001", "admin123");
        mockMvc.perform(get("/api/v1/labeler/my-rewards")
                        .param("taskId", "15001")
                        .header("Authorization", "Bearer " + labelerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.list[0].amount").value(5.0));
    }

    @Test
    @DisplayName("WB-XSYS-003: 模板发布 → 创建任务 → 表单 schema 一致")
    void wbXsys003_templatePublishReflectsInTaskFormSchema() throws Exception {
        String adminToken = loginAndGetToken("admin", "admin123");

        MvcResult taskResult = mockMvc.perform(post("/api/v1/owner/tasks")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "taskCode": "P0_XSYS3_TASK",
                                  "title": "P0 XSYS3 Task",
                                  "sceneCode": "GENERAL",
                                  "distributeStrategy": "FIRST_COME",
                                  "reviewWorkflowJson": {
                                    "levels": [{"key": "L1", "label": "初审", "actions": ["approve", "reject", "return"]}]
                                  }
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andReturn();
        long taskId = readDataId(taskResult);

        MvcResult templateResult = mockMvc.perform(post("/api/v1/owner/templates")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "taskId": %d,
                                  "templateCode": "P0_XSYS3_TPL",
                                  "templateName": "P0 XSYS3 Template",
                                  "sceneCode": "GENERAL"
                                }
                                """.formatted(taskId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andReturn();
        long templateId = readDataId(templateResult);

        MvcResult draftResult = mockMvc.perform(post("/api/v1/owner/template-versions/drafts")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"templateId\": " + templateId + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andReturn();
        long draftVersionId = readDataId(draftResult);

        String schemaJson = objectMapper.writeValueAsString(
                java.util.Map.of("fields", java.util.List.of(
                        java.util.Map.of("key", "xsys3_marker", "label", "Marker", "type", "text", "required", true))));
        mockMvc.perform(put("/api/v1/owner/template-versions/drafts/" + draftVersionId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"schemaJson\": " + objectMapper.writeValueAsString(schemaJson) + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"));

        mockMvc.perform(post("/api/v1/owner/template-versions/" + draftVersionId + "/publish")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"));

        MvcResult taskDetail = mockMvc.perform(get("/api/v1/owner/tasks/" + taskId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(readDataLongField(taskDetail, "currentTemplateVersionId")).isEqualTo(draftVersionId);

        MvcResult versionDetail = mockMvc.perform(get("/api/v1/owner/template-versions/" + draftVersionId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode versionRoot = objectMapper.readTree(versionDetail.getResponse().getContentAsString());
        JsonNode schemaNode = objectMapper.readTree(versionRoot.path("data").path("schemaJson").asText());
        assertThat(schemaNode.path("fields").get(0).path("key").asText()).isEqualTo("xsys3_marker");
    }

    @Test
    @DisplayName("WB-XSYS-004: 申诉批准 → assignment 打回 → 重入审核池")
    void wbXsys004_appealApprovedReopensReviewPool() throws Exception {
        String labelerToken = loginAndGetToken("labeler_001", "admin123");
        String adminToken = loginAndGetToken("admin", "admin123");

        mockMvc.perform(post("/api/v1/labeler/submissions/19003/appeal")
                        .header("Authorization", "Bearer " + labelerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reasonText\":\"驳回理由不充分，申请复核\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"));

        String appealingStatus = jdbcTemplate.queryForObject(
                "SELECT current_status FROM submissions WHERE id = 19003", String.class);
        assertThat(appealingStatus).isEqualTo("APPEALING_HUMAN");

        Long appealId = jdbcTemplate.queryForObject(
                "SELECT id FROM submission_appeals WHERE submission_id = 19003 AND status = 'PENDING' ORDER BY id DESC LIMIT 1",
                Long.class);
        assertThat(appealId).isNotNull();

        mockMvc.perform(post("/api/v1/owner/appeals/" + appealId + "/decision")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"APPROVE\",\"decisionReasonText\":\"同意申诉，请修改后重提\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"));

        String submissionStatus = jdbcTemplate.queryForObject(
                "SELECT current_status FROM submissions WHERE id = 19003", String.class);
        assertThat(submissionStatus).isEqualTo("APPEAL_APPROVED_SKIP_HUMAN");

        String assignmentStatus = jdbcTemplate.queryForObject(
                "SELECT status FROM assignments WHERE id = 18003", String.class);
        assertThat(assignmentStatus).isEqualTo("CLAIMED");

        mockMvc.perform(post("/api/v1/labeler/submissions/19003/submit")
                        .header("Authorization", "Bearer " + labelerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"finalSubmitData\":{\"label_text\":\"appeal resubmit\"},\"comment\":null}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"));

        String afterResubmit = jdbcTemplate.queryForObject(
                "SELECT current_status FROM submissions WHERE id = 19003", String.class);
        assertThat(afterResubmit).isIn(
                "SUBMITTED_APPEAL_HUMAN", "AI_REVIEWING_APPEAL_HUMAN", "HUMAN_REVIEWING", "APPROVED");

        Integer aiTaskCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM async_tasks WHERE biz_type = 'SUBMISSION' AND biz_id = 19003 AND task_type = 'AI_REVIEW'",
                Integer.class);
        assertThat(aiTaskCount).isGreaterThanOrEqualTo(1);

        String settledStatus = awaitSubmissionStatus(19003, 8_000,
                "HUMAN_REVIEWING", "APPROVED", "AI_REVIEWING_APPEAL_HUMAN");
        if ("HUMAN_REVIEWING".equals(settledStatus)) {
            mockMvc.perform(get("/api/v1/reviewer/audit-pool")
                            .param("scopeType", "task")
                            .param("scopeIds", "15003")
                            .param("reviewLevel", "L1")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value("SUCCESS"))
                    .andExpect(jsonPath("$.data.total").value(1))
                    .andExpect(jsonPath("$.data.list[0].submissionId").value(19003));
        }
    }

    @Test
    @DisplayName("WB-STS-001 / WB-XSYS-008: taskOverview 计数与 submission 表一致")
    void wbSts001_taskOverviewMatchesSubmissionCounts() throws Exception {
        String adminToken = loginAndGetToken("admin", "admin123");

        Integer draftCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM submissions WHERE task_id = 15001 AND deleted_flag = 0 AND current_status = 'DRAFT'",
                Integer.class);
        Integer humanReviewingCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM submissions WHERE task_id = 15001 AND deleted_flag = 0 AND current_status = 'HUMAN_REVIEWING'",
                Integer.class);

        mockMvc.perform(get("/api/v1/stats/tasks/15001")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.taskId").value(15001))
                .andExpect(jsonPath("$.data.inProgressCount").value(draftCount))
                .andExpect(jsonPath("$.data.humanReviewingCount").value(humanReviewingCount));
    }

    @Test
    @DisplayName("WB-XSYS-IT: DB 模式 admin 登录")
    void dbModeAdminLoginWorks() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"admin123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"));
    }

    private static String extractJsonField(String body, String field) {
        return body.replaceAll(".*\"" + field + "\":\"([^\"]+)\".*", "$1");
    }

    private static String sha256TokenHash(String raw) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
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

    private long readDataId(MvcResult result) throws Exception {
        return readDataLongField(result, "id");
    }

    private long readDataLongField(MvcResult result, String field) throws Exception {
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        return root.path("data").path(field).asLong();
    }

    private Integer awaitAiReviewRecordCount(long submissionId, long timeoutMs) throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeoutMs;
        int count = 0;
        while (System.currentTimeMillis() < deadline) {
            count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM ai_review_records WHERE submission_id = ? AND deleted_flag = 0",
                    Integer.class,
                    submissionId);
            if (count >= 1) {
                return count;
            }
            Thread.sleep(300);
        }
        return count;
    }

    private String awaitSubmissionStatus(long submissionId, long timeoutMs, String... acceptable) throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            String status = jdbcTemplate.queryForObject(
                    "SELECT current_status FROM submissions WHERE id = ?", String.class, submissionId);
            for (String candidate : acceptable) {
                if (candidate.equals(status)) {
                    return status;
                }
            }
            Thread.sleep(200);
        }
        return jdbcTemplate.queryForObject(
                "SELECT current_status FROM submissions WHERE id = ?", String.class, submissionId);
    }
}
