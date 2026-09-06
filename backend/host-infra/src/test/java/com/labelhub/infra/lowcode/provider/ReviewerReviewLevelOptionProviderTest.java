package com.labelhub.infra.lowcode.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.labelhub.core.business.BusinessDtos.AuditPoolLevelCount;
import com.labelhub.core.business.ReviewerWorkbenchService;
import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.core.lowcode.OptionRequest;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ReviewerReviewLevelOptionProviderTest {

    @Mock
    private ReviewerWorkbenchService reviewerWorkbenchService;

    @InjectMocks
    private ReviewerReviewLevelOptionProvider provider;

    @Test
    void optionsWithoutTaskIdUsesAggregatedLevels() {
        when(reviewerWorkbenchService.listReviewLevelOptions(null))
                .thenReturn(List.of(
                        new AuditPoolLevelCount("L1", "初审", 1, false, 0),
                        new AuditPoolLevelCount("L2", "质量复审", 2, true, 0)));

        List<OptionItem> options = provider.options(OptionRequest.of(Map.of()));

        assertThat(options).extracting(OptionItem::label, OptionItem::value)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("初审", "L1"),
                        org.assertj.core.groups.Tuple.tuple("质量复审", "L2"));
    }

    @Test
    void optionsWithTaskIdLoadsTaskWorkflowLevels() {
        when(reviewerWorkbenchService.listReviewLevelOptions(42L))
                .thenReturn(List.of(
                        new AuditPoolLevelCount("L1", "一审", 1, false, 0)));

        List<OptionItem> options = provider.options(OptionRequest.of(Map.of("taskId", "42")));

        assertThat(options).hasSize(1);
        assertThat(options.getFirst().label()).isEqualTo("一审");
        assertThat(options.getFirst().value()).isEqualTo("L1");
    }
}
