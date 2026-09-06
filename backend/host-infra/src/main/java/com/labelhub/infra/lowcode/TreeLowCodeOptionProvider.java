package com.labelhub.infra.lowcode;

import com.labelhub.core.lowcode.LowCodeDtos.TreeOptionItem;
import com.labelhub.core.lowcode.OptionRequest;
import java.util.List;

public interface TreeLowCodeOptionProvider extends LowCodeOptionProvider {

    List<TreeOptionItem> treeOptions(String keyword);

    default List<TreeOptionItem> treeOptions(OptionRequest request) {
        return treeOptions(request.keyword());
    }
}
