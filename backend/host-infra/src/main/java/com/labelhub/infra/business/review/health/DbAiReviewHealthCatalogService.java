package com.labelhub.infra.business.review.health;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.review.AiReviewHealthCatalogItem;
import com.labelhub.core.review.AiReviewHealthCatalogPage;
import com.labelhub.core.review.AiReviewHealthCatalogService;
import com.labelhub.core.util.PagingConstants;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.TemplatesEntity;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.persistence.mapper.TemplatesMapper;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbAiReviewHealthCatalogService implements AiReviewHealthCatalogService {

    private final TemplatesMapper templatesMapper;
    private final TaskMapper taskMapper;

    public DbAiReviewHealthCatalogService(TemplatesMapper templatesMapper, TaskMapper taskMapper) {
        this.templatesMapper = templatesMapper;
        this.taskMapper = taskMapper;
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:submission:read" })
    public AiReviewHealthCatalogPage listCatalog(int page, int pageSize, String keyword, Long includeTemplateId) {
        int safePage = Math.max(page, PagingConstants.DEFAULT_PAGE);
        int safePageSize = Math.min(Math.max(pageSize, 1), PagingConstants.MAX_PAGE_SIZE);
        String normalizedKeyword = keyword == null ? null : keyword.trim();

        LambdaQueryWrapper<TemplatesEntity> wrapper = buildBaseWrapper();
        applyKeywordFilter(wrapper, normalizedKeyword);

        IPage<TemplatesEntity> pageResult = templatesMapper.selectPage(
                new Page<>(safePage, safePageSize),
                wrapper);

        List<AiReviewHealthCatalogItem> items = buildItems(pageResult.getRecords());
        items = ensureIncludedTemplate(items, includeTemplateId);

        return new AiReviewHealthCatalogPage(
                pageResult.getTotal(),
                safePage,
                safePageSize,
                List.copyOf(items));
    }

    private LambdaQueryWrapper<TemplatesEntity> buildBaseWrapper() {
        LambdaQueryWrapper<TemplatesEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TemplatesEntity::getDeletedFlag, 0)
                .isNotNull(TemplatesEntity::getTaskId)
                .orderByAsc(TemplatesEntity::getTaskId)
                .orderByAsc(TemplatesEntity::getTemplateName);
        return wrapper;
    }

    private void applyKeywordFilter(LambdaQueryWrapper<TemplatesEntity> wrapper, String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return;
        }

        List<Long> matchingTaskIds = findMatchingTaskIds(keyword);
        Long numericKeyword = parseNumericKeyword(keyword);

        wrapper.and(w -> {
            w.like(TemplatesEntity::getTemplateName, keyword)
                    .or()
                    .like(TemplatesEntity::getTemplateCode, keyword);
            if (numericKeyword != null) {
                w.or()
                        .eq(TemplatesEntity::getId, numericKeyword)
                        .or()
                        .eq(TemplatesEntity::getTaskId, numericKeyword);
            }
            if (!matchingTaskIds.isEmpty()) {
                w.or().in(TemplatesEntity::getTaskId, matchingTaskIds);
            }
        });
    }

    private List<Long> findMatchingTaskIds(String keyword) {
        LambdaQueryWrapper<TaskEntity> taskWrapper = new LambdaQueryWrapper<>();
        taskWrapper.eq(TaskEntity::getDeletedFlag, 0);
        Long numericKeyword = parseNumericKeyword(keyword);
        taskWrapper.and(w -> {
            w.like(TaskEntity::getTitle, keyword).or().like(TaskEntity::getTaskCode, keyword);
            if (numericKeyword != null) {
                w.or().eq(TaskEntity::getId, numericKeyword);
            }
        });
        return taskMapper.selectList(taskWrapper).stream()
                .map(TaskEntity::getId)
                .filter(Objects::nonNull)
                .toList();
    }

    private List<AiReviewHealthCatalogItem> buildItems(List<TemplatesEntity> templates) {
        if (templates.isEmpty()) {
            return List.of();
        }

        Map<Long, TaskEntity> taskMap = loadTasks(templates);
        List<AiReviewHealthCatalogItem> items = new ArrayList<>(templates.size());
        for (TemplatesEntity template : templates) {
            TaskEntity task = taskMap.get(template.getTaskId());
            if (task == null) {
                continue;
            }
            items.add(toCatalogItem(task, template));
        }
        return items;
    }

    private Map<Long, TaskEntity> loadTasks(List<TemplatesEntity> templates) {
        List<Long> taskIds = templates.stream()
                .map(TemplatesEntity::getTaskId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (taskIds.isEmpty()) {
            return Map.of();
        }

        LambdaQueryWrapper<TaskEntity> taskWrapper = new LambdaQueryWrapper<>();
        taskWrapper.eq(TaskEntity::getDeletedFlag, 0).in(TaskEntity::getId, taskIds);
        Map<Long, TaskEntity> taskMap = new LinkedHashMap<>();
        for (TaskEntity task : taskMapper.selectList(taskWrapper)) {
            taskMap.put(task.getId(), task);
        }
        return taskMap;
    }

    private List<AiReviewHealthCatalogItem> ensureIncludedTemplate(
            List<AiReviewHealthCatalogItem> items,
            Long includeTemplateId) {
        if (includeTemplateId == null) {
            return items;
        }
        boolean alreadyPresent = items.stream().anyMatch(item -> includeTemplateId.equals(item.templateId()));
        if (alreadyPresent) {
            return items;
        }

        AiReviewHealthCatalogItem pinned = loadSingleItem(includeTemplateId);
        if (pinned == null) {
            return items;
        }

        List<AiReviewHealthCatalogItem> merged = new ArrayList<>(items.size() + 1);
        merged.add(pinned);
        for (AiReviewHealthCatalogItem item : items) {
            if (!includeTemplateId.equals(item.templateId())) {
                merged.add(item);
            }
        }
        return merged;
    }

    private AiReviewHealthCatalogItem loadSingleItem(Long templateId) {
        TemplatesEntity template = templatesMapper.selectById(templateId);
        if (template == null || template.getDeletedFlag() == 1 || template.getTaskId() == null) {
            return null;
        }
        TaskEntity task = taskMapper.selectById(template.getTaskId());
        if (task == null || task.getDeletedFlag() == 1) {
            return null;
        }
        return toCatalogItem(task, template);
    }

    private static AiReviewHealthCatalogItem toCatalogItem(TaskEntity task, TemplatesEntity template) {
        return new AiReviewHealthCatalogItem(
                task.getId(),
                task.getTitle(),
                task.getTaskCode(),
                template.getId(),
                template.getTemplateName(),
                template.getTemplateCode());
    }

    private static Long parseNumericKeyword(String keyword) {
        if (keyword == null || !keyword.matches("\\d+")) {
            return null;
        }
        try {
            return Long.parseLong(keyword);
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
