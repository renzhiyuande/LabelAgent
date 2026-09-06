package com.labelhub.infra.business.review.support;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.labelhub.core.error.BusinessException;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class ReviewerReviewLevelAccessTest {

    private final ReviewerReviewLevelAccess access = new ReviewerReviewLevelAccess();

    private List<ReviewWorkflowLevel> threeLevels() {
        return List.of(
                new ReviewWorkflowLevel("L1", "初审", List.of("approve")),
                new ReviewWorkflowLevel("L2", "复审", List.of("approve")),
                new ReviewWorkflowLevel("L3", "终审", List.of("approve")));
    }

    @Test
    void workbenchOnly_isUnrestricted() {
        assertTrue(access.hasUnrestrictedLevels(Set.of("business:reviewer:workbench")));
        assertEquals(3, access.filterAccessibleLevels(threeLevels(), Set.of("business:reviewer:workbench")).size());
    }

    @Test
    void levelGrants_filterWorkflow() {
        Set<String> perms = Set.of("business:reviewer:workbench", "business:reviewer:level:L2");
        assertFalse(access.hasUnrestrictedLevels(perms));
        List<ReviewWorkflowLevel> filtered = access.filterAccessibleLevels(threeLevels(), perms);
        assertEquals(1, filtered.size());
        assertEquals("L2", filtered.getFirst().key());
    }

    @Test
    void requireLevelAccess_deniesMissingGrant() {
        Set<String> perms = Set.of("business:reviewer:level:L1");
        assertThrows(BusinessException.class, () -> access.requireLevelAccess("L3", perms));
    }

    @Test
    void admin_isUnrestricted() {
        assertTrue(access.hasUnrestrictedLevels(Set.of("system:admin", "business:reviewer:level:L1")));
    }
}
