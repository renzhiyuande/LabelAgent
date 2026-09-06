package com.labelhub.core.system;

public interface InternalClientService {
    boolean validateInternalToken(String rawToken);

    /**
     * 校验请求来源 IP 是否在白名单内。
     * <p>与 {@link #validateInternalToken} 配合实现双层鉴权。
     * 默认实现返回 {@code true}（不校验 IP），
     * {@code db} 模式下的 {@code DbInternalClientService} 会根据客户端配置的 IP 白名单校验。</p>
     */
    default boolean validateIpAddress(String remoteAddr) {
        return true;
    }
}
