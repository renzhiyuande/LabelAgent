package com.labelhub.infra.system;

import com.labelhub.core.system.InternalClientService;
import com.labelhub.core.util.DigestUtil;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "memory")
public class StaticInternalClientService implements InternalClientService {
    private final String internalToken;

    public StaticInternalClientService(@Value("${labelhub.internal-token:}") String internalToken) {
        this.internalToken = internalToken;
    }

    @Override
    public boolean validateInternalToken(String rawToken) {
        if (internalToken == null || internalToken.isBlank()) {
            return false;
        }
        if (rawToken == null || rawToken.isBlank()) {
            return false;
        }
        // 定长摘要比较，消除长度侧信道
        byte[] expectedHash = sha256(internalToken);
        byte[] providedHash = sha256(rawToken);
        return MessageDigest.isEqual(expectedHash, providedHash);
    }

    private byte[] sha256(String input) {
        return DigestUtil.sha256(input);
    }
}
