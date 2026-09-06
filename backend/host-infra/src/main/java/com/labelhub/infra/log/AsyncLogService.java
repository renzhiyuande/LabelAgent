package com.labelhub.infra.log;

import com.labelhub.infra.persistence.entity.LoginLogEntity;
import com.labelhub.infra.persistence.mapper.LoginLogMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AsyncLogService {
    private static final Logger log = LoggerFactory.getLogger(AsyncLogService.class);

    private final LoginLogMapper loginLogMapper;

    public AsyncLogService(LoginLogMapper loginLogMapper) {
        this.loginLogMapper = loginLogMapper;
    }

    @Async("operationLogThreadPool")
    public void saveLoginLogAsync(LoginLogEntity entity) {
        try {
            loginLogMapper.insert(entity);
        } catch (Exception ex) {
            log.error("Failed to async save login log", ex);
        }
    }
}
