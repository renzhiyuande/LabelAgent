package com.labelhub.core.business;

import com.labelhub.core.business.BusinessDtos.TemplateReviewPromptAssistCommand;
import com.labelhub.core.business.BusinessDtos.TemplateReviewPromptAssistResult;

public interface ReviewPromptAssistService {
    TemplateReviewPromptAssistResult generateSuggestion(TemplateReviewPromptAssistCommand command);
}
