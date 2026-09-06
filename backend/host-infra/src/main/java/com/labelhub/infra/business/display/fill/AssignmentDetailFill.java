package com.labelhub.infra.business.display.fill;

import java.util.Map;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class AssignmentDetailFill extends AssignmentSummaryFill {
    private String claimSource;
    private Integer currentRoundNo;
    private Map<String, Object> extJson;
}
