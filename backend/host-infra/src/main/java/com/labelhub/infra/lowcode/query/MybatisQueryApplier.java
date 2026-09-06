package com.labelhub.infra.lowcode.query;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.support.SFunction;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.LowCodeDtos.SortRule;
import com.labelhub.core.lowcode.query.ParsedFilter;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import org.springframework.stereotype.Component;

@Component
public class MybatisQueryApplier {
    public <T> void apply(LambdaQueryWrapper<T> wrapper, ParsedListQuery query, ResourceQuerySpec<T> spec) {
        for (ParsedFilter filter : query.filters()) {
            ResourceQuerySpec.FilterApplier<T> applier = spec.filter(filter.field());
            if (applier == null) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR, "unsupported filter field: " + filter.field());
            }
            applier.apply(wrapper, filter.operator(), filter.value());
        }
        for (SortRule sortRule : query.sort()) {
            SFunction<T, ?> sortField = spec.sort(sortRule.field());
            if (sortField == null) {
                continue;
            }
            wrapper.orderBy(true, !"desc".equalsIgnoreCase(sortRule.order()), sortField);
        }
    }
}
