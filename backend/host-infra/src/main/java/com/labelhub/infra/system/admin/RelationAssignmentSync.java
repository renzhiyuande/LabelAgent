package com.labelhub.infra.system.admin;

import com.labelhub.infra.persistence.entity.AbstractEntity;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Supplier;
import java.util.stream.Collectors;

/**
 * 同步带 deleted_flag 的关联表，避免 uk(tenant,user,role,deleted_flag) 在“恢复软删行”时与活跃行冲突。
 */
public final class RelationAssignmentSync {
    private RelationAssignmentSync() {
    }

    public static <E extends AbstractEntity> void sync(
            List<E> existing,
            List<Long> targetKeys,
            Function<E, Long> keyExtractor,
            BiConsumer<E, Long> bindKey,
            Supplier<E> entityFactory,
            Consumer<E> persistInsert,
            Consumer<E> persistUpdate,
            Consumer<E> persistPhysicalDelete) {
        sync(existing, targetKeys, keyExtractor, bindKey, entityFactory, persistInsert, persistUpdate, persistPhysicalDelete, ignored -> {
        });
    }

    public static <E extends AbstractEntity> void sync(
            List<E> existing,
            List<Long> targetKeys,
            Function<E, Long> keyExtractor,
            BiConsumer<E, Long> bindKey,
            Supplier<E> entityFactory,
            Consumer<E> persistInsert,
            Consumer<E> persistUpdate,
            Consumer<E> persistPhysicalDelete,
            Consumer<E> onReactivate) {
        Map<Long, List<E>> grouped = existing.stream()
                .collect(Collectors.groupingBy(keyExtractor, LinkedHashMap::new, Collectors.toList()));
        LinkedHashSet<Long> targetSet = targetKeys.stream().collect(Collectors.toCollection(LinkedHashSet::new));

        for (Long key : targetSet) {
            List<E> rows = grouped.getOrDefault(key, List.of());
            E active = rows.stream().filter(row -> row.getDeletedFlag() == 0).findFirst().orElse(null);
            List<E> deletedRows = rows.stream().filter(row -> row.getDeletedFlag() != 0).toList();

            if (active != null) {
                deletedRows.forEach(persistPhysicalDelete);
                continue;
            }
            if (!deletedRows.isEmpty()) {
                E restore = deletedRows.getFirst();
                restore.setDeletedFlag(0);
                onReactivate.accept(restore);
                persistUpdate.accept(restore);
                deletedRows.stream().skip(1).forEach(persistPhysicalDelete);
                continue;
            }
            E created = entityFactory.get();
            bindKey.accept(created, key);
            persistInsert.accept(created);
        }

        existing.stream()
                .filter(row -> row.getDeletedFlag() == 0 && !targetSet.contains(keyExtractor.apply(row)))
                .forEach(row -> {
                    row.setDeletedFlag(1);
                    persistUpdate.accept(row);
                });
    }
}
