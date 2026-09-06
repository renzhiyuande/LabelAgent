package com.labelhub.infra.authz;

import com.labelhub.core.authz.export.ScannedPermissionManifest;
import java.io.InputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

/**
 * 启动时将构建期扫描得到的权限码同步到 permissions 表，供 Admin 在后台分配。
 */
@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class ScannedPermissionSyncInitializer implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(ScannedPermissionSyncInitializer.class);
    private static final String MANIFEST_LOCATION = "classpath:authz/scanned-permissions.json";

    private final ResourceLoader resourceLoader;
    private final ScannedPermissionSyncService scannedPermissionSyncService;
    private final boolean enabled;

    public ScannedPermissionSyncInitializer(
            ResourceLoader resourceLoader,
            ScannedPermissionSyncService scannedPermissionSyncService,
            @Value("${labelhub.auth.permission-sync.enabled:true}") boolean enabled) {
        this.resourceLoader = resourceLoader;
        this.scannedPermissionSyncService = scannedPermissionSyncService;
        this.enabled = enabled;
    }

    @Override
    public void run(String... args) {
        if (!enabled) {
            log.info("Scanned permission sync is disabled");
            return;
        }

        Resource resource = resourceLoader.getResource(MANIFEST_LOCATION);
        if (!resource.exists()) {
            log.warn("Scanned permission manifest not found at {}, skip sync", MANIFEST_LOCATION);
            return;
        }

        try (InputStream inputStream = resource.getInputStream()) {
            ScannedPermissionManifest manifest = ScannedPermissionManifest.read(inputStream);
            scannedPermissionSyncService.syncFromManifest(manifest);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to sync scanned permissions from " + MANIFEST_LOCATION, ex);
        }
    }
}
