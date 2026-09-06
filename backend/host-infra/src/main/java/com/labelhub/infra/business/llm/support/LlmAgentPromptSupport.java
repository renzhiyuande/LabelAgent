package com.labelhub.infra.business.llm.support;

import com.labelhub.core.business.BusinessDtos.LlmApplyMapping;
import java.util.List;
import org.springframework.util.StringUtils;

public final class LlmAgentPromptSupport {

    private LlmAgentPromptSupport() {
    }

    public static boolean isAgentMode(String mode, List<LlmApplyMapping> applyMappings) {
        if ("AGENT".equalsIgnoreCase(trimToNull(mode))) {
            return true;
        }
        return applyMappings != null && !applyMappings.isEmpty();
    }

    public static String augmentSystemPromptForAgent(String systemPrompt, List<LlmApplyMapping> applyMappings) {
        return LlmAgentAssemblySupport.augmentSystemPromptForAgent(systemPrompt, applyMappings);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
