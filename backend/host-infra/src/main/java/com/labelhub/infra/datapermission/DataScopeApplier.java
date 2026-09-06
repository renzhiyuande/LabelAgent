package com.labelhub.infra.datapermission;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import java.util.ArrayList;
import java.util.List;

/**
 * 将 {@link DataScopeAspect} 注入的数据权限谓词追加到 MyBatis-Plus wrapper。
 * 在标注了 {@code @DataScope} 的方法内调用。
 * 使用参数化方式避免SQL注入风险。
 */
public final class DataScopeApplier {
    private static final String TASK_TABLE_PREFIX = "tasks.";

    private DataScopeApplier() {
    }

    public static <T> void apply(LambdaQueryWrapper<T> wrapper) {
        DataPermissionRule rule = DataScopeAspect.currentRule();
        if (rule == null) {
            return;
        }
        applyPredicates(wrapper, rule.predicates());
    }

    public static void apply(QueryWrapper<?> wrapper) {
        DataPermissionRule rule = DataScopeAspect.currentRule();
        if (rule == null) {
            return;
        }
        applyPredicates(wrapper, rule.predicates());
    }

    public static <T> void applyPredicates(LambdaQueryWrapper<T> wrapper, List<SqlPredicate> predicates) {
        Combined combined = combine(predicates);
        if (combined == null) {
            return;
        }
        wrapper.apply(combined.sql(), combined.params());
    }

    public static void applyPredicates(QueryWrapper<?> wrapper, List<SqlPredicate> predicates) {
        Combined combined = combine(predicates);
        if (combined == null) {
            return;
        }
        wrapper.apply(combined.sql(), combined.params());
    }

    /**
     * 将 TASK 资源谓词（{@code tasks.*} 列名）转为对 {@code task_id} 的子查询过滤。
     * 用于申诉等主表不含 tasks 列、仅持有 task_id 的场景。
     */
    public static <T> void applyTaskIdInSubquery(LambdaQueryWrapper<T> wrapper, List<SqlPredicate> taskPredicates) {
        Combined combined = combineWithTableAlias(taskPredicates, TASK_TABLE_PREFIX, "t.");
        if (combined == null) {
            return;
        }
        wrapper.apply(
                "task_id IN (SELECT t.id FROM tasks t WHERE t.deleted_flag = 0 AND (" + combined.sql() + "))",
                combined.params());
    }

    public static boolean grantsAll(List<SqlPredicate> predicates) {
        if (predicates == null || predicates.isEmpty()) {
            return false;
        }
        return predicates.stream().anyMatch(predicate -> "1=1".equals(predicate.sql()));
    }

    private static Combined combine(List<SqlPredicate> predicates) {
        if (predicates == null || predicates.isEmpty()) {
            return null;
        }
        List<Object> allParams = new ArrayList<>();
        List<String> sqlParts = new ArrayList<>();
        int paramIndex = 0;
        for (SqlPredicate predicate : predicates) {
            String sql = predicate.sql();
            for (Object param : predicate.params()) {
                sql = sql.replaceFirst("\\?", "{" + (paramIndex++) + "}");
            }
            sqlParts.add(sql);
            allParams.addAll(predicate.params());
        }
        return new Combined("(" + String.join(" OR ", sqlParts) + ")", allParams.toArray(new Object[0]));
    }

    private static Combined combineWithTableAlias(
            List<SqlPredicate> predicates,
            String fromPrefix,
            String toPrefix) {
        if (predicates == null || predicates.isEmpty()) {
            return null;
        }
        List<Object> allParams = new ArrayList<>();
        List<String> sqlParts = new ArrayList<>();
        int paramIndex = 0;
        for (SqlPredicate predicate : predicates) {
            String sql = predicate.sql().replace(fromPrefix, toPrefix);
            for (Object param : predicate.params()) {
                sql = sql.replaceFirst("\\?", "{" + (paramIndex++) + "}");
            }
            sqlParts.add(sql);
            allParams.addAll(predicate.params());
        }
        return new Combined("(" + String.join(" OR ", sqlParts) + ")", allParams.toArray(new Object[0]));
    }

    private record Combined(String sql, Object[] params) {
    }
}
