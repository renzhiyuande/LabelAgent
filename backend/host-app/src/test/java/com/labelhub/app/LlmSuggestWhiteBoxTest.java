package com.labelhub.app;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * P2 白盒：LLM 字段建议 HTTP 契约（WB-XSYS-006，memory 模式）。
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("P2 白盒 — LLM 字段建议 (memory)")
class LlmSuggestWhiteBoxTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("WB-XSYS-006: POST /engine/llm-suggest 返回建议文本")
    void wbXsys006_llmSuggestEndpointReturnsSuggestion() throws Exception {
        String token = loginAndGetAccessToken();

        mockMvc.perform(post("/api/v1/engine/llm-suggest")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fieldCode": "aiReference",
                                  "templateVersionId": 13001,
                                  "taskId": 15001
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.text").isNotEmpty());
    }

    @Test
    @DisplayName("WB-XSYS-006: POST /engine/llm-suggest/preview 返回组装 Prompt")
    void wbXsys006_llmSuggestPreviewReturnsPromptAssembly() throws Exception {
        String token = loginAndGetAccessToken();

        mockMvc.perform(post("/api/v1/engine/llm-suggest/preview")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fieldCode": "aiReference",
                                  "templateVersionId": 13001,
                                  "taskId": 15001
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.userPrompt").isNotEmpty());
    }

    private String loginAndGetAccessToken() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"admin123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String body = result.getResponse().getContentAsString();
        return body.replaceAll(".*\"accessToken\":\"([^\"]+)\".*", "$1");
    }
}
