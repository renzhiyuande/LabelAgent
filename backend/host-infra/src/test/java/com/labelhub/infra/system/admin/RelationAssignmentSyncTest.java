package com.labelhub.infra.system.admin;

import static org.assertj.core.api.Assertions.assertThat;

import com.labelhub.infra.persistence.entity.UserRoleEntity;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class RelationAssignmentSyncTest {

    @Test
    void keepsActiveRowAndRemovesRedundantSoftDeletedDuplicate() {
        UserRoleEntity active = row(1L, 1001L, 2001L, 0);
        UserRoleEntity softDeleted = row(2L, 1001L, 2001L, 1);
        List<UserRoleEntity> existing = new ArrayList<>(List.of(active, softDeleted));
        List<Long> deletedIds = new ArrayList<>();

        RelationAssignmentSync.sync(
                existing,
                List.of(2001L),
                UserRoleEntity::getRoleId,
                (entity, roleId) -> {
                    entity.setUserId(1001L);
                    entity.setRoleId(roleId);
                },
                UserRoleEntity::new,
                entity -> existing.add(entity),
                entity -> {
                },
                entity -> deletedIds.add(entity.getId()));

        assertThat(deletedIds).containsExactly(2L);
        assertThat(active.getDeletedFlag()).isZero();
        assertThat(existing.stream().filter(item -> item.getRoleId().equals(2001L) && item.getDeletedFlag() == 0)).hasSize(1);
    }

    @Test
    void restoresSoftDeletedRowWhenNoActiveDuplicateExists() {
        UserRoleEntity softDeleted = row(3L, 1001L, 2002L, 1);
        List<UserRoleEntity> existing = new ArrayList<>(List.of(softDeleted));

        RelationAssignmentSync.sync(
                existing,
                List.of(2002L),
                UserRoleEntity::getRoleId,
                (entity, roleId) -> {
                    entity.setUserId(1001L);
                    entity.setRoleId(roleId);
                },
                UserRoleEntity::new,
                entity -> existing.add(entity),
                entity -> {
                },
                entity -> existing.removeIf(item -> item.getId().equals(entity.getId())));

        assertThat(softDeleted.getDeletedFlag()).isZero();
    }

    private static UserRoleEntity row(Long id, Long userId, Long roleId, int deletedFlag) {
        UserRoleEntity entity = new UserRoleEntity();
        entity.setId(id);
        entity.setUserId(userId);
        entity.setRoleId(roleId);
        entity.setDeletedFlag(deletedFlag);
        return entity;
    }
}
