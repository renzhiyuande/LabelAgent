package com.labelhub.core.business.distribute;

/**
 * 任务分发策略 SPI。主程序在发布、领取两个关键点委托本接口，策略实现可插拔扩展，
 * 不修改主流程与主状态机（对齐 functional-design §7.11 AssignmentStrategy 扩展点）。
 *
 * <p>内置实现：FIRST_COME / QUOTA / ASSIGN（host-infra）。第三方可新增 code 实现 Bean 接入。
 */
public interface TaskDistributeStrategy {
    /** 策略编码，对应 {@code tasks.distribute_strategy}。 */
    String code();

    /** 展示名称，供低代码下拉与管理界面使用。 */
    default String label() {
        return code();
    }

    /** 发布编排：决定是否预生成 assignment（题目是否进广场）。 */
    void onPublish(DistributePublishContext ctx);

    /** 领取门禁：不允许领取时抛 BusinessException。 */
    void checkClaimable(DistributeClaimContext ctx);
}
