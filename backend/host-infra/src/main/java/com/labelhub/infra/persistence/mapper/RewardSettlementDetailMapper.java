package com.labelhub.infra.persistence.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.labelhub.infra.persistence.entity.RewardSettlementDetailEntity;
import com.labelhub.infra.persistence.mapper.result.RewardBatchAggregateStats;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface RewardSettlementDetailMapper extends BaseMapper<RewardSettlementDetailEntity> {

    @Select("""
            SELECT
                COUNT(*) AS effectiveTotalCount,
                COUNT(DISTINCT user_id) AS userTotalCount,
                COALESCE(SUM(amount), 0) AS totalAmount
            FROM reward_settlement_details
            WHERE tenant_id = #{tenantId}
              AND batch_id = #{batchId}
              AND deleted_flag = 0
            """)
    RewardBatchAggregateStats aggregateBatchStats(@Param("tenantId") Long tenantId, @Param("batchId") Long batchId);

    @Select("""
            SELECT DISTINCT d.submission_version_id
            FROM reward_settlement_details d
            INNER JOIN reward_settlement_batches b
                ON b.id = d.batch_id
               AND b.tenant_id = d.tenant_id
            WHERE d.tenant_id = #{tenantId}
              AND d.task_id = #{taskId}
              AND d.deleted_flag = 0
              AND b.deleted_flag = 0
              AND b.status IN ('CONFIRMED', 'PAID')
              AND d.submission_version_id IS NOT NULL
            """)
    List<Long> findDistinctSettledVersionIds(@Param("tenantId") Long tenantId, @Param("taskId") Long taskId);

    @Select("""
            SELECT DISTINCT submission_version_id
            FROM reward_settlement_details
            WHERE tenant_id = #{tenantId}
              AND batch_id = #{batchId}
              AND deleted_flag = 0
              AND submission_version_id IS NOT NULL
            """)
    List<Long> findDistinctVersionIdsByBatchId(@Param("tenantId") Long tenantId, @Param("batchId") Long batchId);

    @Update("""
            <script>
            UPDATE reward_settlement_details
            SET status = #{targetStatus},
                updated_at = #{now}
                <if test="setSettledAt">
                    , settled_at = #{now}
                </if>
                <if test="setReversedAt">
                    , reversed_at = #{now}
                </if>
            WHERE batch_id = #{batchId}
              AND deleted_flag = 0
              <if test="keepReversedUnchanged">
                AND status != 'REVERSED'
              </if>
            </script>
            """)
    int updateStatusByBatchId(
            @Param("batchId") Long batchId,
            @Param("targetStatus") String targetStatus,
            @Param("now") java.time.Instant now,
            @Param("keepReversedUnchanged") boolean keepReversedUnchanged,
            @Param("setSettledAt") boolean setSettledAt,
            @Param("setReversedAt") boolean setReversedAt);
}
