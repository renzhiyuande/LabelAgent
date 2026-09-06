package com.labelhub.infra.business.review.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.business.BusinessDtos.LlmCatalogModelOption;
import com.labelhub.core.business.BusinessDtos.LlmCatalogProviderOption;
import com.labelhub.core.business.BusinessDtos.TemplateReviewDimensionSummary;
import com.labelhub.core.business.BusinessDtos.TemplateReviewPromptAssistCommand;
import com.labelhub.core.business.BusinessDtos.TemplateReviewPromptAssistResult;
import com.labelhub.core.business.BusinessDtos.TemplateVersionDetailFull;
import com.labelhub.core.business.BusinessDtos.TemplateVersionFieldSummary;
import com.labelhub.core.business.LlmProviderService;
import com.labelhub.core.business.TaskService;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.business.llm.agent.AgentLlmChatClient;
import com.labelhub.infra.business.llm.agent.AgentLlmCredentialResolver;
import com.labelhub.infra.business.review.support.AiReviewMemoryRetriever;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class DbReviewPromptAssistServiceTest {
    @Test
    void generateSuggestion_returnsInitialDraftSuggestion() {
        TaskService taskService = mock(TaskService.class);
        LlmProviderService llmProviderService = mock(LlmProviderService.class);
        AgentLlmCredentialResolver credentialResolver = mock(AgentLlmCredentialResolver.class);
        AgentLlmChatClient chatClient = mock(AgentLlmChatClient.class);
        AiReviewMemoryRetriever memoryRetriever = mock(AiReviewMemoryRetriever.class);

        TemplateVersionDetailFull detail = buildTemplateDetail();
        when(taskService.getTemplateVersionDetail(1001L)).thenReturn(detail);
        when(llmProviderService.listCatalog("REVIEW")).thenReturn(List.of(
                new LlmCatalogProviderOption(
                        1L,
                        "deepseek",
                        "DeepSeek",
                        "ACTIVE",
                        List.of(new LlmCatalogModelOption(11L, "deepseek-v4-flash", "DeepSeek V4 Flash", "chat", "ACTIVE")))));
        when(credentialResolver.resolve("deepseek"))
                .thenReturn(java.util.Optional.of(new AgentLlmCredentialResolver.LlmCredentials(
                        "https://api.deepseek.com",
                        "secret")));
        when(chatClient.chat(
                eq("https://api.deepseek.com"),
                eq("secret"),
                eq("deepseek-v4-flash"),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString(),
                anyMap()))
                .thenReturn("""
                        {
                          "suggestedPromptTemplate": "新提示词 {{original_item_data}} {{user_submission_data}}",
                          "summary": "补强了判定边界",
                          "focusPoints": ["强调人工兜底", "明确打分标准"]
                        }
                        """);

        DbReviewPromptAssistService service = new DbReviewPromptAssistService(
                taskService,
                llmProviderService,
                credentialResolver,
                chatClient,
                memoryRetriever,
                new ObjectMapper());

        TemplateReviewPromptAssistResult result = service.generateSuggestion(new TemplateReviewPromptAssistCommand(
                1001L,
                "INITIAL_DRAFT",
                "deepseek",
                "deepseek-v4-flash",
                "原始模板 {{original_item_data}} {{user_submission_data}}",
                detail.reviewDimensions()));

        assertEquals("INITIAL_DRAFT", result.mode());
        assertEquals("新提示词 {{original_item_data}} {{user_submission_data}}", result.suggestedPromptTemplate());
        assertEquals("补强了判定边界", result.summary());
        assertEquals(List.of("强调人工兜底", "明确打分标准"), result.focusPoints());
        assertEquals(0, result.historyCaseCount());
        assertFalse(result.usedHistory());
        verify(chatClient).chat(
                eq("https://api.deepseek.com"),
                eq("secret"),
                eq("deepseek-v4-flash"),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.contains("字段概览"),
                anyMap());
    }

    @Test
    void generateSuggestion_rejectsHistoryOptimizationWithoutCases() {
        TaskService taskService = mock(TaskService.class);
        LlmProviderService llmProviderService = mock(LlmProviderService.class);
        AgentLlmCredentialResolver credentialResolver = mock(AgentLlmCredentialResolver.class);
        AgentLlmChatClient chatClient = mock(AgentLlmChatClient.class);
        AiReviewMemoryRetriever memoryRetriever = mock(AiReviewMemoryRetriever.class);

        TemplateVersionDetailFull detail = buildTemplateDetail();
        when(taskService.getTemplateVersionDetail(1001L)).thenReturn(detail);
        when(llmProviderService.listCatalog("REVIEW")).thenReturn(List.of(
                new LlmCatalogProviderOption(
                        1L,
                        "deepseek",
                        "DeepSeek",
                        "ACTIVE",
                        List.of(new LlmCatalogModelOption(11L, "deepseek-v4-flash", "DeepSeek V4 Flash", "chat", "ACTIVE")))));
        when(credentialResolver.resolve("deepseek"))
                .thenReturn(java.util.Optional.of(new AgentLlmCredentialResolver.LlmCredentials(
                        "https://api.deepseek.com",
                        "secret")));
        when(memoryRetriever.loadRecentCasesForPromptOptimization(1001L)).thenReturn(List.of());

        DbReviewPromptAssistService service = new DbReviewPromptAssistService(
                taskService,
                llmProviderService,
                credentialResolver,
                chatClient,
                memoryRetriever,
                new ObjectMapper());

        BusinessException error = assertThrows(BusinessException.class, () -> service.generateSuggestion(
                new TemplateReviewPromptAssistCommand(
                        1001L,
                        "OPTIMIZE_FROM_HISTORY",
                        "deepseek",
                        "deepseek-v4-flash",
                        "原始模板 {{original_item_data}} {{user_submission_data}}",
                        detail.reviewDimensions())));

        assertEquals(ErrorCode.RVW_PROMPT_NO_HISTORY_CASES, error.errorCode());
        assertTrue(error.getMessage().contains("reviewed submissions"));
    }

    private static TemplateVersionDetailFull buildTemplateDetail() {
        TemplateReviewDimensionSummary dimension = new TemplateReviewDimensionSummary(
                1L,
                1001L,
                "ACCURACY",
                "准确性",
                null,
                BigDecimal.valueOf(50),
                BigDecimal.ZERO,
                BigDecimal.valueOf(100),
                BigDecimal.valueOf(85),
                BigDecimal.valueOf(40),
                "重点检查标注结果是否与题面一致",
                null,
                "HIGH",
                1,
                1);
        TemplateVersionFieldSummary field = new TemplateVersionFieldSummary(
                1L,
                1001L,
                "result.answer",
                "答案",
                "textarea",
                1,
                Map.of(),
                1);
        return new TemplateVersionDetailFull(
                1001L,
                2001L,
                3,
                "偏好对比模板",
                "DRAFT",
                1,
                Map.of(),
                "checksum",
                "原始模板 {{original_item_data}} {{user_submission_data}}",
                "deepseek",
                "deepseek-v4-flash",
                List.of(),
                List.of(field),
                List.of(dimension),
                Instant.now(),
                Instant.now());
    }
}
