package com.labelhub.infra.business.display;

import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.persistence.mapper.ReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.TaskItemMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.system.UserDisplayNameResolver;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;

final class DisplayAssemblerTestConfigurationSupport {
    private static final List<Object> TASK_ENTITIES = new ArrayList<>();
    private static final List<Object> TASK_ITEM_ENTITIES = new ArrayList<>();
    private static final List<Object> ASSIGNMENT_ENTITIES = new ArrayList<>();
    private static final List<Object> REVIEW_RECORD_ENTITIES = new ArrayList<>();
    private static final List<Object> TEMPLATE_VERSION_ENTITIES = new ArrayList<>();
    private static UserDisplayNameResolver userDisplayNameResolver = createDefaultUserDisplayNameResolver();

    private static UserDisplayNameResolver createDefaultUserDisplayNameResolver() {
        return new UserDisplayNameResolver(null) {
            @Override
            public String resolve(Long userId) {
                if (userId == null) {
                    return null;
                }
                if (userId == 30L) {
                    return "标注员甲";
                }
                if (userId == 40L) {
                    return "任务 Owner";
                }
                return null;
            }
        };
    }

    private DisplayAssemblerTestConfigurationSupport() {
    }

    static void reset() {
        TASK_ENTITIES.clear();
        TASK_ITEM_ENTITIES.clear();
        ASSIGNMENT_ENTITIES.clear();
        REVIEW_RECORD_ENTITIES.clear();
        TEMPLATE_VERSION_ENTITIES.clear();
        userDisplayNameResolver = createDefaultUserDisplayNameResolver();
    }

    static void registerTask(Object entity) {
        TASK_ENTITIES.add(entity);
    }

    static void registerTaskItem(Object entity) {
        TASK_ITEM_ENTITIES.add(entity);
    }

    static void registerAssignment(Object entity) {
        ASSIGNMENT_ENTITIES.add(entity);
    }

    static void registerReviewRecord(Object entity) {
        REVIEW_RECORD_ENTITIES.add(entity);
    }

    static void registerTemplateVersion(Object entity) {
        TEMPLATE_VERSION_ENTITIES.add(entity);
    }

    static void setUserDisplayNameResolver(UserDisplayNameResolver resolver) {
        userDisplayNameResolver = resolver;
    }

    static TaskMapper taskMapper() {
        return proxy(TaskMapper.class, batchIdsHandler(TASK_ENTITIES));
    }

    static TaskItemMapper taskItemMapper() {
        return proxy(TaskItemMapper.class, batchIdsHandler(TASK_ITEM_ENTITIES));
    }

    static AssignmentMapper assignmentMapper() {
        return proxy(AssignmentMapper.class, batchIdsHandler(ASSIGNMENT_ENTITIES));
    }

    static ReviewRecordMapper reviewRecordMapper() {
        return proxy(ReviewRecordMapper.class, batchIdsHandler(REVIEW_RECORD_ENTITIES));
    }

    static TemplateVersionMapper templateVersionMapper() {
        return proxy(TemplateVersionMapper.class, batchIdsHandler(TEMPLATE_VERSION_ENTITIES));
    }

    static UserDisplayNameResolver userDisplayNameResolver() {
        return userDisplayNameResolver;
    }

    static <T> T emptyListMapper(Class<T> type) {
        return proxy(type, (proxy, method, args) -> {
            if ("selectList".equals(method.getName())) {
                return Collections.emptyList();
            }
            if ("toString".equals(method.getName())) {
                return "EmptyListMapperStub";
            }
            if ("hashCode".equals(method.getName())) {
                return System.identityHashCode(proxy);
            }
            if ("equals".equals(method.getName())) {
                return proxy == args[0];
            }
            return null;
        });
    }

    private static InvocationHandler batchIdsHandler(List<?> entities) {
        return (proxy, method, args) -> {
            if ("selectBatchIds".equals(method.getName())
                    && args != null
                    && args.length > 0
                    && args[0] instanceof Collection<?> ids) {
                return entities.stream()
                        .filter(entity -> ids.contains(readId(entity)))
                        .toList();
            }
            if ("toString".equals(method.getName())) {
                return "MapperStub";
            }
            if ("hashCode".equals(method.getName())) {
                return System.identityHashCode(proxy);
            }
            if ("equals".equals(method.getName())) {
                return proxy == args[0];
            }
            return null;
        };
    }

    @SuppressWarnings("unchecked")
    private static <T> T proxy(Class<T> type, InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[] { type }, handler);
    }

    private static Object readId(Object entity) {
        try {
            Method getId = entity.getClass().getMethod("getId");
            return getId.invoke(entity);
        } catch (ReflectiveOperationException ex) {
            return null;
        }
    }
}
