package com.labelhub.infra.business.display.support;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.infra.persistence.entity.RewardSettlementDetailEntity;
import org.junit.jupiter.api.Test;

class RewardCalcBasisIdResolverTest {
    private final RewardCalcBasisIdResolver resolver = new RewardCalcBasisIdResolver(new ObjectMapper());

    @Test
    void resolvesIdsFromCalcBasisJsonWithRowFallback() throws Exception {
        RewardSettlementDetailEntity detail = new RewardSettlementDetailEntity();
        detail.setTaskId(910230000001L);
        detail.setSubmissionId(910238000001L);
        detail.setSubmissionVersionId(910239000001L);
        detail.setAssignmentId(910237000001L);
        detail.setCalcBasisJson("""
                {"taskId":910230000002,"submission_id":910238000002,"sampleId":"P0001"}
                """);

        var ids = resolver.resolve(detail);

        assertThat(ids.taskId()).isEqualTo(910230000002L);
        assertThat(ids.submissionId()).isEqualTo(910238000002L);
        assertThat(ids.submissionVersionId()).isEqualTo(910239000001L);
        assertThat(ids.assignmentId()).isEqualTo(910237000001L);
    }
}
