package com.labelhub.infra.lowcode;

import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.core.lowcode.OptionRequest;
import java.util.List;

public interface BusinessOptionProvider {
    String optionKey();

    default String optionLabel() {
        return optionKey();
    }

    String[] requiredPermissions();

    List<OptionItem> options(String role, String keyword);

    default List<OptionItem> options(OptionRequest request) {
        return options(request.role(), request.keyword());
    }
}
