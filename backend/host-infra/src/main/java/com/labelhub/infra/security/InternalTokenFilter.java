package com.labelhub.infra.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.system.InternalClientService;
import com.labelhub.core.util.TraceContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class InternalTokenFilter extends OncePerRequestFilter {
    private final InternalClientService internalClientService;
    private final ObjectMapper objectMapper;

    public InternalTokenFilter(InternalClientService internalClientService, ObjectMapper objectMapper) {
        this.internalClientService = internalClientService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/internal/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String token = request.getHeader("X-Internal-Token");
        if (!internalClientService.validateInternalToken(token)) {
            writeUnauthorized(response);
            return;
        }
        // IP 白名单二次校验（db 模式下使用 SystemClientEntity.ipWhitelistJson）
        String remoteAddr = extractClientIp(request);
        if (!internalClientService.validateIpAddress(remoteAddr)) {
            writeUnauthorized(response);
            return;
        }
        chain.doFilter(request, response);
    }

    private void writeUnauthorized(HttpServletResponse response) throws IOException {
        response.setStatus(ErrorCode.INTERNAL_UNAUTHORIZED.status());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), ApiResponse.failure(
                ErrorCode.INTERNAL_UNAUTHORIZED.errCode(),
                ErrorCode.INTERNAL_UNAUTHORIZED.defaultMessage(),
                TraceContext.currentTraceId()));
    }

    /** 从请求中提取客户端真实 IP（优先 X-Forwarded-For，其次 RemoteAddr）。 */
    private static String extractClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isBlank() && !"unknown".equalsIgnoreCase(ip)) {
            return ip.split(",")[0].trim();
        }
        ip = request.getHeader("X-Real-IP");
        if (ip != null && !ip.isBlank() && !"unknown".equalsIgnoreCase(ip)) {
            return ip.trim();
        }
        return request.getRemoteAddr();
    }
}
