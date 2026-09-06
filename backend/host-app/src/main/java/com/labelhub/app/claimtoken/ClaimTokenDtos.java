package com.labelhub.app.claimtoken;

import jakarta.validation.constraints.NotBlank;
import java.util.Map;

public final class ClaimTokenDtos {
    private ClaimTokenDtos() {
    }

    public record ClaimTokenIssueRequest(
            @NotBlank String scene,
            Map<String, Object> payload) {
    }
}
