package com.labelhub.core.business;

import java.util.*;

public final class VersionDiffService {

    private VersionDiffService() {
    }

    public static DiffResult compareSchemas(Long v1Id, Long v2Id, Map<String, Object> v1Schema, Map<String, Object> v2Schema) {
        if (v1Schema == null) {
            v1Schema = Collections.emptyMap();
        }
        if (v2Schema == null) {
            v2Schema = Collections.emptyMap();
        }
        List<Map<String, Object>> addedFields = new ArrayList<>();
        List<Map<String, Object>> removedFields = new ArrayList<>();
        List<Map<String, Object>> modifiedFields = new ArrayList<>();

        compareProperties("", v1Schema, v2Schema, addedFields, removedFields, modifiedFields);

        return new DiffResult(v1Id, v2Id, addedFields, removedFields, modifiedFields);
    }

    @SuppressWarnings("unchecked")
    private static void compareProperties(String prefixPath, Map<String, Object> oldMap, Map<String, Object> newMap,
                                         List<Map<String, Object>> added, List<Map<String, Object>> removed, List<Map<String, Object>> modified) {
        Set<String> allKeys = new TreeSet<>();
        allKeys.addAll(oldMap.keySet());
        allKeys.addAll(newMap.keySet());

        for (String key : allKeys) {
            Object oldVal = oldMap.get(key);
            Object newVal = newMap.get(key);
            String fullPath = prefixPath.isEmpty() ? key : prefixPath + "." + key;

            if (!oldMap.containsKey(key)) {
                added.add(buildFieldEntry(fullPath, newVal, null));
            } else if (!newMap.containsKey(key)) {
                removed.add(buildFieldEntry(fullPath, oldVal, null));
            } else {
                if (deepEquals(oldVal, newVal)) {
                    continue;
                }
                if (oldVal instanceof Map && newVal instanceof Map) {
                    Map<String, Object> oldNestedMap = (Map<String, Object>) oldVal;
                    Map<String, Object> newNestedMap = (Map<String, Object>) newVal;
                    if (!oldNestedMap.isEmpty() || !newNestedMap.isEmpty()) {
                        compareProperties(fullPath, oldNestedMap, newNestedMap, added, removed, modified);
                        continue;
                    }
                }
                modified.add(buildModifiedFieldEntry(fullPath, oldVal, newVal));
            }
        }
    }

    private static Map<String, Object> buildFieldEntry(String path, Object value, String type) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("path", path);
        entry.put("value", value);
        if (type != null) {
            entry.put("type", type);
        }
        return entry;
    }

    private static Map<String, Object> buildModifiedFieldEntry(String path, Object oldVal, Object newVal) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("path", path);
        entry.put("oldValue", oldVal);
        entry.put("newValue", newVal);
        return entry;
    }

    @SuppressWarnings("unchecked")
    private static boolean deepEquals(Object a, Object b) {
        if (a == b) {
            return true;
        }
        if (a == null || b == null) {
            return false;
        }
        if (a.getClass() != b.getClass()) {
            return false;
        }
        if (a instanceof Map) {
            Map<Object, Object> mapA = (Map<Object, Object>) a;
            Map<Object, Object> mapB = (Map<Object, Object>) b;
            if (mapA.size() != mapB.size()) {
                return false;
            }
            for (Object k : mapA.keySet()) {
                if (!deepEquals(mapA.get(k), mapB.get(k))) {
                    return false;
                }
            }
            return true;
        }
        if (a instanceof List) {
            List<?> listA = (List<?>) a;
            List<?> listB = (List<?>) b;
            if (listA.size() != listB.size()) {
                return false;
            }
            for (int i = 0; i < listA.size(); i++) {
                if (!deepEquals(listA.get(i), listB.get(i))) {
                    return false;
                }
            }
            return true;
        }
        if (a instanceof Number && b instanceof Number) {
            return a.toString().equals(b.toString());
        }
        return a.equals(b);
    }

    public record DiffResult(
            Long v1Id,
            Long v2Id,
            List<Map<String, Object>> addedFields,
            List<Map<String, Object>> removedFields,
            List<Map<String, Object>> modifiedFields
    ) {
    }
}
