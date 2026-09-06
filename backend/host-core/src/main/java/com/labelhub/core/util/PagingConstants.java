package com.labelhub.core.util;

/**
 * 分页查询默认值常量。
 * <p>
 * 所有 Controller 中的 {@code @RequestParam(defaultValue = "...")} 应引用此常量。host-core 层无 Spring 依赖，
 * 因此用纯常量类而非 {@code @Value} 配置。</p>
 */
public final class PagingConstants {
    private PagingConstants() {
    }

    /** 默认页码（第 1 页） */
    public static final int DEFAULT_PAGE = 1;

    /** 默认每页条数 */
    public static final int DEFAULT_PAGE_SIZE = 20;

    /** 管理后台默认每页条数 */
    public static final int DEFAULT_ADMIN_PAGE_SIZE = 10;

    /** 最大每页条数 */
    public static final int MAX_PAGE_SIZE = 100;
}
