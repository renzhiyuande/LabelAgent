package com.labelhub.infra.business.display.assembler;

import cn.crane4j.core.support.Crane4jTemplate;
import com.labelhub.core.business.BusinessDtos.AssignmentSummary;
import com.labelhub.core.business.BusinessDtos.SubmissionSummary;
import com.labelhub.infra.business.display.fill.RewardCalcBasisDisplayFill;
import com.labelhub.infra.business.display.support.RewardCalcBasisIdResolver;
import com.labelhub.infra.business.display.support.RewardCalcBasisIdResolver.ResolvedCalcBasisIds;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.entity.RewardSettlementDetailEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.SubmissionVersionEntity;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.persistence.mapper.SubmissionVersionMapper;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class RewardDetailDisplayAssembler {
    private final Crane4jTemplate crane4jTemplate;
    private final RewardCalcBasisIdResolver calcBasisIdResolver;
    private final SubmissionSummaryAssembler submissionSummaryAssembler;
    private final AssignmentSummaryAssembler assignmentSummaryAssembler;
    private final SubmissionMapper submissionMapper;
    private final AssignmentMapper assignmentMapper;
    private final SubmissionVersionMapper submissionVersionMapper;

    public RewardDetailDisplayAssembler(
            Crane4jTemplate crane4jTemplate,
            RewardCalcBasisIdResolver calcBasisIdResolver,
            SubmissionSummaryAssembler submissionSummaryAssembler,
            AssignmentSummaryAssembler assignmentSummaryAssembler,
            SubmissionMapper submissionMapper,
            AssignmentMapper assignmentMapper,
            SubmissionVersionMapper submissionVersionMapper) {
        this.crane4jTemplate = crane4jTemplate;
        this.calcBasisIdResolver = calcBasisIdResolver;
        this.submissionSummaryAssembler = submissionSummaryAssembler;
        this.assignmentSummaryAssembler = assignmentSummaryAssembler;
        this.submissionMapper = submissionMapper;
        this.assignmentMapper = assignmentMapper;
        this.submissionVersionMapper = submissionVersionMapper;
    }

    public CalcBasisDisplayLabels assembleCalcBasisLabels(RewardSettlementDetailEntity detail) {
        if (detail == null) {
            return CalcBasisDisplayLabels.empty();
        }
        ResolvedCalcBasisIds ids = calcBasisIdResolver.resolve(detail);
        String taskTitle = resolveTaskTitle(ids.taskId());
        String submissionLabel = resolveSubmissionLabel(ids.submissionId());
        String submissionVersionLabel = resolveSubmissionVersionLabel(ids.submissionVersionId());
        String assignmentLabel = resolveAssignmentLabel(ids.assignmentId());
        return new CalcBasisDisplayLabels(taskTitle, submissionLabel, submissionVersionLabel, assignmentLabel);
    }

    private String resolveTaskTitle(Long taskId) {
        if (taskId == null) {
            return null;
        }
        RewardCalcBasisDisplayFill fill = new RewardCalcBasisDisplayFill();
        fill.setTaskId(taskId);
        crane4jTemplate.execute(List.of(fill));
        return blankToNull(fill.getTaskTitle());
    }

    private String resolveSubmissionLabel(Long submissionId) {
        if (submissionId == null) {
            return null;
        }
        SubmissionEntity entity = submissionMapper.selectById(submissionId);
        if (entity == null || entity.getDeletedFlag() != null && entity.getDeletedFlag() == 1) {
            return null;
        }
        SubmissionSummary summary = submissionSummaryAssembler.assemble(entity);
        if (summary == null) {
            return null;
        }
        String sourceItemKey = blankToNull(summary.sourceItemKey());
        String status = blankToNull(summary.status());
        if (sourceItemKey != null && status != null) {
            return sourceItemKey + " · " + status;
        }
        if (sourceItemKey != null) {
            return sourceItemKey;
        }
        if (status != null) {
            return status;
        }
        return null;
    }

    private String resolveSubmissionVersionLabel(Long submissionVersionId) {
        if (submissionVersionId == null) {
            return null;
        }
        SubmissionVersionEntity version = submissionVersionMapper.selectById(submissionVersionId);
        if (version == null || version.getDeletedFlag() != null && version.getDeletedFlag() == 1) {
            return null;
        }
        if (version.getRoundNo() != null && version.getRoundNo() > 0) {
            return "第" + version.getRoundNo() + "轮提交";
        }
        return "提交版本";
    }

    private String resolveAssignmentLabel(Long assignmentId) {
        if (assignmentId == null) {
            return null;
        }
        AssignmentEntity entity = assignmentMapper.selectById(assignmentId);
        if (entity == null || entity.getDeletedFlag() != null && entity.getDeletedFlag() == 1) {
            return null;
        }
        AssignmentSummary summary = assignmentSummaryAssembler.assemble(entity);
        if (summary == null) {
            return null;
        }
        String sourceItemKey = blankToNull(summary.sourceItemKey());
        if (summary.slotNo() != null && sourceItemKey != null) {
            return "槽位" + summary.slotNo() + " · " + sourceItemKey;
        }
        if (sourceItemKey != null) {
            return sourceItemKey;
        }
        if (summary.slotNo() != null) {
            return "槽位" + summary.slotNo();
        }
        return null;
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    public record CalcBasisDisplayLabels(
            String taskTitle,
            String submissionLabel,
            String submissionVersionLabel,
            String assignmentLabel) {
        public static CalcBasisDisplayLabels empty() {
            return new CalcBasisDisplayLabels(null, null, null, null);
        }
    }
}
