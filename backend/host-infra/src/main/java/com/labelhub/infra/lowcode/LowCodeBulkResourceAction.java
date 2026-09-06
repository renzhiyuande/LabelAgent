package com.labelhub.infra.lowcode;

import java.util.List;

@FunctionalInterface
public interface LowCodeBulkResourceAction {
    void run(List<Long> ids);
}
