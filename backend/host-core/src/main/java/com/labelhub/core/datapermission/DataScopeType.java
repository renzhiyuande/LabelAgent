package com.labelhub.core.datapermission;

public enum DataScopeType {
    ALL,
    CREATED_BY_ME,
    ASSIGNED_TO_ME,
    TASK_MEMBER,
    TASK_OWNER,
    REVIEWER,
    CUSTOM,
    /** 本人上传或公开素材（FILE 资源） */
    PUBLIC_OR_OWN
}
