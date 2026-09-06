package com.labelhub.infra.system;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.system.InternalClientService;
import com.labelhub.domain.model.Status;
import com.labelhub.infra.persistence.entity.SystemClientEntity;
import com.labelhub.infra.persistence.mapper.SystemClientMapper;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.time.Instant;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbInternalClientService implements InternalClientService {
    private final SystemClientMapper systemClientMapper;
    private final BCryptPasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    public DbInternalClientService(
            SystemClientMapper systemClientMapper,
            BCryptPasswordEncoder passwordEncoder,
            ObjectMapper objectMapper) {
        this.systemClientMapper = systemClientMapper;
        this.passwordEncoder = passwordEncoder;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean validateInternalToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return false;
        }
        for (SystemClientEntity client : systemClientMapper.selectList(
                new LambdaQueryWrapper<SystemClientEntity>()
                        .eq(SystemClientEntity::getDeletedFlag, 0)
                        .eq(SystemClientEntity::getStatus, Status.ACTIVE))) {
            if (client.getExpiresAt() != null && client.getExpiresAt().isBefore(Instant.now())) {
                continue;
            }
            if (passwordEncoder.matches(rawToken, client.getClientSecretHash())) {
                client.setLastUsedAt(Instant.now());
                systemClientMapper.updateById(client);
                return true;
            }
        }
        return false;
    }

    @Override
    public boolean validateIpAddress(String remoteAddr) {
        if (remoteAddr == null || remoteAddr.isBlank()) {
            return false;
        }
        for (SystemClientEntity client : systemClientMapper.selectList(
                new LambdaQueryWrapper<SystemClientEntity>()
                        .eq(SystemClientEntity::getDeletedFlag, 0)
                        .eq(SystemClientEntity::getStatus, Status.ACTIVE))) {
            if (isIpAllowed(client.getIpWhitelistJson(), remoteAddr)) {
                return true;
            }
        }
        return false;
    }

    private boolean isIpAllowed(String whitelistJson, String remoteAddr) {
        if (whitelistJson == null || whitelistJson.isBlank()) {
            return true; // 无白名单配置 = 允许所有 IP
        }
        List<String> allowed;
        try {
            allowed = objectMapper.readValue(whitelistJson, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return false;
        }
        for (String entry : allowed) {
            if ("*".equals(entry) || matchIp(remoteAddr, entry.trim())) {
                return true;
            }
        }
        return false;
    }

    private static boolean matchIp(String remoteAddr, String pattern) {
        if (pattern.equals(remoteAddr)) {
            return true; // 精确匹配
        }
        if (pattern.contains("/")) {
            return matchCidr(remoteAddr, pattern);
        }
        return false;
    }

    private static boolean matchCidr(String remoteAddr, String cidr) {
        try {
            InetAddress inet = InetAddress.getByName(remoteAddr);
            byte[] addr = inet.getAddress();
            String[] parts = cidr.split("/");
            InetAddress netAddr = InetAddress.getByName(parts[0]);
            byte[] net = netAddr.getAddress();
            int maskLen = Integer.parseInt(parts[1]);
            if (addr.length != net.length) {
                return false;
            }
            int fullBytes = maskLen / 8;
            int remainBits = maskLen % 8;
            for (int i = 0; i < fullBytes; i++) {
                if (addr[i] != net[i]) {
                    return false;
                }
            }
            if (remainBits > 0) {
                int mask = 0xFF << (8 - remainBits);
                if ((addr[fullBytes] & mask) != (net[fullBytes] & mask)) {
                    return false;
                }
            }
            return true;
        } catch (UnknownHostException e) {
            return false;
        }
    }
}
