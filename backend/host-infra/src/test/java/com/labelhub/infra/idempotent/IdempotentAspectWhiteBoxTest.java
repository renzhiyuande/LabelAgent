package com.labelhub.infra.idempotent;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.idempotent.Idempotent;
import jakarta.servlet.http.HttpServletRequest;
import java.util.concurrent.TimeUnit;
import org.aspectj.lang.ProceedingJoinPoint;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("P2 白盒 — IdempotentAspect")
class IdempotentAspectWhiteBoxTest {

    @Mock
    private StringRedisTemplate stringRedisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;
    @Mock
    private ProceedingJoinPoint joinPoint;

    private IdempotentAspect aspect;

    @BeforeEach
    void setUp() {
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        aspect = new IdempotentAspect(stringRedisTemplate);
    }

    @Test
    @DisplayName("WB-ASYNC-008: 相同 Idempotency-Key 第二次请求被拒绝")
    void wbAsync008_duplicateIdempotencyKeyIsRejected() throws Throwable {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getHeader("Idempotency-Key")).thenReturn("idem-key-001");
        ServletRequestAttributes attributes = new ServletRequestAttributes(request);

        try (MockedStatic<RequestContextHolder> mocked = mockStatic(RequestContextHolder.class)) {
            mocked.when(RequestContextHolder::getRequestAttributes).thenReturn(attributes);
            when(valueOperations.setIfAbsent(eq("claim:idem-key-001"), eq("1"), anyLong(), eq(TimeUnit.MINUTES)))
                    .thenReturn(true, false);
            when(joinPoint.proceed()).thenReturn("ok");

            Object first = aspect.around(joinPoint, idempotentAnnotation());
            assertThat(first).isEqualTo("ok");

            assertThatThrownBy(() -> aspect.around(joinPoint, idempotentAnnotation()))
                    .isInstanceOf(BusinessException.class)
                    .satisfies(ex -> assertThat(((BusinessException) ex).errorCode())
                            .isEqualTo(ErrorCode.INVALID_OPERATION));
        }

        verify(joinPoint).proceed();
    }

    @Test
    @DisplayName("WB-ASYNC-008: 业务异常时释放幂等锁")
    void wbAsync008_releasesLockWhenProceedFails() throws Throwable {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getHeader("Idempotency-Key")).thenReturn("idem-key-002");
        ServletRequestAttributes attributes = new ServletRequestAttributes(request);

        try (MockedStatic<RequestContextHolder> mocked = mockStatic(RequestContextHolder.class)) {
            mocked.when(RequestContextHolder::getRequestAttributes).thenReturn(attributes);
            when(valueOperations.setIfAbsent(anyString(), eq("1"), anyLong(), eq(TimeUnit.MINUTES)))
                    .thenReturn(true);
            when(joinPoint.proceed()).thenThrow(new RuntimeException("boom"));

            assertThatThrownBy(() -> aspect.around(joinPoint, idempotentAnnotation()))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("boom");
        }

        verify(stringRedisTemplate).delete("claim:idem-key-002");
    }

    @Test
    @DisplayName("WB-ASYNC-008: 缺少 Idempotency-Key 时校验失败")
    void wbAsync008_missingIdempotencyKeyIsRejected() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getHeader("Idempotency-Key")).thenReturn(null);
        ServletRequestAttributes attributes = new ServletRequestAttributes(request);

        try (MockedStatic<RequestContextHolder> mocked = mockStatic(RequestContextHolder.class)) {
            mocked.when(RequestContextHolder::getRequestAttributes).thenReturn(attributes);

            assertThatThrownBy(() -> aspect.around(joinPoint, idempotentAnnotation()))
                    .isInstanceOf(BusinessException.class)
                    .satisfies(ex -> assertThat(((BusinessException) ex).errorCode())
                            .isEqualTo(ErrorCode.VALIDATION_ERROR));
        }

        verify(valueOperations, never()).setIfAbsent(anyString(), anyString(), anyLong(), any(TimeUnit.class));
    }

    private static Idempotent idempotentAnnotation() {
        return new Idempotent() {
            @Override
            public Class<Idempotent> annotationType() {
                return Idempotent.class;
            }

            @Override
            public String keyPrefix() {
                return "claim";
            }

            @Override
            public int expireTime() {
                return 5;
            }

            @Override
            public TimeUnit timeUnit() {
                return TimeUnit.MINUTES;
            }

            @Override
            public String errorMessage() {
                return "重复请求，请稍后重试";
            }

            @Override
            public boolean useRequestIdempotencyKey() {
                return true;
            }
        };
    }
}
