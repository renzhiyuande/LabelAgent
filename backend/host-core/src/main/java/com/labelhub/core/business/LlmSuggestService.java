package com.labelhub.core.business;

import com.labelhub.core.business.BusinessDtos.LlmSuggestCommand;
import com.labelhub.core.business.BusinessDtos.LlmSuggestPreviewCommand;
import com.labelhub.core.business.BusinessDtos.LlmSuggestPreviewResult;
import com.labelhub.core.business.BusinessDtos.LlmSuggestResult;

public interface LlmSuggestService {
    LlmSuggestResult suggest(LlmSuggestCommand command);

    LlmSuggestPreviewResult preview(LlmSuggestPreviewCommand command);
}
