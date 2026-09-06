package com.labelhub.infra.claimtoken;

import com.labelhub.core.claimtoken.ClaimTokenRedemptionHandler;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class ClaimTokenHandlerRegistry {
    private final Map<String, ClaimTokenRedemptionHandler> handlersByScene;

    public ClaimTokenHandlerRegistry(List<ClaimTokenRedemptionHandler> handlers) {
        this.handlersByScene = handlers.stream()
                .collect(Collectors.toMap(ClaimTokenRedemptionHandler::scene, Function.identity(), (a, b) -> {
                    throw new IllegalStateException("Duplicate claim token handler for scene: " + a.scene());
                }));
    }

    public ClaimTokenRedemptionHandler requireHandler(String scene) {
        ClaimTokenRedemptionHandler handler = handlersByScene.get(scene);
        if (handler == null) {
            throw new BusinessException(ErrorCode.CLAIM_TOKEN_SCENE_UNSUPPORTED, "Unsupported scene: " + scene);
        }
        return handler;
    }

    public boolean supports(String scene) {
        return handlersByScene.containsKey(scene);
    }
}
