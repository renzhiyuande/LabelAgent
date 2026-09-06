package com.labelhub.infra.system.admin;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.audit.Audit;
import com.labelhub.core.audit.AuditSnapshotSource;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.system.SystemDtos.PageQuery;
import com.labelhub.core.system.SystemDtos.RotatedSecret;
import com.labelhub.core.system.SystemDtos.SystemClientCommand;
import com.labelhub.core.system.SystemDtos.SystemClientSummary;
import com.labelhub.domain.model.Status;
import com.labelhub.infra.business.llm.agent.AgentHealthClient;
import com.labelhub.infra.business.llm.agent.AgentHealthClient.AgentHealthProbeResult;
import com.labelhub.infra.persistence.entity.SystemClientEntity;
import com.labelhub.infra.persistence.mapper.SystemClientMapper;
import com.labelhub.infra.system.admin.mapper.SystemClientAdminMapper;
import com.labelhub.infra.util.Jsons;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class SystemClientAdminService {
    private final SystemClientMapper systemClientMapper;
    private final AdminSupport adminSupport;
    private final BCryptPasswordEncoder passwordEncoder;
    private final SystemClientAdminMapper systemClientAdminMapper;
    private final AgentHealthClient agentHealthClient;

    public SystemClientAdminService(
            SystemClientMapper systemClientMapper,
            AdminSupport adminSupport,
            BCryptPasswordEncoder passwordEncoder,
            SystemClientAdminMapper systemClientAdminMapper,
            AgentHealthClient agentHealthClient) {
        this.systemClientMapper = systemClientMapper;
        this.adminSupport = adminSupport;
        this.passwordEncoder = passwordEncoder;
        this.systemClientAdminMapper = systemClientAdminMapper;
        this.agentHealthClient = agentHealthClient;
    }

    @RequireAnyPermission({"system:admin"})
    public PageResponse<SystemClientSummary> listSystemClients(PageQuery query) {
        var wrapper = adminSupport.<SystemClientEntity>activeWrapper();
        if (query.keyword() != null && !query.keyword().isBlank()) {
            wrapper.like(SystemClientEntity::getClientCode, query.keyword());
        }
        var page = systemClientMapper.selectPage(adminSupport.page(query), wrapper);
        return PageResponse.of(page.getTotal(), query.normalizedPage(), query.normalizedPageSize(),
                page.getRecords().stream().map(this::toSystemClientSummary).toList());
    }

    @RequireAnyPermission({"system:admin"})
    public SystemClientSummary getSystemClient(Long id) {
        return toSystemClientSummary(adminSupport.requireEntity(systemClientMapper.selectById(id), "system client"));
    }

    @RequireAnyPermission({"system:admin"})
    public SystemClientSummary probeSystemClientHealth(Long id) {
        SystemClientSummary summary = toSystemClientSummary(
                adminSupport.requireEntity(systemClientMapper.selectById(id), "system client"));
        if (!supportsOnlineProbe(summary)) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "Only AGENT clients support online probe");
        }
        return enrichHealth(summary);
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "SYSTEM_CLIENT", actionCode = "systemClient.create", entityId = "#result.id()", after = AuditSnapshotSource.RESULT)
    @org.springframework.cache.annotation.CacheEvict(value = "options", allEntries = true)
    public SystemClientSummary createSystemClient(SystemClientCommand command) {
        String rawSecret = UUID.randomUUID().toString().replace("-", "");
        SystemClientEntity entity = new SystemClientEntity();
        systemClientAdminMapper.apply(command, entity);
        entity.setAllowedScopesJson(Jsons.write(command.allowedScopes() == null ? List.of() : command.allowedScopes()));
        entity.setStatus(Status.ACTIVE);
        entity.setClientSecretHash(passwordEncoder.encode(rawSecret));
        systemClientMapper.insert(entity);
        return toSystemClientSummary(entity);
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "SYSTEM_CLIENT", actionCode = "systemClient.update", entityId = "#id")
    @org.springframework.cache.annotation.CacheEvict(value = "options", allEntries = true)
    public SystemClientSummary updateSystemClient(Long id, SystemClientCommand command) {
        SystemClientEntity entity = adminSupport.requireEntity(systemClientMapper.selectById(id), "system client");
        systemClientAdminMapper.apply(command, entity);
        entity.setAllowedScopesJson(Jsons.write(command.allowedScopes() == null ? List.of() : command.allowedScopes()));
        systemClientMapper.updateById(entity);
        return toSystemClientSummary(entity);
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "SYSTEM_CLIENT", actionCode = "systemClient.status", entityId = "#id")
    public void setSystemClientStatus(Long id, String status) {
        SystemClientEntity entity = adminSupport.requireEntity(systemClientMapper.selectById(id), "system client");
        entity.setStatus(status);
        systemClientMapper.updateById(entity);
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "SYSTEM_CLIENT", actionCode = "systemClient.rotateSecret", entityId = "#id")
    public RotatedSecret rotateSystemClientSecret(Long id) {
        SystemClientEntity entity = adminSupport.requireEntity(systemClientMapper.selectById(id), "system client");
        String secret = UUID.randomUUID().toString().replace("-", "");
        entity.setClientSecretHash(passwordEncoder.encode(secret));
        systemClientMapper.updateById(entity);
        return new RotatedSecret(entity.getClientCode(), secret);
    }

    public SystemClientSummary toSystemClientSummary(SystemClientEntity entity) {
        SystemClientSummary base = systemClientAdminMapper.toSummary(entity,
                entity.getAllowedScopesJson() == null ? List.of() : Jsons.readStringList(entity.getAllowedScopesJson()));
        return enrichHealth(base);
    }

    private SystemClientSummary enrichHealth(SystemClientSummary base) {
        if (!supportsOnlineProbe(base)) {
            return withHealth(base, "N/A", null, null, null, null);
        }
        AgentHealthProbeResult probe = agentHealthClient.probe();
        return withHealth(
                base,
                probe.up() ? "UP" : "DOWN",
                Instant.now(),
                probe.latencyMs(),
                probe.message(),
                probe.agentBaseUrl());
    }

    private static boolean supportsOnlineProbe(SystemClientSummary summary) {
        return summary.clientType() != null && "AGENT".equalsIgnoreCase(summary.clientType());
    }

    private static SystemClientSummary withHealth(
            SystemClientSummary base,
            String onlineStatus,
            Instant lastProbeAt,
            Long probeLatencyMs,
            String probeMessage,
            String agentBaseUrl) {
        return new SystemClientSummary(
                base.id(),
                base.clientCode(),
                base.clientName(),
                base.clientType(),
                base.allowedScopes(),
                base.status(),
                base.lastUsedAt(),
                base.expiresAt(),
                onlineStatus,
                lastProbeAt,
                probeLatencyMs,
                probeMessage,
                agentBaseUrl);
    }
}
