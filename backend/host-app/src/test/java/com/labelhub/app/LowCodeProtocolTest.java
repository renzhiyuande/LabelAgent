package com.labelhub.app;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.blankOrNullString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LowCodeProtocolTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void optionsEndpointUsesStableShape() throws Exception {
        String token = loginAndGetAccessToken();

        mockMvc.perform(get("/api/v1/engine/options/roles").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data").isArray());

        mockMvc.perform(get("/api/v1/engine/options/menus").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data").isArray());

        mockMvc.perform(get("/api/v1/engine/options/users?keyword=admin").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data").isArray());

        mockMvc.perform(get("/api/v1/engine/options/dictTypes").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data").isArray());

        mockMvc.perform(get("/api/v1/engine/options/systemClients").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data").isArray());

        mockMvc.perform(get("/api/v1/engine/options/distributeStrategies").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].value").value("FIRST_COME"));
    }

    @Test
    @org.junit.jupiter.api.DisplayName("WB-LC-008: LowCode query action 统一分页响应")
    void queryEndpointAcceptsDslShape() throws Exception {
        String token = loginAndGetAccessToken();

        mockMvc.perform(post("/api/v1/engine/resources/users/query")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "page": 1,
                                  "pageSize": 10,
                                  "sort": [
                                    { "field": "id", "order": "desc" }
                                  ],
                                  "filters": [
                                    { "field": "keyword", "op": "like", "value": "admin" },
                                    { "field": "status", "op": "eq", "value": "ACTIVE" }
                                  ]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.list").isArray())
                .andExpect(jsonPath("$.data.list[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$.traceId", not(blankOrNullString())));
    }

    @Test
    void resourcesEndpointReturnsFullRegistry() throws Exception {
        String token = loginAndGetAccessToken();

        mockMvc.perform(get("/api/v1/engine/resources")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data", hasSize(14)))
                .andExpect(jsonPath("$.data[?(@.resource=='users')]").exists())
                .andExpect(jsonPath("$.data[?(@.resource=='roles')]").exists())
                .andExpect(jsonPath("$.data[?(@.resource=='permissions')]").exists())
                .andExpect(jsonPath("$.data[?(@.resource=='menus')]").exists())
                .andExpect(jsonPath("$.data[?(@.resource=='dictTypes')]").exists())
                .andExpect(jsonPath("$.data[?(@.resource=='dictItems')]").exists())
                .andExpect(jsonPath("$.data[?(@.resource=='dataScopes')]").exists())
                .andExpect(jsonPath("$.data[?(@.resource=='systemClients')]").exists())
                .andExpect(jsonPath("$.data[?(@.resource=='auditLogs')]").exists())
                .andExpect(jsonPath("$.data[?(@.resource=='asyncTasks')]").exists());
    }

    @Test
    void queryEndpointSupportsSystemResources() throws Exception {
        String token = loginAndGetAccessToken();

        mockMvc.perform(post("/api/v1/engine/resources/roles/query")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "page": 1,
                                  "pageSize": 10,
                                  "filters": []
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.list[0].roleCode").value("ADMIN"));

        mockMvc.perform(post("/api/v1/engine/resources/dictTypes/query")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "page": 1,
                                  "pageSize": 10,
                                  "filters": []
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.list[0].dictCode").value("TASK_STATUS"));

        mockMvc.perform(post("/api/v1/engine/resources/permissions/query")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "page": 1,
                                  "pageSize": 10,
                                  "filters": []
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].permissionCode").value("system:admin"));

        mockMvc.perform(post("/api/v1/engine/resources/menus/query")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "page": 1,
                                  "pageSize": 10,
                                  "filters": []
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].menuCode").value("system.root"));

        mockMvc.perform(post("/api/v1/engine/resources/dataScopes/query")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "page": 1,
                                  "pageSize": 10,
                                  "filters": []
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].policyCode").value("task.all"));

        mockMvc.perform(post("/api/v1/engine/resources/systemClients/query")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "page": 1,
                                  "pageSize": 10,
                                  "filters": []
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].clientCode").value("system-agent"));

        mockMvc.perform(post("/api/v1/engine/resources/auditLogs/query")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "page": 1,
                                  "pageSize": 10,
                                  "filters": [
                                    { "field": "traceId", "op": "eq", "value": "seed-trace-1" }
                                  ]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].traceId").value("seed-trace-1"));

        mockMvc.perform(post("/api/v1/engine/resources/asyncTasks/query")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "page": 1,
                                  "pageSize": 10,
                                  "filters": [
                                    { "field": "status", "op": "eq", "value": "FAILED" }
                                  ]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].status").value("FAILED"));
    }

    @Test
    void queryEndpointSupportsFiltersAndSortAcrossResources() throws Exception {
        String token = loginAndGetAccessToken();

        mockMvc.perform(post("/api/v1/engine/resources/roles/query")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "page": 1,
                                  "pageSize": 10,
                                  "sort": [
                                    { "field": "id", "order": "desc" }
                                  ],
                                  "filters": [
                                    { "field": "status", "op": "eq", "value": "ACTIVE" }
                                  ]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.list").isArray())
                .andExpect(jsonPath("$.data.list[0].status").value("ACTIVE"));

        mockMvc.perform(post("/api/v1/engine/resources/dictTypes/query")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "page": 1,
                                  "pageSize": 10,
                                  "sort": [
                                    { "field": "id", "order": "desc" }
                                  ],
                                  "filters": [
                                    { "field": "status", "op": "eq", "value": "ACTIVE" }
                                  ]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.list").isArray())
                .andExpect(jsonPath("$.data.list[0].status").value("ACTIVE"));

        mockMvc.perform(post("/api/v1/engine/resources/auditLogs/query")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "page": 1,
                                  "pageSize": 10,
                                  "sort": [
                                    { "field": "occurredAt", "order": "desc" }
                                  ],
                                  "filters": [
                                    { "field": "entityType", "op": "eq", "value": "USER" },
                                    { "field": "occurredAt", "op": "between", "value": ["2025-01-01T00:00:00Z", "2027-01-01T00:00:00Z"] }
                                  ]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.list").isArray())
                .andExpect(jsonPath("$.data.list[0].entityType").value("USER"));
    }

    @Test
    void actionEndpointSupportsKnownAction() throws Exception {
        String token = loginAndGetAccessToken();

        mockMvc.perform(post("/api/v1/engine/resources/users/1/actions/enable")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"));

        mockMvc.perform(post("/api/v1/engine/resources/users/1/actions/disable")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"));

        mockMvc.perform(post("/api/v1/engine/resources/dictItems/8101/actions/disable")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"));

        mockMvc.perform(post("/api/v1/engine/resources/dictItems/8101/actions/delete")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"));

        mockMvc.perform(post("/api/v1/engine/resources/dictTypes/2/actions/delete")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"));
    }

    @Test
    void batchActionEndpointIsRegistered() throws Exception {
        String token = loginAndGetAccessToken();

        mockMvc.perform(post("/api/v1/engine/resources/users/actions/delete/batch")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "ids": [1] }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("ENG_001"));

        mockMvc.perform(post("/api/v1/engine/resources/taskItems/actions/delete/batch")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "ids": [999999999] }
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ASGN_002"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Task item not found")));
    }

    @Test
    void dictTypeDetailEndpointUsesApiEnvelope() throws Exception {
        String token = loginAndGetAccessToken();

        mockMvc.perform(get("/api/v1/admin/dict-types/1")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.id").value("1"));
    }

    @Test
    void dictItemQueryAndDetailUseApiEnvelope() throws Exception {
        String token = loginAndGetAccessToken();

        mockMvc.perform(post("/api/v1/engine/resources/dictItems/query")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "page": 1,
                                  "pageSize": 10,
                                  "filters": [
                                    { "field": "dictTypeId", "op": "eq", "value": 1 }
                                  ]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.list[0].itemCode").value("PENDING"));

        mockMvc.perform(get("/api/v1/admin/dict-items/1")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.itemCode").value("PENDING"));
    }

    @Test
    void dictItemQueryRequiresDictTypeIdFilter() throws Exception {
        String token = loginAndGetAccessToken();

        mockMvc.perform(post("/api/v1/engine/resources/dictItems/query")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "page": 1,
                                  "pageSize": 10,
                                  "filters": []
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("ENG_003"));
    }

    @Test
    void invalidResourceAndActionReturnStableErrors() throws Exception {
        String token = loginAndGetAccessToken();

        mockMvc.perform(post("/api/v1/engine/resources/not-found/query")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "page": 1,
                                  "pageSize": 10,
                                  "filters": []
                                }
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RES_001"));

        mockMvc.perform(post("/api/v1/engine/resources/users/1/actions/not-supported")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("ENG_002"));
    }

    @Test
    void dictDeleteEndpointsUseApiEnvelope() throws Exception {
        String token = loginAndGetAccessToken();

        mockMvc.perform(delete("/api/v1/admin/dict-items/2")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"));

        mockMvc.perform(delete("/api/v1/admin/dict-types/2")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"));
    }

    private String loginAndGetAccessToken() throws Exception {
        MvcResult login = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"admin123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken", not(blankOrNullString())))
                .andReturn();
        String body = login.getResponse().getContentAsString();
        return body.replaceAll(".*\"accessToken\":\"([^\"]+)\".*", "$1");
    }
}
