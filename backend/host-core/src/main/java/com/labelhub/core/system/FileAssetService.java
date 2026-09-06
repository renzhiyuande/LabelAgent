package com.labelhub.core.system;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.system.SystemDtos.FileAssetDownload;
import com.labelhub.core.system.SystemDtos.FileAssetSummary;

public interface FileAssetService {
    PageResponse<FileAssetSummary> listFiles(ParsedListQuery query);

    FileAssetSummary getFile(Long id);

    FileAssetSummary uploadFile(byte[] content, String originalName, String mimeType, String categoryCode);

    FileAssetDownload downloadFile(Long id);

    void deleteFile(Long id);
}
