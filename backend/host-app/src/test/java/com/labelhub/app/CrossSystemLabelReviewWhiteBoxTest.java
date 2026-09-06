package com.labelhub.app;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.blankOrNullString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * P0 白盒：跨系统联动中间态断言（WB-XSYS-001 ~ WB-XSYS-004）
 *
 * <p>memory 模式可运行的用例在本类；需 DB/Redis 的用例见 {@link CrossSystemLabelReviewWhiteBoxIT}。
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("P0 白盒 — 跨系统标注审核联动 (memory)")
class CrossSystemLabelReviewWhiteBoxTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("WB-XSYS-001: 提交 → AI 入队 → 状态 AI_REVIEWING")
    @Disabled("需 DB fixture，见 CrossSystemLabelReviewWhiteBoxIT")
    void wbXsys001_submitEnqueuesAiReviewAndTransitionsStatus() {
    }

    @Test
    @DisplayName("WB-XSYS-002: 终审通过 → 奖励明细预写")
    @Disabled("需 DB fixture，见 CrossSystemLabelReviewWhiteBoxIT")
    void wbXsys002_finalApproveRecordsRewardDetail() {
    }

    @Test
    @DisplayName("WB-XSYS-003: 模板发布 → 创建任务 → 表单 schema 一致")
    @Disabled("需 DB fixture，见 CrossSystemLabelReviewWhiteBoxIT")
    void wbXsys003_templatePublishReflectsInTaskFormSchema() {
    }

    @Test
    @DisplayName("WB-XSYS-004: 申诉批准 → assignment 打回 → 重入审核池")
    @Disabled("需 DB fixture，见 CrossSystemLabelReviewWhiteBoxIT")
    void wbXsys004_appealApprovedReopensReviewPool() {
    }

    @Test
    @DisplayName("健康检查：内部端点可达（前置条件）")
    void agentHealthPrecondition() throws Exception {
        mockMvc.perform(get("/internal/v1/system/health")
                        .header("X-Internal-Token", "test-internal-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scope").value("internal"))
                .andExpect(jsonPath("$.traceId", not(blankOrNullString())));
    }
}
