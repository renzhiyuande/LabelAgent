package com.labelhub.infra.lowcode;

import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.core.lowcode.OptionRequest;
import java.util.List;

public interface LowCodeOptionProvider {
    String optionKey();

    List<OptionItem> options(String keyword);

    default List<OptionItem> options(OptionRequest request) {
        return options(request.keyword());
    }

    default String optionLabel() {
        return optionKey();
    }

    default String requiredPermission() {
        return null;
    }

    /** 满足其中任一权限即可；未覆盖时回退到 {@link #requiredPermission()}。 */
    default String[] requiredPermissions() {
        String permission = requiredPermission();
        if (permission == null || permission.isBlank()) {
            return new String[0];
        }
        return new String[] { permission };
    }
}
