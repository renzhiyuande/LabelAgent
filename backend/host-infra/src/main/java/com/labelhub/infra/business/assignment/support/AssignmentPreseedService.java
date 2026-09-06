package com.labelhub.infra.business.assignment.support;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.entity.TaskItemEntity;
import com.labelhub.infra.claimtoken.ClaimTokenStockService;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.persistence.mapper.TaskItemMapper;
import com.labelhub.infra.statemachine.AssignmentStatus;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/**
 * 为任务题目预生成 {@code UNCLAIMED} 分配记录，使抢单路径以 SELECT + CAS 为主。
 */
@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AssignmentPreseedService extends ServiceImpl<AssignmentMapper, AssignmentEntity> {
    private static final int DEFAULT_BATCH_SIZE = 500;
    private static final int IN_QUERY_CHUNK = 1000;

    private final TaskItemMapper taskItemMapper;
    private final ClaimTokenStockService claimTokenStockService;
    private final boolean enabled;
    private final int insertBatchSize;

    public AssignmentPreseedService(
            TaskItemMapper taskItemMapper,
            ClaimTokenStockService claimTokenStockService,
            @Value("${labelhub.claim.preseed-on-publish:true}") boolean enabled,
            @Value("${labelhub.claim.preseed-batch-size:500}") int insertBatchSize) {
        this.taskItemMapper = taskItemMapper;
        this.claimTokenStockService = claimTokenStockService;
        this.enabled = enabled;
        this.insertBatchSize = insertBatchSize > 0 ? insertBatchSize : DEFAULT_BATCH_SIZE;
    }

    /**
     * @return 本次新插入的 UNCLAIMED 条数
     */
    public int ensureUnclaimedAssignmentsForTask(Long taskId) {
        if (!enabled || taskId == null || taskId < 1) {
            return 0;
        }
        List<TaskItemEntity> items = listActiveTaskItems(taskId);
        if (items.isEmpty()) {
            return 0;
        }
        Set<Long> occupiedItemIds = loadOccupiedItemIds(items.stream().map(TaskItemEntity::getId).toList());
        Instant now = Instant.now();
        int created = 0;
        List<AssignmentEntity> pending = new ArrayList<>(insertBatchSize);
        for (TaskItemEntity item : items) {
            if (occupiedItemIds.contains(item.getId())) {
                continue;
            }
            pending.add(buildUnclaimedAssignment(taskId, item.getId(), now));
            if (pending.size() >= insertBatchSize) {
                created += flushInserts(pending, occupiedItemIds);
            }
        }
        created += flushInserts(pending, occupiedItemIds);
        if (created > 0 || !items.isEmpty()) {
            claimTokenStockService.syncStockFromDatabase(taskId);
        }
        return created;
    }

    private int flushInserts(List<AssignmentEntity> pending, Set<Long> occupiedItemIds) {
        if (pending.isEmpty()) {
            return 0;
        }
        // MyBatis-Plus saveBatch：需 JDBC URL 含 rewriteBatchedStatements=true 才真正批量
        boolean success = this.saveBatch(pending, insertBatchSize);
        int inserted = success ? pending.size() : 0;
        for (AssignmentEntity entity : pending) {
            occupiedItemIds.add(entity.getItemId());
        }
        pending.clear();
        return inserted;
    }

    private AssignmentEntity buildUnclaimedAssignment(Long taskId, Long itemId, Instant now) {
        AssignmentEntity entity = new AssignmentEntity();
        entity.setTaskId(taskId);
        entity.setItemId(itemId);
        entity.setSlotNo(1);
        entity.setAssignType("PRESEED");
        entity.setClaimSource("MARKET");
        entity.setStatus(AssignmentStatus.UNCLAIMED.name());
        entity.setCurrentRoundNo(1);
        entity.setAssignedAt(now);
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        return entity;
    }

    private List<TaskItemEntity> listActiveTaskItems(Long taskId) {
        LambdaQueryWrapper<TaskItemEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TaskItemEntity::getDeletedFlag, 0)
                .eq(TaskItemEntity::getTaskId, taskId)
                .orderByAsc(TaskItemEntity::getSeqNo);
        List<TaskItemEntity> list = taskItemMapper.selectList(wrapper);
        return list == null ? List.of() : list;
    }

    private Set<Long> loadOccupiedItemIds(List<Long> itemIds) {
        Set<Long> occupied = new HashSet<>();
        if (itemIds.isEmpty()) {
            return occupied;
        }
        for (int offset = 0; offset < itemIds.size(); offset += IN_QUERY_CHUNK) {
            List<Long> chunk = itemIds.subList(offset, Math.min(offset + IN_QUERY_CHUNK, itemIds.size()));
            LambdaQueryWrapper<AssignmentEntity> wrapper = new LambdaQueryWrapper<>();
            wrapper.eq(AssignmentEntity::getDeletedFlag, 0)
                    .in(AssignmentEntity::getItemId, chunk)
                    .eq(AssignmentEntity::getSlotNo, 1);
            List<AssignmentEntity> existing = getBaseMapper().selectList(wrapper);
            if (existing != null) {
                for (AssignmentEntity row : existing) {
                    occupied.add(row.getItemId());
                }
            }
        }
        return occupied;
    }
}
