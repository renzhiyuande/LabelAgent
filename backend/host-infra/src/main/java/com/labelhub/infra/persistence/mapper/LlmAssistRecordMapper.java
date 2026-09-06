package com.labelhub.infra.persistence.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.labelhub.infra.persistence.entity.LlmAssistRecordEntity;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface LlmAssistRecordMapper extends BaseMapper<LlmAssistRecordEntity> {

    default LlmAssistRecordEntity findLatestBySubmissionAndField(Long submissionId, String fieldCode) {
        return selectOne(new LambdaQueryWrapper<LlmAssistRecordEntity>()
                .eq(LlmAssistRecordEntity::getSubmissionId, submissionId)
                .eq(LlmAssistRecordEntity::getFieldCode, fieldCode)
                .eq(LlmAssistRecordEntity::getStatus, "SUCCESS")
                .orderByDesc(LlmAssistRecordEntity::getInvokedAt)
                .last("LIMIT 1"));
    }
}
