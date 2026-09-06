package com.labelhub.core.authz.export;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;

public record ScannedPermissionManifest(String generatedAt, int totalCount, List<PermissionItem> permissions) {

    public record PermissionItem(String code, List<String> sources) {
    }

    public static ScannedPermissionManifest read(InputStream inputStream) throws IOException {
        return new ObjectMapper().readValue(inputStream, ScannedPermissionManifest.class);
    }
}
