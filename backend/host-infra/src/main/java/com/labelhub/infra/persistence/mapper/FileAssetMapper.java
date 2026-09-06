package com.labelhub.infra.persistence.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.labelhub.infra.persistence.entity.FileAssetEntity;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface FileAssetMapper extends BaseMapper<FileAssetEntity> {
}
