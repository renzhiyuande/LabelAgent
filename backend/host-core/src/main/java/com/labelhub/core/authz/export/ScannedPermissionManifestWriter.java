package com.labelhub.core.authz.export;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class ScannedPermissionManifestWriter {

    private ScannedPermissionManifestWriter() {
    }

    public static void writeAll(
            Path reportDir,
            Path generatedAuthzDir,
            Path frontendDir,
            List<PermissionEntry> permissions)
            throws IOException {
        Files.createDirectories(reportDir);
        Files.createDirectories(generatedAuthzDir);

        writeTextManifest(reportDir.resolve("permission-codes.txt"), permissions);
        writeRuntimeManifest(generatedAuthzDir.resolve("scanned-permissions.json"), permissions);
        writeReportManifest(reportDir.resolve("permission-codes.json"), permissions);

        if (frontendDir != null) {
            writeFrontendCatalog(frontendDir.resolve("permissions-catalog.json"), permissions);
        }
    }

    private static void writeTextManifest(Path outputFile, List<PermissionEntry> permissions) throws IOException {
        StringBuilder builder = new StringBuilder();
        for (PermissionEntry permission : permissions) {
            builder.append(permission.code()).append('\n');
        }
        Files.writeString(outputFile, builder.toString(), StandardCharsets.UTF_8);
    }

    private static void writeRuntimeManifest(Path outputFile, List<PermissionEntry> permissions) throws IOException {
        ObjectMapper mapper = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);
        mapper.writeValue(outputFile.toFile(), toManifestPayload(permissions));
    }

    private static void writeReportManifest(Path outputFile, List<PermissionEntry> permissions) throws IOException {
        writeRuntimeManifest(outputFile, permissions);
    }

    private static void writeFrontendCatalog(Path outputFile, List<PermissionEntry> permissions) throws IOException {
        ObjectMapper mapper = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);
        List<Map<String, String>> items = permissions.stream().map(permission -> {
            Map<String, String> item = new LinkedHashMap<>();
            item.put("code", permission.code());
            item.put("name", PermissionCodeMetadata.permissionName(permission.code()));
            item.put("module", PermissionCodeMetadata.moduleCode(permission.code()).toLowerCase());
            return item;
        }).toList();
        mapper.writeValue(outputFile.toFile(), items);
    }

    private static Map<String, Object> toManifestPayload(List<PermissionEntry> permissions) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("generatedAt", Instant.now().toString());
        payload.put("totalCount", permissions.size());
        payload.put("permissions", permissions.stream().map(permission -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("code", permission.code());
            item.put("sources", permission.sources());
            return item;
        }).toList());
        return payload;
    }
}
