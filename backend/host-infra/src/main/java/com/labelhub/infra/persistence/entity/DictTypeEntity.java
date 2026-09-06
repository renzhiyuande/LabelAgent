package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
@TableName("sys_dict_types")
public class DictTypeEntity extends AbstractEntity {
    private String dictCode;
    private String dictName;
    private String status;
    private String remark;
}
