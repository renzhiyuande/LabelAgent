package com.labelhub.infra.business.display.container;

import cn.crane4j.annotation.ContainerMethod;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.entity.ReviewRecordEntity;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.persistence.mapper.ReviewRecordMapper;
import java.util.Collection;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class BusinessDisplayContainers {
    private final AssignmentMapper assignmentMapper;
    private final ReviewRecordMapper reviewRecordMapper;

    public BusinessDisplayContainers(AssignmentMapper assignmentMapper, ReviewRecordMapper reviewRecordMapper) {
        this.assignmentMapper = assignmentMapper;
        this.reviewRecordMapper = reviewRecordMapper;
    }

    @ContainerMethod(
            namespace = DisplayContainerNamespaces.ASSIGNMENT,
            resultType = AssignmentEntity.class,
            resultKey = "id")
    public List<AssignmentEntity> listAssignmentsByIds(Collection<Long> ids) {
        return DisplayContainerBatchLoader.loadSoftDeleted(assignmentMapper, ids);
    }

    @ContainerMethod(
            namespace = DisplayContainerNamespaces.REVIEW_RECORD,
            resultType = ReviewRecordEntity.class,
            resultKey = "id")
    public List<ReviewRecordEntity> listReviewRecordsByIds(Collection<Long> ids) {
        return DisplayContainerBatchLoader.loadSoftDeleted(reviewRecordMapper, ids);
    }
}
