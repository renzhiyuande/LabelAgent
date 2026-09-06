package com.labelhub.core.lowcode;

import com.labelhub.core.system.SystemDtos.DictTypeSummary;
import com.labelhub.core.system.SystemDtos.RoleSummary;
import com.labelhub.core.system.SystemDtos.UserSummary;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public final class LowCodeDtos {
    private LowCodeDtos() {
    }

    public record SortRule(@NotBlank String field, @NotBlank String order) {
    }

    public record FilterRule(@NotBlank String field, @NotBlank String op, Object value) {
    }

    public record ListQuery(
            @Min(1) int page,
            @Min(1) int pageSize,
            List<SortRule> sort,
            List<FilterRule> filters) {

        public int normalizedPage() {
            return page <= 0 ? 1 : page;
        }

        public int normalizedPageSize() {
            if (pageSize <= 0) {
                return 10;
            }
            return Math.min(pageSize, 100);
        }
    }

    public record OptionItem(String label, Object value, String className, String tone) {
        public OptionItem(String label, Object value) {
            this(label, value, null, null);
        }
    }

    public record TreeOptionItem(String label, Object value, List<TreeOptionItem> children) {
        public TreeOptionItem(String label, Object value) {
            this(label, value, List.of());
        }
    }

    public record OptionSourceItem(String key, String label) {
    }

    public record ResourceRegistryItem(
            String resource,
            String label,
            Class<?> summaryType,
            List<String> supportedActions) {
    }

    public record BatchActionCommand(@NotEmpty List<@NotNull @Min(1) Long> ids) {
    }
}
