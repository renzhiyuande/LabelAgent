package com.labelhub.infra.persistence.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface AsyncTaskMapper extends BaseMapper<AsyncTaskEntity> {
}
