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
@TableName("sys_menus")
public class MenuEntity extends AbstractEntity {
    private String menuCode;
    private String menuName;
    private String menuType;
    private Long parentId;
    private String path;
    private String routeName;
    private String componentPath;
    private String redirectPath;
    private String icon;
    private String permissionCode;
    private Integer visibleFlag;
    private Integer disabledFlag;
    private Integer cacheFlag;
    private Integer affixFlag;
    private String externalLinkUrl;
    private String openMode;
    private Integer sortNo;
    private String status;
}
