package com.labelhub.infra.business.review.support;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.labelhub.core.authz.ReviewerLevelPermissionCodes;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Resolves which human-review levels the current reviewer may access via
 * {@code business:reviewer:level:L*} permissions. Users with only
 * {@code business:reviewer:workbench} (no level grants) retain access to all levels.
 */
@Component
public class ReviewerReviewLevelAccess {

    public static final String LEVEL_PERMISSION_PREFIX = ReviewerLevelPermissionCodes.PREFIX;

    public boolean hasUnrestrictedLevels(Set<String> permissions) {
        if (permissions == null || permissions.isEmpty()) {
            return true;
        }
        if (permissions.contains("system:admin")) {
            return true;
        }
        return permissions.stream().noneMatch(this::isLevelPermission);
    }

    public Set<String> grantedLevelKeys(Set<String> permissions) {
        if (permissions == null || permissions.isEmpty()) {
            return Set.of();
        }
        return permissions.stream()
                .filter(this::isLevelPermission)
                .map(code -> code.substring(ReviewerLevelPermissionCodes.PREFIX.length()))
                .filter(StringUtils::hasText)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    public List<ReviewWorkflowLevel> filterAccessibleLevels(
            List<ReviewWorkflowLevel> workflowLevels, Set<String> permissions) {
        if (workflowLevels == null || workflowLevels.isEmpty()) {
            return List.of();
        }
        if (hasUnrestrictedLevels(permissions)) {
            return List.copyOf(workflowLevels);
        }
        Set<String> granted = grantedLevelKeys(permissions);
        return workflowLevels.stream()
                .filter(level -> granted.contains(level.key()))
                .toList();
    }

    public List<String> accessibleLevelKeys(List<ReviewWorkflowLevel> workflowLevels, Set<String> permissions) {
        return filterAccessibleLevels(workflowLevels, permissions).stream()
                .map(ReviewWorkflowLevel::key)
                .toList();
    }

    public void requireLevelAccess(String levelKey, Set<String> permissions) {
        if (!StringUtils.hasText(levelKey)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "reviewLevel is required");
        }
        if (hasUnrestrictedLevels(permissions)) {
            return;
        }
        if (!grantedLevelKeys(permissions).contains(levelKey.trim())) {
            throw new BusinessException(ErrorCode.AUTH_FORBIDDEN, "No permission for review level: " + levelKey);
        }
    }

    public void applyAccessibleLevels(
            LambdaQueryWrapper<SubmissionEntity> wrapper,
            List<String> accessibleLevelKeys,
            String firstLevelKey) {
        if (accessibleLevelKeys == null || accessibleLevelKeys.isEmpty()) {
            wrapper.apply("1 = 0");
            return;
        }
        wrapper.and(outer -> {
            for (String level : accessibleLevelKeys) {
                if (level.equals(firstLevelKey)) {
                    outer.or(first -> first.eq(SubmissionEntity::getCurrentReviewLevel, level)
                            .or()
                            .isNull(SubmissionEntity::getCurrentReviewLevel)
                            .or()
                            .eq(SubmissionEntity::getCurrentReviewLevel, ""));
                } else {
                    outer.or(other -> other.eq(SubmissionEntity::getCurrentReviewLevel, level));
                }
            }
        });
    }

    public void applyAccessibleLevelsOnQueryWrapper(
            QueryWrapper<SubmissionEntity> wrapper,
            List<String> accessibleLevelKeys,
            String firstLevelKey) {
        if (accessibleLevelKeys == null || accessibleLevelKeys.isEmpty()) {
            wrapper.apply("1 = 0");
            return;
        }
        wrapper.and(outer -> {
            for (String level : accessibleLevelKeys) {
                if (level.equals(firstLevelKey)) {
                    outer.or(first -> first.eq("current_review_level", level)
                            .or()
                            .isNull("current_review_level")
                            .or()
                            .eq("current_review_level", ""));
                } else {
                    outer.or(other -> other.eq("current_review_level", level));
                }
            }
        });
    }

    /** When workflow is unknown, fall back to granted keys only (multi-task scopes). */
    public List<String> resolveAccessibleLevelKeysForFilter(
            List<ReviewWorkflowLevel> workflowLevels, Set<String> permissions) {
        if (hasUnrestrictedLevels(permissions)) {
            return workflowLevels.stream().map(ReviewWorkflowLevel::key).toList();
        }
        Set<String> granted = grantedLevelKeys(permissions);
        if (workflowLevels.isEmpty()) {
            return new ArrayList<>(granted);
        }
        return workflowLevels.stream()
                .map(ReviewWorkflowLevel::key)
                .filter(granted::contains)
                .toList();
    }

    private boolean isLevelPermission(String code) {
        return ReviewerLevelPermissionCodes.isLevelPermission(code);
    }
}
