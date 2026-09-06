package com.labelhub.infra.business;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.persistence.entity.AbstractEntity;
import java.util.List;
import java.util.function.Consumer;
import java.util.function.Function;

/**
 * 数据库 Service 抽象基类。
 * <p>
 * 统一管理以下重复模式：
 * <ul>
 *   <li>{@link #requireNotDeleted} — 替代 200+ 处散落的 {@code entity == null || getDeletedFlag() == 1} 检查</li>
 *   <li>{@link #activeWrapper()} — 替代每个 Service 中重复的 {@code wrapper.eq(deletedFlag, 0)}</li>
 *   <li>{@link #pageQuery} — 替代 30+ Service 中重复的创建 Page + selectPage + 转 PageResponse 的模板代码</li>
 * </ul>
 * </p>
 *
 * @param <T> Entity 类型，必须继承 {@link AbstractEntity}
 */
public abstract class AbstractDbService<T extends AbstractEntity> {

    /**
     * 校验实体不存在或已逻辑删除时抛出异常。
     */
    protected T requireNotDeleted(T entity, ErrorCode errorCode) {
        if (entity == null || entity.getDeletedFlag() == 1) {
            throw new BusinessException(errorCode);
        }
        return entity;
    }

    /**
     * 创建已附加 {@code deleted_flag = 0} 条件的查询包装器。
     * <p>使用 {@code apply} 而非 {@code eq} 避免 Lambda 序列化解析到 AbstractEntity。</p>
     */
    protected LambdaQueryWrapper<T> activeWrapper() {
        return new LambdaQueryWrapper<T>().apply("deleted_flag = {0}", 0);
    }

    /**
     * 分页查询模板方法：创建 Page → 调用 queryFn → 映射 DTO → 包装 PageResponse。
     *
     * @param queryFn  接收 wrapper 的查询方法（通常为 {@code mapper.selectPage(page, wrapper)}）
     * @param mapper   将 Entity 转为 DTO
     * @param page     分页参数
     * @param pageSize 每页条数
     * @param <R>      DTO 类型
     */
    protected <R> PageResponse<R> pageQuery(
            Function<LambdaQueryWrapper<T>, IPage<T>> queryFn,
            Function<T, R> mapper,
            int page,
            int pageSize) {
        LambdaQueryWrapper<T> wrapper = activeWrapper();
        IPage<T> pageResult = queryFn.apply(wrapper);
        List<R> list = pageResult.getRecords().stream().map(mapper).toList();
        return PageResponse.of(pageResult.getTotal(), page, pageSize, list);
    }

    /**
     * 分页查询模板方法（含 wrapper 定制）。
     *
     * @param queryFn    接收 wrapper 的查询方法
     * @param mapper     将 Entity 转为 DTO
     * @param page       分页参数
     * @param pageSize   每页条数
     * @param customizer 对 wrapper 的额外定制（如排序、过滤条件）
     * @param <R>        DTO 类型
     */
    protected <R> PageResponse<R> pageQuery(
            Function<LambdaQueryWrapper<T>, IPage<T>> queryFn,
            Function<T, R> mapper,
            int page,
            int pageSize,
            Consumer<LambdaQueryWrapper<T>> customizer) {
        LambdaQueryWrapper<T> wrapper = activeWrapper();
        customizer.accept(wrapper);
        IPage<T> pageResult = queryFn.apply(wrapper);
        List<R> list = pageResult.getRecords().stream().map(mapper).toList();
        return PageResponse.of(pageResult.getTotal(), page, pageSize, list);
    }
}
