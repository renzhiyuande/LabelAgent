package com.labelhub.infra.lowcode.schema;

import com.labelhub.core.lowcode.schema.LhSchemaRoot;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;

public final class LhSchemaRootClasspathScanner {

    private static final List<String> DEFAULT_BASE_PACKAGES = List.of(
            "com.labelhub.core.business.settings",
            "com.labelhub.core.business.reward",
            "com.labelhub.core.business.review");

    private LhSchemaRootClasspathScanner() {
    }

    public static List<Class<?>> scan() {
        return scan(DEFAULT_BASE_PACKAGES);
    }

    public static List<Class<?>> scan(Collection<String> basePackages) {
        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(LhSchemaRoot.class));

        Set<Class<?>> result = new LinkedHashSet<>();
        for (String basePackage : basePackages) {
            scanner.findCandidateComponents(basePackage).forEach(candidate -> {
                try {
                    Class<?> schemaClass = Class.forName(candidate.getBeanClassName());
                    if (!schemaClass.isRecord()) {
                        throw new IllegalStateException("@LhSchemaRoot must be declared on a record: "
                                + schemaClass.getName());
                    }
                    if (schemaClass.getAnnotation(LhSchemaRoot.class) == null) {
                        return;
                    }
                    result.add(schemaClass);
                } catch (ClassNotFoundException ex) {
                    throw new IllegalStateException("Failed to load @LhSchemaRoot class: "
                            + candidate.getBeanClassName(), ex);
                }
            });
        }
        return List.copyOf(result);
    }

    public static void validateUniqueKeys(List<Class<?>> schemaClasses) {
        Map<String, Class<?>> seen = new LinkedHashMap<>();
        List<String> duplicates = new ArrayList<>();
        for (Class<?> schemaClass : schemaClasses) {
            LhSchemaRoot root = SchemaIntrospector.requireRoot(schemaClass);
            String identity = root.namespace() + "/" + root.key();
            Class<?> previous = seen.put(identity, schemaClass);
            if (previous != null) {
                duplicates.add(identity + " -> " + previous.getName() + ", " + schemaClass.getName());
            }
        }
        if (!duplicates.isEmpty()) {
            throw new IllegalStateException("Duplicate @LhSchemaRoot registrations: " + duplicates);
        }
    }
}
