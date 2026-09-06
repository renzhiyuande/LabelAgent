package com.labelhub.infra.web;

import com.labelhub.core.util.TraceContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.web.filter.OncePerRequestFilter;

public class TraceLoggingFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(TraceLoggingFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long started = System.currentTimeMillis();
        String traceId = request.getHeader("X-Trace-Id");
        if (traceId == null || traceId.isBlank()) {
            traceId = TraceContext.newTraceId();
        }
        MDC.put(TraceContext.TRACE_ID, traceId);
        MDC.put(TraceContext.REQUEST_ID, valueOr(request.getHeader("X-Request-Id"), traceId));
        try {
            response.setHeader("X-Trace-Id", traceId);
            chain.doFilter(request, response);
        } finally {
            long costMs = System.currentTimeMillis() - started;
            int status = response.getStatus();
            // 按响应码动态选择日志级别：200→debug, 4xx→info, 5xx→warn
            if (status >= 500) {
                log.warn("request method={} path={} status={} costMs={} traceId={} requestId={} userId={} role={}",
                        request.getMethod(), request.getRequestURI(), status, costMs,
                        MDC.get(TraceContext.TRACE_ID), MDC.get(TraceContext.REQUEST_ID),
                        valueOr(MDC.get(TraceContext.USER_ID), "anonymous"),
                        valueOr(MDC.get(TraceContext.ROLE), "anonymous"));
            } else if (status >= 400) {
                log.info("request method={} path={} status={} costMs={} traceId={} requestId={} userId={} role={}",
                        request.getMethod(), request.getRequestURI(), status, costMs,
                        MDC.get(TraceContext.TRACE_ID), MDC.get(TraceContext.REQUEST_ID),
                        valueOr(MDC.get(TraceContext.USER_ID), "anonymous"),
                        valueOr(MDC.get(TraceContext.ROLE), "anonymous"));
            } else {
                log.debug("request method={} path={} status={} costMs={} traceId={} requestId={} userId={} role={}",
                        request.getMethod(), request.getRequestURI(), status, costMs,
                        MDC.get(TraceContext.TRACE_ID), MDC.get(TraceContext.REQUEST_ID),
                        valueOr(MDC.get(TraceContext.USER_ID), "anonymous"),
                        valueOr(MDC.get(TraceContext.ROLE), "anonymous"));
            }
            MDC.clear();
        }
    }

    private String valueOr(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}

