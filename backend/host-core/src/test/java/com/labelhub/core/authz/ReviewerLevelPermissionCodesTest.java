package com.labelhub.core.authz;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

class ReviewerLevelPermissionCodesTest {

    @Test
    void exposesFiveLevelCodesAlignedWithFlyway() {
        assertEquals(5, ReviewerLevelPermissionCodes.MAX_LEVELS);
        assertEquals(
                List.of(
                        "business:reviewer:level:L1",
                        "business:reviewer:level:L2",
                        "business:reviewer:level:L3",
                        "business:reviewer:level:L4",
                        "business:reviewer:level:L5"),
                ReviewerLevelPermissionCodes.allCodes());
    }

    @Test
    void codeForLevelKeyAndDetection() {
        assertEquals("business:reviewer:level:L2", ReviewerLevelPermissionCodes.codeForLevelKey("L2"));
        assertTrue(ReviewerLevelPermissionCodes.isLevelPermission("business:reviewer:level:L3"));
        assertFalse(ReviewerLevelPermissionCodes.isLevelPermission("business:reviewer:workbench"));
    }
}
