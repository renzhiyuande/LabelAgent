package com.labelhub.core.business.reward;

import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.schema.LhSchemaComponent;
import com.labelhub.core.lowcode.schema.LhSchemaField;
import com.labelhub.core.lowcode.schema.LhSchemaOption;
import com.labelhub.core.lowcode.schema.LhSchemaRoot;
import com.labelhub.core.lowcode.schema.LhSchemaRule;
import com.labelhub.core.lowcode.schema.LhSchemaSection;
import com.labelhub.core.lowcode.schema.LhSchemaSections;
import java.math.BigDecimal;
import java.util.Map;

@LhSchemaRoot(
        namespace = RewardRuleSchemas.NAMESPACE,
        key = FixedBonusRewardRuleConfig.MODE,
        label = "固定金额计奖",
        title = "奖励规则配置",
        description = "每条命中记录发放固定金额，可用于活动补贴等场景。",
        permissions = {
                "system:admin",
                "business:task:read",
                "business:task:create",
                "business:task:update",
                "business:labeler:workbench"
        })
@LhSchemaSections(@LhSchemaSection(key = "basic", title = "基础配置"))
public record FixedBonusRewardRuleConfig(
        @LhSchemaField(
                sectionKey = "basic",
                label = "币种",
                component = LhSchemaComponent.SELECT,
                defaultValue = "CNY",
                options = {
                    @LhSchemaOption(label = "人民币 CNY", value = "CNY"),
                    @LhSchemaOption(label = "美元 USD", value = "USD")
                })
        String currency,
        @LhSchemaField(
                sectionKey = "basic",
                label = "结算单位",
                jsonKey = "settle_unit",
                component = LhSchemaComponent.SELECT,
                defaultValue = "SUBMISSION",
                readonly = true,
                options = @LhSchemaOption(label = "按提交计奖", value = "SUBMISSION"),
                description = "当前规则按提交维度生成奖励明细。")
        String settleUnit,
        @LhSchemaField(
                sectionKey = "basic",
                label = "固定奖励金额",
                jsonKey = "base_amount",
                component = LhSchemaComponent.NUMBER,
                required = true,
                defaultValue = "0",
                description = "每条命中记录发放的固定金额。",
                rules = @LhSchemaRule(type = "min", value = "0", message = "奖励金额不能小于 0"))
        BigDecimal baseAmount) {

    public static final String MODE = "FIXED_BONUS";

    public static FixedBonusRewardRuleConfig from(Map<String, Object> json) {
        if (json == null || json.isEmpty()) {
            return defaults();
        }
        FixedBonusRewardRuleConfig defaults = defaults();
        return new FixedBonusRewardRuleConfig(
                readString(json.get("currency"), defaults.currency()),
                readString(json.get("settle_unit"), defaults.settleUnit()),
                readBaseAmount(json.get("base_amount"), defaults.baseAmount()));
    }

    public static FixedBonusRewardRuleConfig defaults() {
        return new FixedBonusRewardRuleConfig("CNY", "SUBMISSION", BigDecimal.ZERO);
    }

    public BigDecimal requireBaseAmount() {
        if (baseAmount == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "奖励规则缺少 base_amount");
        }
        return baseAmount;
    }

    private static String readString(Object value, String fallback) {
        if (value == null) {
            return fallback;
        }
        String text = value.toString().trim();
        return text.isEmpty() ? fallback : text;
    }

    private static BigDecimal readBaseAmount(Object value, BigDecimal fallback) {
        if (value == null) {
            return fallback;
        }
        try {
            return new BigDecimal(value.toString());
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }
}
