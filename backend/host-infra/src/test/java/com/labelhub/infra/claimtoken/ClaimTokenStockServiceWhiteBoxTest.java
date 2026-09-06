package com.labelhub.infra.claimtoken;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

/**
 * P0 白盒：抢单库存互斥（WB-CC-010/020/022/040/041, WB-X-002）
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("P0 白盒 — ClaimToken 库存互斥")
class ClaimTokenStockServiceWhiteBoxTest {

    @Mock
    private StringRedisTemplate stringRedisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;
    @Mock
    private AssignmentMapper assignmentMapper;

    private ClaimTokenStockService stockService;

    @BeforeEach
    void setUp() {
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        stockService = new ClaimTokenStockService(stringRedisTemplate, assignmentMapper, true);
    }

    @Test
    @DisplayName("WB-CC-010: stock=1 时仅一个 reserve 成功")
    void wbCc010_onlyOneReserveSucceedsWhenStockIsOne() throws InterruptedException {
        when(stringRedisTemplate.execute(any(), anyList(), anyString(), anyString()))
                .thenReturn(0L)
                .thenReturn(-1L)
                .thenReturn(-1L)
                .thenReturn(-1L)
                .thenReturn(-1L);

        int threads = 5;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger success = new AtomicInteger();

        for (int i = 0; i < threads; i++) {
            String token = "token-" + i;
            pool.submit(() -> {
                try {
                    start.await();
                    stockService.reserve(9001L, token, 1, 120);
                    success.incrementAndGet();
                } catch (BusinessException ignored) {
                    // expected for losers
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }
        start.countDown();
        done.await();
        pool.shutdown();

        assertThat(success.get()).isEqualTo(1);
    }

    @Test
    @DisplayName("WB-CC-020: stock 不足时 reserve 返回业务错误")
    void wbCc020_reserveFailsWhenStockInsufficient() {
        when(stringRedisTemplate.execute(any(), anyList(), anyString(), anyString())).thenReturn(-1L);

        assertThatThrownBy(() -> stockService.reserve(9002L, "token-a", 1, 120))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).errorCode())
                .isEqualTo(ErrorCode.CLAIM_TOKEN_STOCK_INSUFFICIENT);
    }

    @Test
    @DisplayName("WB-CC-022: 兑换失败归还库存不重复释放")
    void wbCc022_safeReleaseIsIdempotent() {
        when(assignmentMapper.selectCount(any())).thenReturn(5L);
        @SuppressWarnings("unchecked")
        Cursor<String> emptyCursor = org.mockito.Mockito.mock(Cursor.class);
        when(emptyCursor.hasNext()).thenReturn(false);
        when(stringRedisTemplate.scan(any())).thenReturn(emptyCursor);
        when(stringRedisTemplate.execute(any(), anyList(), anyString(), anyString()))
                .thenReturn(1L)
                .thenReturn(0L);

        stockService.releaseStock(9003L, 1, "token-release");
        stockService.releaseStock(9003L, 1, "token-release");

        verify(stringRedisTemplate, times(2)).execute(any(), anyList(), anyString(), anyString());
    }

    @Test
    @DisplayName("WB-CC-040: 5 用户并发 reserve 仅 1 成功（WB-X-002 库存层）")
    void wbX002_concurrentReserveOnlyOneWinner() throws InterruptedException {
        when(stringRedisTemplate.execute(any(), anyList(), anyString(), anyString()))
                .thenReturn(0L, -1L, -1L, -1L, -1L);

        int threads = 5;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger success = new AtomicInteger();

        for (int i = 0; i < threads; i++) {
            int idx = i;
            pool.submit(() -> {
                try {
                    start.await();
                    stockService.reserve(9004L, "concurrent-" + idx, 1, 120);
                    success.incrementAndGet();
                } catch (BusinessException ignored) {
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }
        start.countDown();
        done.await();
        pool.shutdown();

        assertThat(success.get()).isEqualTo(1);
        verify(stringRedisTemplate, atLeastOnce()).execute(any(), anyList(), anyString(), anyString());
    }

    @Test
    @DisplayName("WB-CC-041: Redis 不可用降级策略保持可用")
    void wbCc041_degradesWhenRedisUnavailable() {
        ClaimTokenStockService disabled = new ClaimTokenStockService(stringRedisTemplate, assignmentMapper, false);

        assertThat(disabled.isEnabled()).isFalse();
        assertThat(disabled.reserve(1L, "t", 1, 120)).isEqualTo(-1L);
    }
}
