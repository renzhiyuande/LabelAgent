package com.labelhub.infra.security;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.labelhub.core.error.BusinessException;
import org.junit.jupiter.api.Test;

class LlmOutboundUrlValidatorTest {

    @Test
    void allowsPublicHttpsEndpoint() {
        LlmOutboundUrlValidator validator = new LlmOutboundUrlValidator(false);
        String safe = validator.requireSafeBaseUrl("https://api.openai.com/v1");
        assertEquals("https://api.openai.com/v1", safe);
    }

    @Test
    void blocksPrivateIpWithoutDevFlag() {
        LlmOutboundUrlValidator validator = new LlmOutboundUrlValidator(false);
        assertThrows(BusinessException.class, () -> validator.requireSafeBaseUrl("https://192.168.1.10/v1"));
    }

    @Test
    void blocksMetadataHost() {
        LlmOutboundUrlValidator validator = new LlmOutboundUrlValidator(false);
        assertThrows(BusinessException.class, () -> validator.requireSafeBaseUrl("http://169.254.169.254"));
    }

    @Test
    void allowsLocalhostInDevMode() {
        LlmOutboundUrlValidator validator = new LlmOutboundUrlValidator(true);
        assertDoesNotThrow(() -> validator.requireSafeBaseUrl("http://127.0.0.1:11434/v1"));
    }
}
