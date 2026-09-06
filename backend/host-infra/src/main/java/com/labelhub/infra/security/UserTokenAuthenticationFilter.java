package com.labelhub.infra.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.service.AuthService;
import com.labelhub.core.util.TraceContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import org.slf4j.MDC;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class UserTokenAuthenticationFilter extends OncePerRequestFilter {
    private final AuthService authService;
    private final ObjectMapper objectMapper;

    public UserTokenAuthenticationFilter(AuthService authService, ObjectMapper objectMapper) {
        this.authService = authService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return uri.startsWith("/internal/")
                || uri.equals("/api/v1/auth/login")
                || uri.equals("/api/v1/auth/refresh");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                AuthenticatedUser user = authService.requireUser(token);
                ArrayList<SimpleGrantedAuthority> authorities = new ArrayList<>();
                user.roles().forEach(role -> authorities.add(new SimpleGrantedAuthority("ROLE_" + role)));
                user.permissions().forEach(permission -> authorities.add(new SimpleGrantedAuthority(permission)));
                SecurityContextHolder.getContext()
                        .setAuthentication(new UserAuthenticationToken(user, token, authorities));
                MDC.put(TraceContext.USER_ID, String.valueOf(user.userId()));
                MDC.put(TraceContext.ROLE, String.join(",", user.roles()));
            } catch (BusinessException ex) {
                if (ex.errorCode() == ErrorCode.AUTH_INVALID_TOKEN) {
                    writeAuthFailure(response, ex);
                    return;
                }
                throw ex;
            }
        }
        chain.doFilter(request, response);
    }

    private void writeAuthFailure(HttpServletResponse response, BusinessException ex) throws IOException {
        ErrorCode code = ex.errorCode();
        response.setStatus(code.status());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(
                response.getWriter(),
                ApiResponse.failure(code.errCode(), ex.getMessage(), TraceContext.currentTraceId()));
    }
}
