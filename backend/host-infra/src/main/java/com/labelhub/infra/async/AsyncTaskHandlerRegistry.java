package com.labelhub.infra.async;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class AsyncTaskHandlerRegistry {
    private final Map<String, AsyncTaskHandler> handlers;

    public AsyncTaskHandlerRegistry(List<AsyncTaskHandler> handlerList) {
        this.handlers = handlerList.stream()
                .collect(Collectors.toMap(AsyncTaskHandler::taskType, h -> h));
    }

    public AsyncTaskHandler getHandler(String taskType) {
        return handlers.get(taskType);
    }
}
