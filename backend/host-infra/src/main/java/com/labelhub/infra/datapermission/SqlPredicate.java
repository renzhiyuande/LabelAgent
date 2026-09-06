package com.labelhub.infra.datapermission;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * 安全的SQL谓词封装，包含SQL片段和对应的参数值列表。
 * 避免SQL注入风险，通过MyBatis-Plus的参数化机制传递参数。
 */
public record SqlPredicate(
        String sql,
        List<Object> params
) {
    public static SqlPredicate of(String sql, Object... params) {
        if (params == null || params.length == 0) {
            return new SqlPredicate(sql, Collections.emptyList());
        }
        List<Object> paramList = new ArrayList<>(params.length);
        Collections.addAll(paramList, params);
        return new SqlPredicate(sql, Collections.unmodifiableList(paramList));
    }
}
