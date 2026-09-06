package com.labelhub.infra.lowcode.provider;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.core.lowcode.LowCodeDtos.TreeOptionItem;
import com.labelhub.core.lowcode.OptionRequest;
import com.labelhub.infra.lowcode.TreeLowCodeOptionProvider;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.entity.TemplatesEntity;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.persistence.mapper.TemplatesMapper;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class TemplateVersionTreeOptionProvider implements TreeLowCodeOptionProvider {
    private static final int MAX_TEMPLATES = 50;
    private static final String GROUP_PREFIX = "tpl:";

    private final TemplatesMapper templatesMapper;
    private final TemplateVersionMapper templateVersionMapper;

    public TemplateVersionTreeOptionProvider(
            TemplatesMapper templatesMapper,
            TemplateVersionMapper templateVersionMapper) {
        this.templatesMapper = templatesMapper;
        this.templateVersionMapper = templateVersionMapper;
    }

    @Override
    public String optionKey() {
        return "templateVersionTree";
    }

    @Override
    public String optionLabel() {
        return "模板版本树";
    }

    @Override
    public String[] requiredPermissions() {
        return new String[] {
                "system:admin",
                "business:template:read",
                "business:template:manage",
                "business:task:create",
                "business:task:read",
        };
    }

    @Override
    public List<OptionItem> options(String keyword) {
        return options(OptionRequest.of(keyword == null ? Map.of() : Map.of("keyword", keyword)));
    }

    @Override
    public List<OptionItem> options(OptionRequest request) {
        String keyword = request.keyword();
        OptionItem byVersionId = findVersionOptionByKeyword(keyword);
        if (byVersionId != null) {
            return List.of(byVersionId);
        }
        List<TemplatesEntity> templates = listTemplates(keyword);
        if (templates.isEmpty()) {
            return List.of();
        }
        Map<Long, List<TemplateVersionEntity>> versionsByTemplate = loadVersionsByTemplate(templates);
        List<OptionItem> result = new ArrayList<>();
        for (TemplatesEntity template : templates) {
            List<TemplateVersionEntity> versions = versionsByTemplate.getOrDefault(template.getId(), List.of());
            for (TemplateVersionEntity version : versions) {
                if (!matchesKeyword(keyword, template, version)) {
                    continue;
                }
                result.add(new OptionItem(formatVersionLabel(template, version), String.valueOf(version.getId())));
            }
        }
        return result;
    }

    @Override
    public List<TreeOptionItem> treeOptions(String keyword) {
        return treeOptions(OptionRequest.of(keyword == null ? Map.of() : Map.of("keyword", keyword)));
    }

    @Override
    public List<TreeOptionItem> treeOptions(OptionRequest request) {
        String keyword = request.keyword();
        List<TreeOptionItem> byVersionId = findVersionTreeByKeyword(keyword);
        if (byVersionId != null) {
            return byVersionId;
        }
        List<TemplatesEntity> templates = listTemplates(keyword);
        if (templates.isEmpty()) {
            return List.of();
        }
        Map<Long, List<TemplateVersionEntity>> versionsByTemplate = loadVersionsByTemplate(templates);
        List<TreeOptionItem> result = new ArrayList<>();
        for (TemplatesEntity template : templates) {
            List<TemplateVersionEntity> versions = versionsByTemplate.getOrDefault(template.getId(), List.of());
            List<TemplateVersionEntity> visibleVersions = versions.stream()
                    .filter(version -> matchesKeyword(keyword, template, version))
                    .toList();
            if (visibleVersions.isEmpty() && keyword != null && !keyword.isBlank()
                    && !matchesTemplateKeyword(keyword, template)) {
                continue;
            }
            List<TreeOptionItem> children = visibleVersions.stream()
                    .map(version -> new TreeOptionItem(formatVersionOnlyLabel(version), String.valueOf(version.getId())))
                    .toList();
            if (children.isEmpty()) {
                continue;
            }
            result.add(new TreeOptionItem(
                    formatTemplateLabel(template),
                    GROUP_PREFIX + template.getId(),
                    children));
        }
        return result;
    }

    private OptionItem findVersionOptionByKeyword(String keyword) {
        Long versionId = parseVersionIdKeyword(keyword);
        if (versionId == null) {
            return null;
        }
        TemplateVersionEntity version = templateVersionMapper.selectById(versionId);
        if (version == null || version.getDeletedFlag() == 1 || "ARCHIVED".equals(version.getStatus())) {
            return null;
        }
        TemplatesEntity template = templatesMapper.selectById(version.getTemplateId());
        if (template == null || template.getDeletedFlag() == 1) {
            return null;
        }
        return new OptionItem(formatVersionLabel(template, version), String.valueOf(version.getId()));
    }

    private List<TreeOptionItem> findVersionTreeByKeyword(String keyword) {
        Long versionId = parseVersionIdKeyword(keyword);
        if (versionId == null) {
            return null;
        }
        TemplateVersionEntity version = templateVersionMapper.selectById(versionId);
        if (version == null || version.getDeletedFlag() == 1 || "ARCHIVED".equals(version.getStatus())) {
            return List.of();
        }
        TemplatesEntity template = templatesMapper.selectById(version.getTemplateId());
        if (template == null || template.getDeletedFlag() == 1) {
            return List.of();
        }
        return List.of(new TreeOptionItem(
                formatTemplateLabel(template),
                GROUP_PREFIX + template.getId(),
                List.of(new TreeOptionItem(formatVersionOnlyLabel(version), String.valueOf(version.getId())))));
    }

    private Long parseVersionIdKeyword(String keyword) {
        if (keyword == null || !keyword.matches("\\d{8,}")) {
            return null;
        }
        try {
            return Long.parseLong(keyword.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private List<TemplatesEntity> listTemplates(String keyword) {
        LambdaQueryWrapper<TemplatesEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TemplatesEntity::getDeletedFlag, 0);
        if (keyword != null && !keyword.isBlank()) {
            String normalized = keyword.trim();
            wrapper.and(w -> w.like(TemplatesEntity::getTemplateName, normalized)
                    .or()
                    .like(TemplatesEntity::getTemplateCode, normalized)
                    .or()
                    .like(TemplatesEntity::getSceneCode, normalized));
        }
        wrapper.orderByDesc(TemplatesEntity::getUpdatedAt);
        wrapper.last("LIMIT " + MAX_TEMPLATES);
        return templatesMapper.selectList(wrapper);
    }

    private Map<Long, List<TemplateVersionEntity>> loadVersionsByTemplate(List<TemplatesEntity> templates) {
        List<Long> templateIds = templates.stream().map(TemplatesEntity::getId).toList();
        if (templateIds.isEmpty()) {
            return Map.of();
        }
        LambdaQueryWrapper<TemplateVersionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.in(TemplateVersionEntity::getTemplateId, templateIds);
        wrapper.eq(TemplateVersionEntity::getDeletedFlag, 0);
        wrapper.ne(TemplateVersionEntity::getStatus, "ARCHIVED");
        wrapper.orderByDesc(TemplateVersionEntity::getVersionNo);
        List<TemplateVersionEntity> versions = templateVersionMapper.selectList(wrapper);
        return versions.stream()
                .collect(Collectors.groupingBy(
                        TemplateVersionEntity::getTemplateId,
                        Collectors.collectingAndThen(Collectors.toList(), list -> list.stream()
                                .sorted(Comparator.comparing(
                                        TemplateVersionEntity::getVersionNo,
                                        Comparator.nullsLast(Comparator.reverseOrder())))
                                .toList())));
    }

    private static boolean matchesKeyword(String keyword, TemplatesEntity template, TemplateVersionEntity version) {
        if (keyword == null || keyword.isBlank()) {
            return true;
        }
        String normalized = keyword.trim().toLowerCase(Locale.ROOT);
        return matchesTemplateKeyword(normalized, template)
                || formatVersionOnlyLabel(version).toLowerCase(Locale.ROOT).contains(normalized)
                || String.valueOf(version.getId()).contains(normalized);
    }

    private static boolean matchesTemplateKeyword(String keyword, TemplatesEntity template) {
        String normalized = keyword.trim().toLowerCase(Locale.ROOT);
        return containsIgnoreCase(template.getTemplateName(), normalized)
                || containsIgnoreCase(template.getTemplateCode(), normalized)
                || containsIgnoreCase(template.getSceneCode(), normalized);
    }

    private static boolean containsIgnoreCase(String value, String keyword) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(keyword);
    }

    private static String formatTemplateLabel(TemplatesEntity template) {
        String name = template.getTemplateName() != null ? template.getTemplateName() : "未命名模板";
        String code = template.getTemplateCode() != null ? template.getTemplateCode() : "";
        String scene = template.getSceneCode() != null ? template.getSceneCode() : "";
        if (!code.isBlank() && !scene.isBlank()) {
            return name + " (" + code + " · " + scene + ")";
        }
        if (!code.isBlank()) {
            return name + " (" + code + ")";
        }
        return name;
    }

    private static String formatVersionOnlyLabel(TemplateVersionEntity version) {
        String versionLabel = version.getVersionNo() != null ? "v" + version.getVersionNo() : "版本";
        return versionLabel + " · " + formatStatusLabel(version.getStatus());
    }

    private static String formatVersionLabel(TemplatesEntity template, TemplateVersionEntity version) {
        return formatTemplateLabel(template) + " / " + formatVersionOnlyLabel(version);
    }

    private static String formatStatusLabel(String status) {
        if (status == null || status.isBlank()) {
            return "未知";
        }
        return switch (status) {
            case "DRAFT" -> "草稿";
            case "PUBLISHED" -> "已发布";
            case "ARCHIVED" -> "已归档";
            default -> status;
        };
    }
}
