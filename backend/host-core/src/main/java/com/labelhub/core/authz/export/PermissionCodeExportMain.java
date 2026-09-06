package com.labelhub.core.authz.export;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

public final class PermissionCodeExportMain {

    private PermissionCodeExportMain() {
    }

    public static void main(String[] args) throws IOException {
        Path backendRoot = resolveBackendRoot(args);
        Path reportDir = resolveReportDir(args, backendRoot);
        Path generatedAuthzDir = resolveGeneratedAuthzDir(args, backendRoot);
        Path frontendDir = resolveFrontendDir(args, backendRoot);

        List<PermissionEntry> permissions = PermissionCodeCollector.collect(backendRoot);
        ScannedPermissionManifestWriter.writeAll(reportDir, generatedAuthzDir, frontendDir, permissions);

        System.out.println("Exported " + permissions.size() + " permission codes");
        System.out.println("  report: " + reportDir.toAbsolutePath());
        System.out.println("  runtime manifest: " + generatedAuthzDir.resolve("scanned-permissions.json").toAbsolutePath());
        if (frontendDir != null) {
            System.out.println("  frontend catalog: " + frontendDir.resolve("permissions-catalog.json").toAbsolutePath());
        }
    }

    static Path resolveBackendRoot(String[] args) {
        if (args.length >= 1) {
            return Path.of(args[0]).toAbsolutePath().normalize();
        }
        return Path.of("..").toAbsolutePath().normalize();
    }

    static Path resolveReportDir(String[] args, Path backendRoot) {
        if (args.length >= 2) {
            return Path.of(args[1]).toAbsolutePath().normalize();
        }
        return backendRoot.resolve("target/permission-codes");
    }

    static Path resolveGeneratedAuthzDir(String[] args, Path backendRoot) {
        if (args.length >= 3) {
            return Path.of(args[2]).toAbsolutePath().normalize();
        }
        return backendRoot.resolve("target/generated-authz");
    }

    static Path resolveFrontendDir(String[] args, Path backendRoot) {
        if (args.length >= 4) {
            String value = args[3];
            if (value.isBlank() || "-".equals(value)) {
                return null;
            }
            return Path.of(value).toAbsolutePath().normalize();
        }
        Path projectRoot = backendRoot.getParent();
        return projectRoot == null ? null : projectRoot.resolve("frontend");
    }
}
