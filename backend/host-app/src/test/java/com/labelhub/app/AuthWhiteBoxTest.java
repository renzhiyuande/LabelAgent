package com.labelhub.app;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.blankOrNullString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
 * P0 白盒：认证授权（WB-AUTH-001 ~ WB-AUTH-007）
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("P0 白盒 — 认证授权")
class AuthWhiteBoxTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("WB-AUTH-001: 正确用户名密码登录成功")
    void wbAuth001_loginWithValidCredentials() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"admin123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.accessToken", not(blankOrNullString())))
                .andExpect(jsonPath("$.data.refreshToken", not(blankOrNullString())));
    }

    @Test
    @DisplayName("WB-AUTH-002: 错误密码登录失败")
    void wbAuth002_loginWithWrongPassword() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_003"));
    }

    @Test
    @DisplayName("WB-AUTH-003: 不存在用户登录失败")
    void wbAuth003_loginWithUnknownUser() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"not_exist_user\",\"password\":\"any\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("WB-AUTH-004: 无效 token 访问 /me 返回 AUTH_INVALID_TOKEN")
    void wbAuth004_expiredTokenRejected() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer expired-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_004"));
    }

    @Test
    @DisplayName("WB-AUTH-005: labeler 登录成功且 /me 身份正确")
    void wbAuth005_labelerLoginAndMeWorks() throws Exception {
        String labelerToken = loginAndGetToken("labeler_001", "labeler123");
        mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + labelerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("labeler_001"));
    }

    @Test
    @DisplayName("WB-AUTH-006: refresh token 换取新 access token")
    void wbAuth006_refreshTokenRotation() throws Exception {
        MvcResult login = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"admin123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String body = login.getResponse().getContentAsString();
        String accessToken = extractJsonField(body, "accessToken");
        String refreshToken = extractJsonField(body, "refreshToken");

        MvcResult refresh = mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.accessToken", not(blankOrNullString())))
                .andReturn();

        String newAccessToken = extractJsonField(refresh.getResponse().getContentAsString(), "accessToken");
        org.junit.jupiter.api.Assertions.assertNotEquals(accessToken, newAccessToken);
    }

    @Test
    @DisplayName("WB-AUTH-007: 登出后 token 失效")
    void wbAuth007_logoutInvalidatesToken() throws Exception {
        String token = loginAndGetToken("admin", "admin123");
        mockMvc.perform(post("/api/v1/auth/logout").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_004"));
    }

    private String loginAndGetToken(String username, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return extractJsonField(result.getResponse().getContentAsString(), "accessToken");
    }

    private static String extractJsonField(String body, String field) {
        return body.replaceAll(".*\"" + field + "\":\"([^\"]+)\".*", "$1");
    }
}
