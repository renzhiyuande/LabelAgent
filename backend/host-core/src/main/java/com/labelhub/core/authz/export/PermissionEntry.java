package com.labelhub.core.authz.export;

import java.util.LinkedHashSet;
import java.util.Set;

public final class PermissionEntry implements Comparable<PermissionEntry> {

    private final String code;
    private final Set<String> sources = new LinkedHashSet<>();

    public PermissionEntry(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }

    public Set<String> sources() {
        return Set.copyOf(sources);
    }

    void addSource(String source) {
        sources.add(source);
    }

    @Override
    public int compareTo(PermissionEntry other) {
        return code.compareTo(other.code);
    }
}
