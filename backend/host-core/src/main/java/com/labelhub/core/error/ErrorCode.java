package com.labelhub.core.error;

public enum ErrorCode {
    // ========== 认证 ==========
    AUTH_UNAUTHENTICATED(401, "AUTH_001", "Authentication is required"),
    AUTH_FORBIDDEN(403, "AUTH_002", "Permission denied"),
    AUTH_INVALID_CREDENTIALS(401, "AUTH_003", "Invalid username or password"),
    AUTH_INVALID_TOKEN(401, "AUTH_004", "Invalid or expired token"),
    AUTH_TOKEN_EXPIRED(401, "AUTH_005", "Token has expired"),
    AUTH_REFRESH_TOKEN_INVALID(401, "AUTH_006", "Refresh token is invalid"),
    AUTH_REFRESH_TOKEN_EXPIRED(401, "AUTH_007", "Refresh token has expired"),
    AUTH_USER_ACCOUNT_DISABLED(403, "AUTH_008", "User account has been disabled"),
    AUTH_USER_ACCOUNT_LOCKED(423, "AUTH_009", "User account has been locked"),
    AUTH_USER_NOT_FOUND(404, "AUTH_010", "User not found"),
    AUTH_USER_ALREADY_EXISTS(409, "AUTH_011", "User already exists"),
    AUTH_PASSWORD_WRONG(400, "AUTH_012", "Password is wrong"),
    AUTH_PASSWORD_WRONG_COUNT_LIMIT(429, "AUTH_013", "Too many wrong password attempts, please try again later"),
    AUTH_PASSWORD_MISMATCH(400, "AUTH_014", "New password and confirm password do not match"),
    AUTH_PASSWORD_SAME_AS_OLD(400, "AUTH_015", "New password cannot be the same as the old one"),
    AUTH_PASSWORD_COMPLEXITY_NOT_MEET(400, "AUTH_016", "Password does not meet complexity requirements"),
    AUTH_PASSWORD_EXPIRED(403, "AUTH_017", "Password has expired, please change it"),
    AUTH_SESSION_KICKED_OUT(401, "AUTH_018", "Your account has been logged in elsewhere"),

    // ========== 角色 ==========
    ROLE_NOT_FOUND(404, "ROLE_001", "Role not found"),
    ROLE_ALREADY_EXISTS(409, "ROLE_002", "Role already exists"),
    ROLE_NOT_ALLOW_OPERATE_ADMIN(403, "ROLE_003", "Not allowed to operate super admin role"),
    ROLE_ASSOCIATED_USERS(400, "ROLE_004", "Role is associated with users, cannot be deleted"),
    ROLE_CODE_DUPLICATE(409, "ROLE_005", "Role code already exists"),

    // ========== 权限 ==========
    PERMISSION_NOT_FOUND(404, "PERM_001", "Permission not found"),
    PERMISSION_ALREADY_EXISTS(409, "PERM_002", "Permission already exists"),
    PERMISSION_CODE_DUPLICATE(409, "PERM_003", "Permission code already exists"),
    PERMISSION_ASSOCIATED_ROLES(400, "PERM_004", "Permission is associated with roles, cannot be deleted"),
    PERMISSION_CANNOT_DELETE_SYSTEM(400, "PERM_005", "System permission cannot be deleted"),

    // ========== 菜单 ==========
    MENU_NOT_FOUND(404, "MENU_001", "Menu not found"),
    MENU_ALREADY_EXISTS(409, "MENU_002", "Menu already exists"),
    MENU_PARENT_NOT_FOUND(404, "MENU_003", "Parent menu not found"),
    MENU_PARENT_IS_CHILD(400, "MENU_004", "Cannot set child menu as parent"),
    MENU_ASSOCIATED_ROLES(400, "MENU_005", "Menu is associated with roles, cannot be deleted"),

    // ========== 字典 ==========
    DICT_NOT_FOUND(404, "DICT_001", "Dict not found"),
    DICT_TYPE_NOT_FOUND(404, "DICT_002", "Dict type not found"),
    DICT_TYPE_ALREADY_EXISTS(409, "DICT_003", "Dict type already exists"),
    DICT_TYPE_CODE_DUPLICATE(409, "DICT_004", "Dict type code already exists"),

    // ========== 数据权限 ==========
    DATA_SCOPE_POLICY_NOT_FOUND(404, "DSCOPE_001", "Data scope policy not found"),
    DATA_SCOPE_NOT_ALLOW_MODIFY(403, "DSCOPE_002", "Not allowed to modify this data scope policy"),

    // ========== 系统客户端 ==========
    SYSTEM_CLIENT_NOT_FOUND(404, "CLIENT_001", "System client not found"),
    SYSTEM_CLIENT_ALREADY_EXISTS(409, "CLIENT_002", "System client already exists"),
    SYSTEM_CLIENT_SECRET_MISMATCH(400, "CLIENT_003", "Client secret is wrong"),
    SYSTEM_CLIENT_DISABLED(403, "CLIENT_004", "System client has been disabled"),

    // ========== 内部认证 ==========
    INTERNAL_UNAUTHORIZED(401, "INTERNAL_001", "Internal token is invalid"),

    // ========== 资源 ==========
    RESOURCE_NOT_FOUND(404, "RES_001", "Resource not found"),
    RESOURCE_CONFLICT(409, "RES_002", "Resource conflict"),
    RESOURCE_ALREADY_EXISTS(409, "RES_003", "Resource already exists"),

    // ========== 通用 ==========
    INVALID_OPERATION(400, "COMMON_001", "Invalid operation"),
    VALIDATION_ERROR(400, "COMMON_002", "Request validation failed"),
    IDEMPOTENT_KEY_MISSING(400, "COMMON_003", "Idempotency-Key is required"),
    DUPLICATE_REQUEST(409, "COMMON_004", "Duplicate request, please try again later"),
    OPERATION_NOT_ALLOWED(403, "COMMON_005", "Operation is not allowed"),
    SCHEDULED_TASK_NOT_FOUND(404, "COMMON_011", "Scheduled task not found"),
    INVALID_CRON_EXPRESSION(400, "COMMON_012", "Invalid cron expression"),
    STATS_DATE_INVALID(400, "COMMON_013", "Invalid statistics date range"),
    APPEAL_ALREADY_DECIDED(400, "COMMON_014", "Appeal has already been decided"),
    FORM_SCHEMA_INVALID(400, "COMMON_015", "Form schema validation failed"),

    // ========== 异步任务 ==========
    ASYNC_TASK_NOT_FOUND(404, "ASYNC_001", "Async task not found"),
    ASYNC_TASK_STATUS_ERROR(400, "ASYNC_002", "Async task status error"),

    // ========== 任务 ==========
    TASK_NOT_FOUND(404, "TASK_001", "Task not found"),
    TASK_STATUS_INVALID(400, "TASK_002", "Task status invalid"),
    TASK_NOT_DRAFT(400, "TASK_003", "Task is not in draft status"),
    TASK_ALREADY_PUBLISHED(409, "TASK_004", "Task has already been published"),
    TASK_NO_PERMISSION(403, "TASK_005", "No permission to operate this task"),
    TASK_TEMPLATE_NOT_READY(400, "TASK_006", "Task template is not ready"),
    TASK_CODE_DUPLICATE(409, "TASK_007", "Task code already exists"),
    TASK_MEMBER_NOT_FOUND(404, "TASK_010", "Task member not found"),
    TASK_MEMBER_ALREADY_EXISTS(409, "TASK_011", "Task member already exists"),

    // ========== 模板 ==========
    TEMPLATE_NOT_FOUND(404, "TMPL_001", "Template not found"),
    TEMPLATE_STATUS_INVALID(400, "TMPL_002", "Template status invalid"),
    TEMPLATE_NOT_DRAFT(400, "TMPL_003", "Template is not in draft status"),
    TEMPLATE_CODE_DUPLICATE(409, "TMPL_004", "Template code already exists"),

    // ========== 模板市场 ==========
    MKT_TEMPLATE_NOT_FOUND(404, "MKT_001", "Market template not found"),
    MKT_ALREADY_INSTALLED(409, "MKT_002", "Market template already installed"),
    MKT_INSTALL_CODE_CONFLICT(409, "MKT_003", "Template install failed due to code conflict"),
    MKT_NO_SOURCE_VERSION(400, "MKT_004", "Market template has no source version"),
    MKT_SOURCE_VERSION_NOT_FOUND(404, "MKT_005", "Market source version not found"),
    MKT_ONLY_APPROVED_CAN_PUBLISH(400, "MKT_006", "Only approved market entry can be published"),
    MKT_VERSION_NOT_BOUND(400, "MKT_007", "Template version is not bound to template"),

    // ========== 提交/分配 ==========
    SUBMISSION_NOT_FOUND(404, "SUBM_001", "Submission not found"),
    SUBMISSION_STATUS_INVALID(400, "SUBM_002", "Submission status invalid"),
    ASSIGNMENT_NOT_FOUND(404, "SUBM_003", "Assignment not found"),
    ASSIGNMENT_STATUS_INVALID(400, "SUBM_004", "Assignment status invalid"),
    TRANSITION_INVALID(400, "SUBM_005", "State transition not allowed"),
    ASGN_ITEM_IDS_EMPTY(400, "ASGN_001", "Item IDs must not be empty"),
    ASGN_TASK_ITEM_NOT_FOUND(404, "ASGN_002", "Task item not found"),
    ASGN_CLAIM_LOCK_FAILED(409, "ASGN_003", "Claim lock failed, please retry"),
    ASGN_CLAIM_LOCK_TIMEOUT(409, "ASGN_004", "Claim lock timed out, please retry"),

    // ========== 认领（标注员） ==========
    LABELER_CLAIM_LIMIT_REACHED(409, "CLAIM_001", "Reached max claim per user for this task"),
    LABELER_CLAIM_COUNT_INVALID(400, "CLAIM_002", "Claim count must be a positive integer"),
    LABELER_CLAIM_NO_AVAILABLE_ITEMS(409, "CLAIM_003", "No available items to claim for this task"),
    LABELER_CLAIM_STRATEGY_FORBIDDEN(403, "CLAIM_004", "Task distribution strategy forbids market claim"),
    LABELER_CLAIM_TOKEN_REQUIRED(409, "CLAIM_005", "This task requires a claim token to claim"),
    DISTRIBUTE_STRATEGY_UNSUPPORTED(400, "CLAIM_006", "Distribute strategy is not supported"),
    TASK_STRATEGY_NOT_QUOTA(400, "CLAIM_007", "Task distribution strategy is not QUOTA"),

    // ========== 认领 Token ==========
    CLAIM_TOKEN_INVALID(400, "CTOKEN_001", "Claim token is invalid"),
    CLAIM_TOKEN_EXPIRED(410, "CTOKEN_002", "Claim token has expired"),
    CLAIM_TOKEN_ALREADY_USED(409, "CTOKEN_003", "Claim token has already been used"),
    CLAIM_TOKEN_SCENE_UNSUPPORTED(400, "CTOKEN_004", "Claim token scene is not supported"),
    CLAIM_TOKEN_USER_MISMATCH(403, "CTOKEN_005", "Claim token does not belong to current user"),
    CLAIM_TOKEN_STOCK_INSUFFICIENT(409, "CTOKEN_006", "Not enough claimable items for reservation"),
    CLAIM_TOKEN_STOCK_NOT_READY(409, "CTOKEN_007", "Claim stock is not initialized for this task"),

    // ========== 配额 ==========
    QUOTA_STRATEGY_ONLY(400, "QUOTA_001", "Only QUOTA strategy tasks can be released"),

    // ========== 审核队列 ==========
    RVW_UNSUPPORTED_QUEUE_ACTION(400, "RVW_001", "Unsupported queue action"),
    RVW_SCOPE_IDS_REQUIRED(400, "RVW_002", "Scope IDs is required for audit pool queue"),
    RVW_SCOPE_IDS_EXCEEDS_LIMIT(400, "RVW_003", "Scope IDs exceeds limit"),
    RVW_BATCH_SIZE_EXCEEDS_LIMIT(400, "RVW_004", "Batch size exceeds limit"),
    RVW_BATCH_NOT_FOUND(404, "RVW_005", "Batch operation not found"),
    RVW_COMMENT_REQUIRED(400, "RVW_006", "Review comment is required"),
    RVW_PROMPT_NO_HISTORY_CASES(
            400,
            "RVW_007",
            "No reviewed submissions with AI and human comments are available under published versions of this template. Publish the template, run the task, and complete manual reviews first."),

    // ========== 导出 ==========
    EXPORT_JOB_NOT_FOUND(404, "EXPORT_001", "Export job not found"),
    EXPORT_FORMAT_UNSUPPORTED(400, "EXPORT_002", "Export format is not supported"),
    EXPORT_NOT_READY(409, "EXPORT_003", "Export job is not finished or result file is missing"),
    EXPORT_FILE_MISSING(410, "EXPORT_004", "Export result file does not exist or has been cleaned up"),

    // ========== 结算 ==========
    REWARD_BATCH_NOT_FOUND(404, "REWARD_001", "Reward settlement batch not found"),
    REWARD_BATCH_STATUS_INVALID(400, "REWARD_002", "Reward settlement batch status invalid for this operation"),
    REWARD_RULE_MODE_UNSUPPORTED(400, "REWARD_003", "Reward rule mode is not supported"),
    REWARD_BASE_AMOUNT_MISSING(400, "REWARD_004", "Reward rule is missing base_amount"),
    REWARD_BASE_AMOUNT_INVALID(400, "REWARD_005", "Reward rule base_amount is invalid"),

    // ========== 验收 ==========
    ACCEPTANCE_NOT_FOUND(404, "ACPT_001", "Acceptance record not found"),
    ACCEPTANCE_STATUS_INVALID(400, "ACPT_002", "Acceptance status invalid for this operation"),
    ACCEPTANCE_SAMPLE_NOT_FOUND(404, "ACPT_003", "Acceptance sample not found"),
    ACPT_ALREADY_CONFIRMED(400, "ACPT_011", "Acceptance has already been confirmed"),
    ACPT_DECISION_INVALID(400, "ACPT_012", "Acceptance decision must be PASS or FAIL"),
    ACPT_STATUS_INVALID_FOR_CONFIRM(400, "ACPT_013", "Only sampling or reopened acceptance can be confirmed"),
    ACPT_STATUS_INVALID_FOR_REOPEN(400, "ACPT_014", "Only confirmed acceptance can be reopened"),

    // ========== LLM ==========
    LLM_PROVIDER_NOT_FOUND(404, "LLM_001", "LLM provider not found"),
    LLM_MODEL_NOT_FOUND(404, "LLM_002", "LLM model not found"),
    LLM_API_KEY_MISSING(400, "LLM_003", "LLM provider API key is not configured"),
    LLM_API_KEY_INVALID(400, "LLM_004", "LLM provider API key is invalid or decryption failed"),
    LLM_ENCRYPT_FAILED(500, "LLM_005", "LLM encryption failed"),
    LLM_DECRYPT_FAILED(500, "LLM_006", "LLM decryption failed"),
    LLM_ENCRYPTION_KEY_NOT_CONFIGURED(500, "LLM_007", "LLM encryption key is not configured"),
    LLM_BASE_URL_NOT_CONFIGURED(400, "LLM_008", "LLM base URL is not configured"),
    LLM_MODEL_NOT_CONFIGURED(400, "LLM_009", "LLM model is not configured"),
    LLM_FIELD_NOT_FOUND(404, "LLM_010", "LLM field not found in template schema"),
    LLM_NO_AVAILABLE_PROVIDER(400, "LLM_011", "No available LLM provider and model configured"),
    LLM_NO_PUBLISHED_MODEL(400, "LLM_012", "Platform has no published LLM model"),
    LLM_COMMAND_REQUIRED(400, "LLM_013", "LLM suggest command is required"),
    LLM_AGENT_EMPTY_RESPONSE(500, "LLM_014", "LLM agent returned empty response"),
    LLM_AGENT_REQUEST_FAILED(500, "LLM_015", "LLM agent request failed"),
    LLM_CHAT_FAILED(500, "LLM_016", "LLM chat failed"),
    LLM_SUGGEST_EMPTY(500, "LLM_017", "LLM returned empty suggestion"),
    LLM_FIELD_CODE_REQUIRED(400, "LLM_018", "LLM field code is required"),
    LLM_ASSIGNMENT_ID_REQUIRED(400, "LLM_019", "Assignment ID or submission ID is required"),
    LLM_ASSIGNMENT_MISMATCH(400, "LLM_020", "Assignment ID does not match submission"),
    LLM_TASK_MISMATCH(400, "LLM_021", "Task ID does not match assignment"),
    LLM_TEMPLATE_VERSION_MISMATCH(400, "LLM_022", "Template version ID does not match submission"),
    LLM_TEMPLATE_VERSION_REQUIRED(400, "LLM_023", "Template version ID is required"),
    LLM_TASK_ITEM_NOT_FOUND(404, "LLM_024", "LLM suggest task item not found"),

    // ========== 低代码引擎 ==========
    ENG_UNSUPPORTED_BULK_ACTION(400, "ENG_001", "Unsupported bulk action"),
    ENG_UNSUPPORTED_ACTION(400, "ENG_002", "Unsupported action"),
    ENG_FILTER_REQUIRED(400, "ENG_003", "Filter is required"),
    ENG_TREE_OPTIONS_NOT_SUPPORTED(400, "ENG_004", "Tree options are not supported for this resource"),

    // ========== 文件 ==========
    FILE_STORAGE_UNAVAILABLE(500, "FILE_001", "Object storage is unavailable"),
    FILE_ACCESS_DENIED(403, "FILE_002", "File access denied"),
    FILE_NOT_FOUND(404, "FILE_003", "File not found"),
    FILE_UPLOAD_TOO_LARGE(413, "FILE_004", "Upload file size exceeds the allowed limit"),
    FILE_UPLOAD_FAILED(500, "FILE_005", "File upload failed"),

    // ========== 系统 ==========
    DATABASE_OPERATION_FAILED(500, "SYS_001", "Database operation failed"),
    CACHE_OPERATION_FAILED(500, "SYS_002", "Cache operation failed"),
    SYSTEM_CONFIG_ERROR(500, "SYS_003", "System configuration error"),
    SYSTEM_ERROR(500, "SYS_004", "System error");

    private final int status;
    private final String code;
    private final String defaultMessage;

    ErrorCode(int status, String code, String defaultMessage) {
        this.status = status;
        this.code = code;
        this.defaultMessage = defaultMessage;
    }

    public int status() {
        return status;
    }

    public String errCode() {
        return code;
    }

    public String defaultMessage() {
        return defaultMessage;
    }
}
