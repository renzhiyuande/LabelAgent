package com.labelhub.core.business.distribute;

/** 任务分发策略常量。供 DTO 校验、注册表、策略实现共用。 */
public final class DistributeStrategy {
    private DistributeStrategy() {
    }

    public static final String FIRST_COME = "FIRST_COME";
    public static final String QUOTA = "QUOTA";
    public static final String ASSIGN = "ASSIGN";

    public static boolean isBuiltin(String code) {
        return FIRST_COME.equals(code) || QUOTA.equals(code) || ASSIGN.equals(code);
    }
}
