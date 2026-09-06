package com.labelhub.infra.lowcode.provider;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.business.BusinessDtos.TaskOptionRow;
import com.labelhub.core.business.BusinessDtos.TaskSummary;
import com.labelhub.core.business.ReviewerWorkbenchService;
import com.labelhub.core.business.TaskService;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TaskOptionProviderTest {

    @Mock
    private TaskService taskService;

    @Mock
    private ReviewerWorkbenchService reviewerWorkbenchService;

    @Mock
    private CurrentUserProvider currentUserProvider;

    @InjectMocks
    private TaskOptionProvider provider;

    @Test
    void optionsUsesReviewerAccessibleTasksWhenOnlyWorkbenchGranted() {
        when(currentUserProvider.currentUser()).thenReturn(reviewerUser());
        when(reviewerWorkbenchService.listAccessibleTaskOptions("demo"))
                .thenReturn(List.of(new TaskOptionRow(100L, "Demo Task", "TASK-DEMO")));

        List<OptionItem> options = provider.options("demo");

        assertEquals(1, options.size());
        assertEquals(100L, options.getFirst().value());
        assertEquals("Demo Task (TASK-DEMO)", options.getFirst().label());
        verify(reviewerWorkbenchService).listAccessibleTaskOptions("demo");
    }

    @Test
    void optionsUsesOwnerTaskListWhenTaskReadGranted() {
        when(currentUserProvider.currentUser()).thenReturn(ownerUser());
        when(taskService.listTasks(1, 100, "demo"))
                .thenReturn(PageResponse.of(1, 1, 100, List.of(
                        new TaskSummary(
                                200L,
                                1L,
                                "TASK-OWNER",
                                "Owner Task",
                                "GENERAL",
                                "ACTIVE",
                                "FIRST_COME",
                                1L,
                                "Owner",
                                10,
                                1,
                                null,
                                true,
                                true,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null))));

        List<OptionItem> options = provider.options("demo");

        assertEquals(1, options.size());
        assertEquals(200L, options.getFirst().value());
        verify(taskService).listTasks(1, 100, "demo");
    }

    @Test
    void requiredPermissionsIncludeReviewerWorkbench() {
        assertEquals(
                Set.of("business:task:read", "business:reviewer:workbench", "system:admin"),
                Set.of(provider.requiredPermissions()));
    }

    private static AuthenticatedUser reviewerUser() {
        return new AuthenticatedUser(
                1L, "reviewer", "Reviewer", Set.of("REVIEWER"), Set.of("business:reviewer:workbench"), List.of(), Set.of());
    }

    private static AuthenticatedUser ownerUser() {
        return new AuthenticatedUser(
                2L, "owner", "Owner", Set.of("OWNER"), Set.of("business:task:read"), List.of(), Set.of());
    }
}
