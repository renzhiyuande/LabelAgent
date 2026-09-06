package com.labelhub.infra.business.review.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.LlmCatalogModelOption;
import com.labelhub.core.business.BusinessDtos.LlmCatalogProviderOption;
import com.labelhub.core.business.BusinessDtos.TemplateReviewDimensionSummary;
import com.labelhub.core.business.BusinessDtos.TemplateReviewPromptAssistCommand;
import com.labelhub.core.business.BusinessDtos.TemplateReviewPromptAssistResult;
import com.labelhub.core.business.BusinessDtos.TemplateVersionDetailFull;
import com.labelhub.core.business.BusinessDtos.TemplateVersionFieldSummary;
import com.labelhub.core.business.LlmProviderService;
import com.labelhub.core.business.ReviewPromptAssistService;
import com.labelhub.core.business.TaskService;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.business.llm.agent.AgentLlmChatClient;
import com.labelhub.infra.business.llm.agent.AgentLlmCredentialResolver;
import com.labelhub.infra.business.llm.agent.AgentLlmCredentialResolver.LlmCredentials;
import com.labelhub.infra.business.llm.support.LlmStructuredResponseParser;
import com.labelhub.infra.business.review.support.AiReviewMemoryRetriever;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbReviewPromptAssistService implements ReviewPromptAssistService {
    private static final String MODE_INITIAL_DRAFT = "INITIAL_DRAFT";
    private static final String MODE_OPTIMIZE_FROM_HISTORY = "OPTIMIZE_FROM_HISTORY";

    private static final Map<String, Object> OUTPUT_JSON_SCHEMA = createOutputSchema();

    private final TaskService taskService;
    private final LlmProviderService llmProviderService;
    private final AgentLlmCredentialResolver credentialResolver;
    private final AgentLlmChatClient chatClient;
    private final AiReviewMemoryRetriever aiReviewMemoryRetriever;
    private final ObjectMapper objectMapper;

    public DbReviewPromptAssistService(
            TaskService taskService,
            LlmProviderService llmProviderService,
            AgentLlmCredentialResolver credentialResolver,
            AgentLlmChatClient chatClient,
            AiReviewMemoryRetriever aiReviewMemoryRetriever,
            ObjectMapper objectMapper) {
        this.taskService = taskService;
        this.llmProviderService = llmProviderService;
        this.credentialResolver = credentialResolver;
        this.chatClient = chatClient;
        this.aiReviewMemoryRetriever = aiReviewMemoryRetriever;
        this.objectMapper = objectMapper;
    }

    @Override
    @RequireAnyPermission({
            "system:admin",
            "business:template:read",
            "business:template:manage",
            "business:task:template_save"
    })
    public TemplateReviewPromptAssistResult generateSuggestion(TemplateReviewPromptAssistCommand command) {
        if (command == null) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "command is required");
        }

        TemplateVersionDetailFull detail = taskService.getTemplateVersionDetail(command.templateVersionId());
        String mode = normalizeMode(command.mode());
        String providerCode = firstNonBlank(command.providerPlatformKey(), detail.providerPlatformKey());
        String modelCode = firstNonBlank(command.modelId(), detail.modelId());
        if (!StringUtils.hasText(providerCode) || !StringUtils.hasText(modelCode)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "请先选择 AI 预审 Provider 与 Model");
        }

        List<TemplateReviewDimensionSummary> dimensions = command.dimensions() != null && !command.dimensions().isEmpty()
                ? command.dimensions()
                : detail.reviewDimensions();
        if (dimensions == null || dimensions.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "请先至少配置一个审核维度");
        }

        String currentPromptTemplate = firstNonBlank(command.currentPromptTemplate(), detail.reviewPromptTemplate());
        if (!StringUtils.hasText(currentPromptTemplate)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "当前审核提示词为空，请先生成或输入基础 Prompt");
        }

        requirePublishedRoute(providerCode, modelCode);
        LlmCredentials credentials = credentialResolver.resolve(providerCode)
                .orElseThrow(() -> new BusinessException(
                        ErrorCode.VALIDATION_ERROR,
                        "所选 Provider 未配置可用 API Key，请先在系统管理中完成配置"));

        List<Map<String, Object>> historyCases = List.of();
        if (MODE_OPTIMIZE_FROM_HISTORY.equals(mode)) {
            historyCases = aiReviewMemoryRetriever.loadRecentCasesForPromptOptimization(detail.id());
            if (historyCases.isEmpty()) {
                throw new BusinessException(ErrorCode.RVW_PROMPT_NO_HISTORY_CASES);
            }
        }

        String raw = chatClient.chat(
                credentials.baseUrl(),
                credentials.apiKey(),
                modelCode,
                buildSystemPrompt(mode),
                buildUserPrompt(detail, dimensions, currentPromptTemplate, historyCases, mode),
                OUTPUT_JSON_SCHEMA);
        Map<String, Object> parsed = LlmStructuredResponseParser.tryParseJsonObject(raw, objectMapper);
        String suggestedPrompt = asTrimmedText(parsed.get("suggestedPromptTemplate"));
        if (!StringUtils.hasText(suggestedPrompt)) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "AI 未返回可用的审核提示词建议");
        }
        return new TemplateReviewPromptAssistResult(
                mode,
                suggestedPrompt,
                asTrimmedText(parsed.get("summary")),
                toStringList(parsed.get("focusPoints")),
                historyCases.size(),
                !historyCases.isEmpty());
    }

    private void requirePublishedRoute(String providerCode, String modelCode) {
        List<LlmCatalogProviderOption> providers = llmProviderService.listCatalog("REVIEW");
        boolean matched = providers.stream()
                .filter(provider -> provider.providerCode().equals(providerCode))
                .flatMap(provider -> provider.models().stream())
                .map(LlmCatalogModelOption::modelCode)
                .anyMatch(modelCode::equals);
        if (!matched) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "所选 Provider / Model 不在已发布的审核模型目录中");
        }
    }

    private String buildSystemPrompt(String mode) {
        String modeHint = MODE_OPTIMIZE_FROM_HISTORY.equals(mode)
                ? "你正在基于真实 AI 预审与人工复核差异优化提示词。"
                : "你正在基于模板通用信息生成审核提示词初稿。";
        return """
                你是 LabelHub 的审核提示词设计助手。
                你的任务是输出一个可直接保存为 review_prompt_template 的高质量模板。
                %s

                约束：
                1. 只输出 JSON，不要输出 markdown 或额外解释。
                2. suggestedPromptTemplate 必须是完整可用的提示词模板。
                3. 必须保留并正确使用 {{original_item_data}} 与 {{user_submission_data}}。
                4. 若输入中提供了维度变量插槽，优先保留这些插槽，不要改坏变量语法。
                5. 提示词目标是提升预审可执行性、判定边界清晰度、与人工复核一致性。
                6. 不要编造不存在的业务字段或系统变量。
                """.formatted(modeHint).trim();
    }

    private String buildUserPrompt(
            TemplateVersionDetailFull detail,
            List<TemplateReviewDimensionSummary> dimensions,
            String currentPromptTemplate,
            List<Map<String, Object>> historyCases,
            String mode) {
        StringBuilder builder = new StringBuilder();
        builder.append("任务模式：")
                .append(MODE_OPTIMIZE_FROM_HISTORY.equals(mode) ? "基于历史优化" : "通用初稿")
                .append("\n\n");
        builder.append("模板版本：")
                .append(detail.templateName())
                .append(" / v")
                .append(detail.versionNo() == null ? "-" : detail.versionNo())
                .append(" / 状态 ")
                .append(detail.status())
                .append("\n");
        builder.append("字段概览：\n")
                .append(renderFieldSummaries(detail.fields()))
                .append("\n\n");
        builder.append("审核维度：\n")
                .append(renderDimensions(dimensions))
                .append("\n\n");
        builder.append("当前 Prompt 模板：\n")
                .append(currentPromptTemplate.trim())
                .append("\n\n");
        if (MODE_OPTIMIZE_FROM_HISTORY.equals(mode)) {
            builder.append("历史复核样本（AI 与人工的真实运行数据）：\n")
                    .append(renderHistoryCases(historyCases))
                    .append("\n\n");
            builder.append("优化目标：根据这些真实样本，补强容易误判、边界模糊、需要人工兜底的规则描述。\n\n");
        } else {
            builder.append("生成目标：先给出一个稳健、可直接上线试运行的审核提示词初稿。\n\n");
        }
        builder.append("""
                输出要求：
                1. suggestedPromptTemplate：完整的新提示词模板。
                2. summary：一句话说明本次建议的重点。
                3. focusPoints：1 到 3 条关键改动点。

                请直接产出更适合 LabelHub AI 预审使用的模板。
                """);
        return builder.toString().trim();
    }

    private static String renderFieldSummaries(List<TemplateVersionFieldSummary> fields) {
        if (fields == null || fields.isEmpty()) {
            return "- 无字段摘要";
        }
        return fields.stream()
                .map(field -> "- %s (%s, code=%s, required=%s)".formatted(
                        fallback(field.fieldTitle(), field.fieldCode()),
                        fallback(field.widgetType(), "unknown"),
                        fallback(field.fieldCode(), "-"),
                        field.isRequired() != null && field.isRequired() == 1 ? "是" : "否"))
                .reduce((left, right) -> left + "\n" + right)
                .orElse("- 无字段摘要");
    }

    private static String renderDimensions(List<TemplateReviewDimensionSummary> dimensions) {
        List<String> lines = new ArrayList<>();
        for (TemplateReviewDimensionSummary dimension : dimensions) {
            StringBuilder line = new StringBuilder("- ");
            line.append(fallback(dimension.dimensionName(), dimension.dimensionKey()))
                    .append(" (key=")
                    .append(fallback(dimension.dimensionKey(), "-"))
                    .append(", weight=")
                    .append(formatDecimal(dimension.weight()))
                    .append(", range=")
                    .append(formatDecimal(dimension.scoreMin()))
                    .append("-")
                    .append(formatDecimal(dimension.scoreMax()))
                    .append(")");
            if (StringUtils.hasText(dimension.promptInstruction())) {
                line.append(" 指令: ").append(dimension.promptInstruction().trim());
            }
            if (dimension.passThreshold() != null || dimension.rejectThreshold() != null) {
                line.append(" 阈值: pass>=").append(formatDecimal(dimension.passThreshold()))
                        .append(", reject<=").append(formatDecimal(dimension.rejectThreshold()));
            }
            lines.add(line.toString());
        }
        return String.join("\n", lines);
    }

    private static String renderHistoryCases(List<Map<String, Object>> historyCases) {
        List<String> lines = new ArrayList<>();
        int index = 1;
        for (Map<String, Object> historyCase : historyCases) {
            lines.add("- 样本 %d: aiVerdict=%s, humanDecision=%s, aiTotalScore=%s".formatted(
                    index++,
                    fallback(asTrimmedText(historyCase.get("aiVerdict")), "-"),
                    fallback(asTrimmedText(historyCase.get("humanDecision")), "-"),
                    fallback(asTrimmedText(historyCase.get("aiTotalScore")), "-")));
            String humanComment = asTrimmedText(historyCase.get("humanComment"));
            if (StringUtils.hasText(humanComment)) {
                lines.add("  人工评语: " + humanComment);
            }
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> dimensionScores = historyCase.get("dimensionScores") instanceof List<?>
                    ? (List<Map<String, Object>>) historyCase.get("dimensionScores")
                    : List.of();
            for (Map<String, Object> score : dimensionScores) {
                lines.add("  维度 %s=%s: %s".formatted(
                        fallback(asTrimmedText(score.get("dimensionName")), asTrimmedText(score.get("dimensionKey"))),
                        fallback(asTrimmedText(score.get("score")), "-"),
                        fallback(asTrimmedText(score.get("comment")), "-")));
            }
        }
        return String.join("\n", lines);
    }

    private static String normalizeMode(String raw) {
        String mode = raw == null ? "" : raw.trim().toUpperCase();
        return MODE_OPTIMIZE_FROM_HISTORY.equals(mode) ? MODE_OPTIMIZE_FROM_HISTORY : MODE_INITIAL_DRAFT;
    }

    private static String firstNonBlank(String preferred, String fallback) {
        if (StringUtils.hasText(preferred)) {
            return preferred.trim();
        }
        return StringUtils.hasText(fallback) ? fallback.trim() : "";
    }

    private static String fallback(String preferred, String fallback) {
        return StringUtils.hasText(preferred) ? preferred.trim() : fallback;
    }

    private static String formatDecimal(BigDecimal value) {
        return value == null ? "-" : value.stripTrailingZeros().toPlainString();
    }

    private static String asTrimmedText(Object value) {
        if (value == null) {
            return "";
        }
        String text = String.valueOf(value).trim();
        return "null".equalsIgnoreCase(text) ? "" : text;
    }

    private static List<String> toStringList(Object raw) {
        if (!(raw instanceof List<?> list)) {
            return List.of();
        }
        return list.stream()
                .map(DbReviewPromptAssistService::asTrimmedText)
                .filter(StringUtils::hasText)
                .limit(3)
                .toList();
    }

    private static Map<String, Object> createOutputSchema() {
        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("suggestedPromptTemplate", Map.of("type", "string"));
        properties.put("summary", Map.of("type", "string"));
        properties.put("focusPoints", Map.of(
                "type", "array",
                "items", Map.of("type", "string"),
                "minItems", 1,
                "maxItems", 3));

        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("additionalProperties", false);
        schema.put("properties", properties);
        schema.put("required", List.of("suggestedPromptTemplate", "summary", "focusPoints"));
        return schema;
    }
}
