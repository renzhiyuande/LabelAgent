package com.labelhub.core.business.distribute;

/** 发布编排上下文：策略据此决定是否预生成 assignment（preseed）。 */
public record DistributePublishContext(Long taskId) {
}
