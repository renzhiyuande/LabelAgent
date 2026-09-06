package com.labelhub.core.business;

import com.labelhub.core.business.BusinessDtos.CollaboratorProfile;
import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface UserVisibilityService {
    List<OptionItem> listVisibleCollaborators(
            Long viewerId,
            Set<String> viewerRoles,
            CollaboratorRole targetRole,
            String keyword,
            int limit);

    Optional<CollaboratorProfile> findVisibleCollaborator(
            Long viewerId,
            Set<String> viewerRoles,
            Long targetUserId,
            CollaboratorRole targetRole);
}
