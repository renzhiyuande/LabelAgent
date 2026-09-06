package com.labelhub.infra.business.display.fill;

import cn.crane4j.annotation.Assemble;
import cn.crane4j.annotation.Mapping;
import com.labelhub.infra.business.display.container.DisplayContainerNamespaces;
import lombok.Data;

@Data
public class RewardCalcBasisDisplayFill {
    @Assemble(
            container = DisplayContainerNamespaces.TASK,
            props = @Mapping(src = "title", ref = "taskTitle"))
    private Long taskId;

    private String taskTitle;
}
