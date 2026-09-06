package com.labelhub.core.business.export;

import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.core.lowcode.LowCodeDtos.TreeOptionItem;
import java.util.List;

public interface ExportFieldCatalogService {

    List<OptionItem> listFieldOptions(Long taskId);

    List<TreeOptionItem> listFieldTreeOptions(Long taskId);
}
