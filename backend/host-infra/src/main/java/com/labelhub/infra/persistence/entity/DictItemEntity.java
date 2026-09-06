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
@TableName("sys_dict_items")
public class DictItemEntity extends AbstractEntity {
    private Long dictTypeId;
    private String itemCode;
    private String itemLabel;
    private String itemValue;
    private Integer sortNo;
    private Integer isDefault;
    private String status;
}
