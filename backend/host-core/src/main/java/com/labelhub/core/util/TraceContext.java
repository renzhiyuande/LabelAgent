package com.labelhub.core.util;

import java.util.UUID;
import org.slf4j.MDC;

public final class TraceContext {
    public static final String TRACE_ID = "traceId";
    public static final String REQUEST_ID = "requestId";
    public static final String USER_ID = "userId";
    public static final String ROLE = "role";

    private TraceContext() {
    }

    public static String currentTraceId() {
        String traceId = MDC.get(TRACE_ID);
        if (traceId == null || traceId.isBlank()) {
            traceId = newTraceId();
            MDC.put(TRACE_ID, traceId);
        }
        return traceId;
    }

    public static String newTraceId() {
        return UUID.randomUUID().toString().replace("-", "");
    }
}

