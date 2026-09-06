package com.labelhub.infra.business.llm.service;

import com.labelhub.core.business.BusinessDtos.LlmApplyMapping;
import com.labelhub.core.business.BusinessDtos.LlmSuggestCommand;
import com.labelhub.core.business.BusinessDtos.LlmSuggestPreviewCommand;
import com.labelhub.core.business.BusinessDtos.LlmSuggestPreviewResult;
import com.labelhub.core.business.BusinessDtos.LlmSuggestResult;
import com.labelhub.core.business.LlmSuggestService;
import com.labelhub.infra.business.llm.support.LlmSuggestPromptSupport;
import com.labelhub.infra.business.llm.support.LlmSuggestSchemaSupport.LlmFieldConfig;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "memory")
public class MemoryLlmSuggestService implements LlmSuggestService {
    @Override
    public LlmSuggestResult suggest(LlmSuggestCommand command) {
        if (command == null || !StringUtils.hasText(command.fieldCode())) {
            throw new IllegalArgumentException("fieldCode is required");
        }
        LlmFieldConfig fieldConfig = new LlmFieldConfig(null, null, "chat", null, null, null, null, List.of(), List.of(), List.of(), null);
        var assembled = LlmSuggestPromptSupport.assemble(
                new com.fasterxml.jackson.databind.ObjectMapper(),
                "{}",
                fieldConfig,
                Map.of(),
                Map.of());
        boolean agentMode = assembled.agentMode();
        String text;
        Map<String, Object> parsedOutput = null;
        if (agentMode) {
            parsedOutput = buildStubParsedOutput(assembled.applyMappings());
            try {
                text = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(parsedOutput);
            } catch (Exception ex) {
                text = parsedOutput.toString();
            }
        } else {
            text = "[memory] LLM 建议：请结合题面字段「"
                    + assembled.userPrompt().substring(0, Math.min(48, assembled.userPrompt().length()))
                    + "…」完成标注。";
        }
        return new LlmSuggestResult(text, parsedOutput, null, assembled.applyMappings());
    }

    @Override
    public LlmSuggestPreviewResult preview(LlmSuggestPreviewCommand command) {
        LlmFieldConfig fieldConfig = new LlmFieldConfig(null, null, "chat", null, null, null, null, List.of(), List.of(), List.of(), null);
        var assembled = LlmSuggestPromptSupport.assemble(
                new com.fasterxml.jackson.databind.ObjectMapper(),
                "{}",
                fieldConfig,
                Map.of(),
                Map.of());
        return new LlmSuggestPreviewResult(
                assembled.systemPrompt(),
                assembled.userPrompt(),
                assembled.agentMode() ? "agent" : "chat",
                assembled.applyMappings(),
                assembled.contextFieldCount(),
                assembled.outputJsonSchema().isEmpty() ? null : assembled.outputJsonSchema());
    }

    private static Map<String, Object> buildStubParsedOutput(List<LlmApplyMapping> applyMappings) {
        Map<String, Object> output = new LinkedHashMap<>();
        if (applyMappings != null) {
            for (LlmApplyMapping mapping : applyMappings) {
                if (mapping == null || !StringUtils.hasText(mapping.sourceKey())) {
                    continue;
                }
                String key = mapping.sourceKey().trim();
                output.put(key, "[memory-stub] " + key);
            }
        }
        if (output.isEmpty()) {
            output.put("suggestion", "[memory-stub] agent 结构化输出示例");
        }
        return output;
    }
}
