package com.labelhub.infra.security;

import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class LoginAttemptService {

    private static final String LOGIN_FAIL_COUNT_KEY_PREFIX = "login:fail:count:";

    private final int maxAttempts;
    private final int lockMinutes;
    private final StringRedisTemplate stringRedisTemplate;

    public LoginAttemptService(
            @Value("${labelhub.auth.login.max-attempts:5}") int maxAttempts,
            @Value("${labelhub.auth.login.lock-minutes:15}") int lockMinutes,
            StringRedisTemplate stringRedisTemplate) {
        this.maxAttempts = maxAttempts;
        this.lockMinutes = lockMinutes;
        this.stringRedisTemplate = stringRedisTemplate;
    }

    public void checkLocked(String username) {
        String key = LOGIN_FAIL_COUNT_KEY_PREFIX + username;
        String countStr = stringRedisTemplate.opsForValue().get(key);
        if (countStr != null) {
            int count = Integer.parseInt(countStr);
            if (count >= maxAttempts) {
                throw new BusinessException(ErrorCode.AUTH_USER_ACCOUNT_LOCKED,
                        "密码错误次数超过 " + maxAttempts + " 次，账号已锁定，请 " + lockMinutes + " 分钟后再试");
            }
        }
    }

    public void loginFailed(String username) {
        String key = LOGIN_FAIL_COUNT_KEY_PREFIX + username;
        Long count = stringRedisTemplate.opsForValue().increment(key);
        if (count == 1) {
            stringRedisTemplate.expire(key, lockMinutes, TimeUnit.MINUTES);
        }
    }

    public void loginSuccess(String username) {
        String key = LOGIN_FAIL_COUNT_KEY_PREFIX + username;
        stringRedisTemplate.delete(key);
    }
}
