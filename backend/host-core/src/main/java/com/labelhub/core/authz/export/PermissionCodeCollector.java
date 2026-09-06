package com.labelhub.core.authz.export;

import com.labelhub.core.authz.ReviewerLevelPermissionCodes;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

public final class PermissionCodeCollector {

    private static final Pattern REQUIRE_PERMISSION =
            Pattern.compile("@RequirePermission\\(\\s*\"([^\"]+)\"\\s*\\)");
    private static final Pattern REQUIRE_ANY_PERMISSION =
            Pattern.compile("@RequireAnyPermission\\(\\s*\\{([^}]+)\\}\\s*\\)", Pattern.DOTALL);
    private static final Pattern LH_SCHEMA_PERMISSIONS =
            Pattern.compile("@LhSchemaRoot\\([^)]*permissions\\s*=\\s*\\{([^}]+)\\}", Pattern.DOTALL);
    private static final Pattern REQUIRED_PERMISSION_METHOD =
            Pattern.compile("requiredPermissions?\\(\\)\\s*\\{");
    private static final Pattern TS_PERMISSIONS_BLOCK =
            Pattern.compile("permissions\\s*:\\s*\\{");
    private static final Pattern QUOTED_STRING = Pattern.compile("\"([^\"]+)\"");
    private static final Pattern PERMISSION_CODE_LIKE = Pattern.compile("^[a-z][a-z0-9-]*(?::[a-zA-Z0-9_-]+)+$");

    private PermissionCodeCollector() {
    }

    public static List<PermissionEntry> collect(Path backendRoot) throws IOException {
        Map<String, PermissionEntry> entries = new LinkedHashMap<>();
        collectFromJavaSources(backendRoot, entries);
        collectFromFrontendResources(backendRoot, entries);
        collectFromCanonicalRegistries(entries);
        return entries.values().stream().sorted().toList();
    }

    private static void collectFromCanonicalRegistries(Map<String, PermissionEntry> entries) {
        String source = "java:host-core/src/main/java/com/labelhub/core/authz/ReviewerLevelPermissionCodes:registry";
        for (String code : ReviewerLevelPermissionCodes.allCodes()) {
            addCode(entries, code, source);
        }
    }

    private static void collectFromJavaSources(Path backendRoot, Map<String, PermissionEntry> entries)
            throws IOException {
        List<Path> javaRoots = List.of(
                backendRoot.resolve("host-app/src/main/java"),
                backendRoot.resolve("host-core/src/main/java"),
                backendRoot.resolve("host-infra/src/main/java"),
                backendRoot.resolve("host-plugin/src/main/java"));

        for (Path javaRoot : javaRoots) {
            if (!Files.isDirectory(javaRoot)) {
                continue;
            }
            try (Stream<Path> paths = Files.walk(javaRoot)) {
                paths.filter(path -> path.toString().endsWith(".java"))
                        .forEach(path -> readJavaFile(path, backendRoot, entries));
            }
        }
    }

    private static void readJavaFile(Path file, Path backendRoot, Map<String, PermissionEntry> entries) {
        String content;
        try {
            content = Files.readString(file, StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to read Java source: " + file, ex);
        }

        String relativePath = backendRoot.relativize(file).toString().replace('\\', '/');

        Matcher requirePermission = REQUIRE_PERMISSION.matcher(content);
        while (requirePermission.find()) {
            addCode(entries, requirePermission.group(1), "java:" + relativePath + ":@RequirePermission");
        }

        Matcher requireAny = REQUIRE_ANY_PERMISSION.matcher(content);
        while (requireAny.find()) {
            extractQuotedStrings(requireAny.group(1)).forEach(code ->
                    addCode(entries, code, "java:" + relativePath + ":@RequireAnyPermission"));
        }

        Matcher schemaPermissions = LH_SCHEMA_PERMISSIONS.matcher(content);
        while (schemaPermissions.find()) {
            extractQuotedStrings(schemaPermissions.group(1)).forEach(code ->
                    addCode(entries, code, "java:" + relativePath + ":@LhSchemaRoot"));
        }

        collectRequiredPermissionMethods(content, relativePath, entries);
    }

    private static void collectRequiredPermissionMethods(
            String content, String relativePath, Map<String, PermissionEntry> entries) {
        Matcher methodMatcher = REQUIRED_PERMISSION_METHOD.matcher(content);
        while (methodMatcher.find()) {
            int bodyStart = methodMatcher.end();
            int bodyEnd = findMatchingBrace(content, bodyStart - 1);
            if (bodyEnd <= bodyStart) {
                continue;
            }
            String methodName = content.substring(methodMatcher.start(), methodMatcher.end()).contains("requiredPermissions()")
                    ? "requiredPermissions"
                    : "requiredPermission";
            String body = content.substring(bodyStart, bodyEnd);
            extractQuotedStrings(body).forEach(code ->
                    addCode(entries, code, "java:" + relativePath + ":" + methodName));
        }
    }

    private static int findMatchingBrace(String content, int openBraceIndex) {
        int depth = 0;
        for (int index = openBraceIndex; index < content.length(); index++) {
            char current = content.charAt(index);
            if (current == '{') {
                depth++;
            } else if (current == '}') {
                depth--;
                if (depth == 0) {
                    return index;
                }
            }
        }
        return -1;
    }

    private static void collectFromFrontendResources(Path backendRoot, Map<String, PermissionEntry> entries)
            throws IOException {
        Path projectRoot = backendRoot.getParent();
        if (projectRoot == null) {
            return;
        }
        Path frontendRoot = projectRoot.resolve("frontend/src/low-code-resources");
        if (!Files.isDirectory(frontendRoot)) {
            return;
        }

        try (Stream<Path> paths = Files.walk(frontendRoot)) {
            paths.filter(path -> path.getFileName().toString().endsWith(".ts"))
                    .filter(path -> !path.getFileName().toString().endsWith(".test.ts"))
                    .forEach(path -> readTypeScriptFile(path, projectRoot, entries));
        }
    }

    private static void readTypeScriptFile(Path file, Path projectRoot, Map<String, PermissionEntry> entries) {
        String content;
        try {
            content = Files.readString(file, StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to read TypeScript source: " + file, ex);
        }

        String relativePath = projectRoot.relativize(file).toString().replace('\\', '/');

        Matcher permissionsBlock = TS_PERMISSIONS_BLOCK.matcher(content);
        while (permissionsBlock.find()) {
            int bodyStart = permissionsBlock.end();
            int bodyEnd = findMatchingBrace(content, bodyStart - 1);
            if (bodyEnd <= bodyStart) {
                continue;
            }
            extractQuotedStrings(content.substring(bodyStart, bodyEnd)).forEach(code ->
                    addCode(entries, code, "ts:" + relativePath + ":permissions"));
        }

        for (String line : content.split("\n")) {
            if (!line.contains("permission")) {
                continue;
            }
            extractQuotedStrings(line).forEach(code ->
                    addCode(entries, code, "ts:" + relativePath + ":permission"));
        }
    }

    private static List<String> extractQuotedStrings(String fragment) {
        List<String> values = new ArrayList<>();
        Matcher matcher = QUOTED_STRING.matcher(fragment);
        while (matcher.find()) {
            String value = matcher.group(1);
            if (PERMISSION_CODE_LIKE.matcher(value).matches()) {
                values.add(value);
            }
        }
        return values;
    }

    private static void addCode(Map<String, PermissionEntry> entries, String code, String source) {
        PermissionEntry entry = entries.computeIfAbsent(code, PermissionEntry::new);
        entry.addSource(source);
    }
}
