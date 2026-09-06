package com.labelhub.app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.infra.business.export.handler.ExportJobTaskHandler;
import com.labelhub.infra.business.storage.service.MinioFileStorageService;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import com.labelhub.infra.persistence.mapper.AsyncTaskMapper;
import com.redis.testcontainers.RedisContainer;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
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
 * P2 白盒：导出任务全链路（WB-XSYS-005）。
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@Testcontainers(disabledWithoutDocker = true)
@DisplayName("P2 白盒 — 导出全链路 (DB/Redis)")
class ExportWhiteBoxIT {

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

    @MockBean
    private MinioFileStorageService fileStorageService;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ExportJobTaskHandler exportJobTaskHandler;

    @Autowired
    private AsyncTaskMapper asyncTaskMapper;

    private final Map<Long, byte[]> storedFiles = new ConcurrentHashMap<>();
    private final AtomicLong nextFileId = new AtomicLong(99000L);

    @BeforeEach
    void seedAndStubStorage() {
        ResourceDatabasePopulator populator = new ResourceDatabasePopulator();
        populator.addScript(new ClassPathResource("p0_whitebox_minimal_seed.sql"));
        populator.execute(jdbcTemplate.getDataSource());
        jdbcTemplate.update("DELETE FROM export_jobs WHERE task_id = 15001");
        jdbcTemplate.update("DELETE FROM async_tasks WHERE biz_type = 'EXPORT_JOB'");

        when(fileStorageService.upload(any(), anyString(), anyString(), anyString(), anyLong()))
                .thenAnswer(invocation -> {
                    long fileId = nextFileId.incrementAndGet();
                    storedFiles.put(fileId, invocation.getArgument(0));
                    return fileId;
                });
        when(fileStorageService.download(anyLong()))
                .thenAnswer(invocation -> storedFiles.get(invocation.getArgument(0)));
    }

    @Test
    @DisplayName("WB-XSYS-005: 创建导出 → Handler 生成文件 → download 可访问")
    void wbXsys005_createExportHandlerAndDownload() throws Exception {
        String adminToken = loginAndGetToken("admin", "admin123");

        MvcResult createResult = mockMvc.perform(post("/api/v1/owner/exports")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "jobName": "P2 Whitebox Export",
                                  "exportFormat": "JSON",
                                  "taskId": 15001,
                                  "filterConditionsJson": {"exportScope": "ALL"},
                                  "fieldMappings": ["lifecycle.status", "labeler.id"]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andReturn();

        long exportJobId = objectMapper
                .readTree(createResult.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asLong();

        Integer asyncCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM async_tasks WHERE biz_type = 'EXPORT_JOB' AND biz_id = ?",
                Integer.class,
                exportJobId);
        assertThat(asyncCount).isEqualTo(1);

        AsyncTaskEntity asyncTask = asyncTaskMapper.selectList(null).stream()
                .filter(task -> "EXPORT_JOB".equals(task.getBizType()) && exportJobId == task.getBizId())
                .findFirst()
                .orElseThrow();
        exportJobTaskHandler.handle(asyncTask);

        String jobStatus = jdbcTemplate.queryForObject(
                "SELECT status FROM export_jobs WHERE id = ?", String.class, exportJobId);
        assertThat(jobStatus).isEqualTo("SUCCESS");

        MvcResult downloadResult = mockMvc.perform(get("/api/v1/owner/exports/" + exportJobId + "/download")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();

        byte[] body = downloadResult.getResponse().getContentAsByteArray();
        assertThat(body.length).isGreaterThan(2);
        JsonNode exported = objectMapper.readTree(body);
        assertThat(exported.isArray()).isTrue();
        assertThat(exported.size()).isGreaterThanOrEqualTo(1);
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
