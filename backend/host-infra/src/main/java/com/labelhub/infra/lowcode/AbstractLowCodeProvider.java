package com.labelhub.infra.lowcode;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;

public abstract class AbstractLowCodeProvider<T> implements LowCodeResourceProvider<T> {
    protected final LowCodeQuerySupport querySupport;

    protected AbstractLowCodeProvider(LowCodeQuerySupport querySupport) {
        this.querySupport = querySupport;
    }

    @Override
    public abstract PageResponse<T> query(ListQuery query);
}
