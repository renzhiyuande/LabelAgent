package com.labelhub.infra.persistence.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.labelhub.infra.persistence.entity.ExportJobEntity;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ExportJobMapper extends BaseMapper<ExportJobEntity> {
}
