package com.labelhub.infra.config;

import java.util.concurrent.Executor;
import java.util.concurrent.Semaphore;
import java.util.concurrent.ThreadPoolExecutor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * llmSuggest 专用线程池 + 并发信号量。
 * <p>
 * 线程池隔离：LLM 调用是慢 I/O（2-15s），不占用 Tomcat 公共线程池。
 * Semaphore：限制同时进行的 LLM 调用数，避免超订 Agent 和 LLM Provider。
 */
@Configuration
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class LlmSuggestExecutorConfig {

    @Bean("llmSuggestExecutor")
    public Executor llmSuggestExecutor(
            @Value("${labelhub.llm.suggest.thread-pool.core:4}") int core,
            @Value("${labelhub.llm.suggest.thread-pool.max:8}") int max,
            @Value("${labelhub.llm.suggest.thread-pool.queue-capacity:50}") int queueCapacity) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(core);
        executor.setMaxPoolSize(max);
        executor.setQueueCapacity(queueCapacity);
        executor.setKeepAliveSeconds(60);
        executor.setThreadNamePrefix("llm-suggest-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

    @Bean("llmSuggestSemaphore")
    public Semaphore llmSuggestSemaphore(
            @Value("${labelhub.llm.suggest.max-concurrent:4}") int maxConcurrent) {
        return new Semaphore(maxConcurrent, true);
    }
}
