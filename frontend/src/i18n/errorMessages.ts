/**
 * 后端业务错误码 → 中文/英文 翻译表
 *
 * key 是 ErrorCode.errCode() 返回的值（如 "AUTH_001"），
 * 非 ErrorCode enum name（如 "AUTH_UNAUTHENTICATED"），
 * 避免 Java 枚举重构影响前端。
 *
 * 查不到的 code fallback 到后端原始 message（英文兜底）。
 */
export const errorMessages: Record<string, { zh: string; en: string }> = {
  // ========== 认证 ==========
  AUTH_001: { zh: '认证失败，请重新登录', en: 'Authentication is required' },
  AUTH_002: { zh: '无权限执行此操作', en: 'Permission denied' },
  AUTH_003: { zh: '用户名或密码错误', en: 'Invalid username or password' },
  AUTH_004: { zh: 'Token 无效或已过期', en: 'Invalid or expired token' },
  AUTH_005: { zh: 'Token 已过期', en: 'Token has expired' },
  AUTH_006: { zh: 'Refresh Token 无效', en: 'Refresh token is invalid' },
  AUTH_007: { zh: 'Refresh Token 已过期', en: 'Refresh token has expired' },
  AUTH_008: { zh: '账号已被禁用', en: 'User account has been disabled' },
  AUTH_009: { zh: '账号已被锁定', en: 'User account has been locked' },
  AUTH_010: { zh: '用户不存在', en: 'User not found' },
  AUTH_011: { zh: '用户已存在', en: 'User already exists' },
  AUTH_012: { zh: '密码错误', en: 'Password is wrong' },
  AUTH_013: { zh: '登录尝试次数过多，请稍后再试', en: 'Too many wrong password attempts, please try again later' },
  AUTH_014: { zh: '新密码与确认密码不一致', en: 'New password and confirm password do not match' },
  AUTH_015: { zh: '新密码不能与旧密码相同', en: 'New password cannot be the same as the old one' },
  AUTH_016: { zh: '密码不符合复杂度要求', en: 'Password does not meet complexity requirements' },
  AUTH_017: { zh: '密码已过期，请修改密码', en: 'Password has expired, please change it' },
  AUTH_018: { zh: '您的账号已在其他地方登录', en: 'Your account has been logged in elsewhere' },

  // ========== 角色 ==========
  ROLE_001: { zh: '角色不存在', en: 'Role not found' },
  ROLE_002: { zh: '角色已存在', en: 'Role already exists' },
  ROLE_003: { zh: '不允许操作超级管理员角色', en: 'Not allowed to operate super admin role' },
  ROLE_004: { zh: '角色已关联用户，无法删除', en: 'Role is associated with users, cannot be deleted' },
  ROLE_005: { zh: '角色编码已存在', en: 'Role code already exists' },

  // ========== 权限 ==========
  PERM_001: { zh: '权限不存在', en: 'Permission not found' },
  PERM_002: { zh: '权限已存在', en: 'Permission already exists' },
  PERM_003: { zh: '权限编码已存在', en: 'Permission code already exists' },
  PERM_004: { zh: '权限已关联角色，无法删除', en: 'Permission is associated with roles, cannot be deleted' },
  PERM_005: { zh: '系统权限不能删除', en: 'System permission cannot be deleted' },

  // ========== 菜单 ==========
  MENU_001: { zh: '菜单不存在', en: 'Menu not found' },
  MENU_002: { zh: '菜单已存在', en: 'Menu already exists' },
  MENU_003: { zh: '父菜单不存在', en: 'Parent menu not found' },
  MENU_004: { zh: '不能将子菜单设置为父菜单', en: 'Cannot set child menu as parent' },
  MENU_005: { zh: '菜单已关联角色，无法删除', en: 'Menu is associated with roles, cannot be deleted' },

  // ========== 字典 ==========
  DICT_001: { zh: '字典不存在', en: 'Dict not found' },
  DICT_002: { zh: '字典类型不存在', en: 'Dict type not found' },
  DICT_003: { zh: '字典类型已存在', en: 'Dict type already exists' },
  DICT_004: { zh: '字典类型编码已存在', en: 'Dict type code already exists' },

  // ========== 数据权限 ==========
  DSCOPE_001: { zh: '数据权限策略不存在', en: 'Data scope policy not found' },
  DSCOPE_002: { zh: '不允许修改该数据权限策略', en: 'Not allowed to modify this data scope policy' },

  // ========== 系统客户端 ==========
  CLIENT_001: { zh: '系统客户端不存在', en: 'System client not found' },
  CLIENT_002: { zh: '系统客户端已存在', en: 'System client already exists' },
  CLIENT_003: { zh: '客户端密钥错误', en: 'Client secret is wrong' },
  CLIENT_004: { zh: '系统客户端已被禁用', en: 'System client has been disabled' },

  // ========== 内部认证 ==========
  INTERNAL_001: { zh: '内部 Token 无效', en: 'Internal token is invalid' },

  // ========== 资源 ==========
  RES_001: { zh: '资源不存在', en: 'Resource not found' },
  RES_002: { zh: '资源冲突', en: 'Resource conflict' },
  RES_003: { zh: '资源已存在', en: 'Resource already exists' },

  // ========== 通用 ==========
  COMMON_001: { zh: '操作无效', en: 'Invalid operation' },
  COMMON_002: { zh: '参数校验失败', en: 'Request validation failed' },
  COMMON_003: { zh: '缺少幂等键（Idempotency-Key）', en: 'Idempotency-Key is required' },
  COMMON_004: { zh: '重复请求，请稍后重试', en: 'Duplicate request, please try again later' },
  COMMON_005: { zh: '不允许的操作', en: 'Operation is not allowed' },
  COMMON_011: { zh: '定时任务不存在', en: 'Scheduled task not found' },
  COMMON_012: { zh: '无效的 cron 表达式', en: 'Invalid cron expression' },
  COMMON_013: { zh: '无效的统计日期区间', en: 'Invalid statistics date range' },
  COMMON_014: { zh: '申诉已被处理', en: 'Appeal has already been decided' },
  COMMON_015: { zh: '表单 Schema 校验失败', en: 'Form schema validation failed' },

  // ========== 异步任务 ==========
  ASYNC_001: { zh: '异步任务不存在', en: 'Async task not found' },
  ASYNC_002: { zh: '异步任务状态异常', en: 'Async task status error' },

  // ========== 任务 ==========
  TASK_001: { zh: '任务不存在', en: 'Task not found' },
  TASK_010: { zh: '任务成员不存在', en: 'Task member not found' },
  TASK_011: { zh: '该用户已是任务成员', en: 'Task member already exists' },
  TASK_002: { zh: '任务状态无效', en: 'Task status invalid' },
  TASK_003: { zh: '任务不是草稿状态', en: 'Task is not in draft status' },
  TASK_004: { zh: '任务已发布', en: 'Task has already been published' },
  TASK_005: { zh: '无权限操作此任务', en: 'No permission to operate this task' },
  TASK_006: { zh: '任务模板未就绪', en: 'Task template is not ready' },
  TASK_007: { zh: '任务编码已存在，请更换后重试', en: 'Task code already exists' },

  // ========== 模板 ==========
  TMPL_001: { zh: '模板不存在', en: 'Template not found' },
  TMPL_002: { zh: '模板状态无效', en: 'Template status invalid' },
  TMPL_003: { zh: '模板不是草稿状态', en: 'Template is not in draft status' },
  TMPL_004: { zh: '模板编码已存在', en: 'Template code already exists' },

  // ========== 模板市场 ==========
  MKT_001: { zh: '市场模板不存在', en: 'Market template not found' },
  MKT_002: { zh: '市场模板已安装', en: 'Market template already installed' },
  MKT_003: { zh: '模板安装编码冲突', en: 'Template install failed due to code conflict' },
  MKT_004: { zh: '市场模板无源版本', en: 'Market template has no source version' },
  MKT_005: { zh: '市场源版本不存在', en: 'Market source version not found' },
  MKT_006: { zh: '仅已审核通过的市场条目可发布', en: 'Only approved market entry can be published' },
  MKT_007: { zh: '模板版本未绑定到模板', en: 'Template version is not bound to template' },

  // ========== 提交/分配 ==========
  SUBM_001: { zh: '提交记录不存在', en: 'Submission not found' },
  SUBM_002: { zh: '提交状态无效', en: 'Submission status invalid' },
  SUBM_003: { zh: '分配记录不存在', en: 'Assignment not found' },
  SUBM_004: { zh: '分配状态无效', en: 'Assignment status invalid' },
  SUBM_005: { zh: '状态流转不允许', en: 'State transition not allowed' },
  ASGN_001: { zh: '项目 ID 不能为空', en: 'Item IDs must not be empty' },
  ASGN_002: { zh: '任务项目不存在', en: 'Task item not found' },
  ASGN_003: { zh: '认领锁定失败，请重试', en: 'Claim lock failed, please retry' },
  ASGN_004: { zh: '认领锁定超时，请重试', en: 'Claim lock timed out, please retry' },

  // ========== 认领 ==========
  CLAIM_001: { zh: '已达到每人最大认领数量', en: 'Reached max claim per user for this task' },
  CLAIM_002: { zh: '认领数量必须为正整数', en: 'Claim count must be a positive integer' },
  CLAIM_003: { zh: '该任务暂无可用项目可认领', en: 'No available items to claim for this task' },
  CLAIM_004: { zh: '任务分配策略不允许市场认领', en: 'Task distribution strategy forbids market claim' },
  CLAIM_005: { zh: '该任务需要认领 Token', en: 'This task requires a claim token to claim' },
  CLAIM_006: { zh: '不支持的分配策略', en: 'Distribute strategy is not supported' },
  CLAIM_007: { zh: '任务分配策略不是配额模式', en: 'Task distribution strategy is not QUOTA' },

  // ========== 认领 Token ==========
  CTOKEN_001: { zh: '认领 Token 无效', en: 'Claim token is invalid' },
  CTOKEN_002: { zh: '认领 Token 已过期', en: 'Claim token has expired' },
  CTOKEN_003: { zh: '认领 Token 已被使用', en: 'Claim token has already been used' },
  CTOKEN_004: { zh: '不支持的认领 Token 场景', en: 'Claim token scene is not supported' },
  CTOKEN_005: { zh: '认领 Token 不属于当前用户', en: 'Claim token does not belong to current user' },
  CTOKEN_006: { zh: '认领库存不足', en: 'Not enough claimable items for reservation' },
  CTOKEN_007: { zh: '该任务认领库存未初始化', en: 'Claim stock is not initialized for this task' },

  // ========== 导出 ==========
  EXPORT_001: { zh: '导出任务不存在', en: 'Export job not found' },
  EXPORT_002: { zh: '不支持的导出格式', en: 'Export format is not supported' },
  EXPORT_003: { zh: '导出任务未完成或结果文件缺失', en: 'Export job is not finished or result file is missing' },
  EXPORT_004: { zh: '导出结果文件不存在或已被清理', en: 'Export result file does not exist or has been cleaned up' },

  // ========== 结算 ==========
  REWARD_001: { zh: '结算批次不存在', en: 'Reward settlement batch not found' },
  REWARD_002: { zh: '结算批次状态不合法', en: 'Reward settlement batch status invalid for this operation' },
  REWARD_003: { zh: '不支持的奖励规则模式', en: 'Reward rule mode is not supported' },
  REWARD_004: { zh: '奖励规则缺少 base_amount', en: 'Reward rule is missing base_amount' },
  REWARD_005: { zh: '奖励规则 base_amount 无效', en: 'Reward rule base_amount is invalid' },

  // ========== 验收 ==========
  ACPT_001: { zh: '验收记录不存在', en: 'Acceptance record not found' },
  ACPT_002: { zh: '验收状态不合法', en: 'Acceptance status invalid for this operation' },
  ACPT_003: { zh: '验收样本不存在', en: 'Acceptance sample not found' },
  ACPT_011: { zh: '验收单已确认', en: 'Acceptance has already been confirmed' },
  ACPT_012: { zh: '验收结果必须为 PASS 或 FAIL', en: 'Acceptance decision must be PASS or FAIL' },
  ACPT_013: { zh: '仅抽样中或重开状态可确认', en: 'Only sampling or reopened acceptance can be confirmed' },
  ACPT_014: { zh: '仅已确认验收单可重开', en: 'Only confirmed acceptance can be reopened' },

  // ========== 文件 ==========
  FILE_001: { zh: '对象存储不可用', en: 'Object storage is unavailable' },
  FILE_002: { zh: '文件访问被拒绝', en: 'File access denied' },
  FILE_003: { zh: '文件不存在', en: 'File not found' },
  FILE_004: { zh: '上传文件超过大小限制', en: 'Upload file size exceeds the allowed limit' },
  FILE_005: { zh: '文件上传失败', en: 'File upload failed' },

  // ========== LLM ==========
  LLM_001: { zh: 'LLM 提供商不存在', en: 'LLM provider not found' },
  LLM_002: { zh: 'LLM 模型不存在', en: 'LLM model not found' },
  LLM_003: { zh: 'LLM 提供商未配置 API Key', en: 'LLM provider API key is not configured' },
  LLM_004: { zh: 'LLM 提供商 API Key 无效或解密失败', en: 'LLM provider API key is invalid or decryption failed' },
  LLM_005: { zh: 'LLM 加密失败', en: 'LLM encryption failed' },
  LLM_006: { zh: 'LLM 解密失败', en: 'LLM decryption failed' },
  LLM_007: { zh: 'LLM 加密密钥未配置', en: 'LLM encryption key is not configured' },
  LLM_008: { zh: 'LLM baseUrl 未配置', en: 'LLM base URL is not configured' },
  LLM_009: { zh: 'LLM model 未配置', en: 'LLM model is not configured' },
  LLM_010: { zh: '模板 Schema 中未找到 LLM 字段', en: 'LLM field not found in template schema' },
  LLM_011: { zh: '未配置可用的 LLM 提供商与模型', en: 'No available LLM provider and model configured' },
  LLM_012: { zh: '平台未配置已发布的 LLM 模型', en: 'Platform has no published LLM model' },
  LLM_013: { zh: 'LLM 建议命令不能为空', en: 'LLM suggest command is required' },
  LLM_014: { zh: 'LLM Agent 返回空响应', en: 'LLM agent returned empty response' },
  LLM_015: { zh: 'LLM Agent 请求失败', en: 'LLM agent request failed' },
  LLM_016: { zh: 'LLM 对话失败', en: 'LLM chat failed' },
  LLM_017: { zh: 'LLM 返回空建议', en: 'LLM returned empty suggestion' },
  LLM_018: { zh: 'LLM 字段编码不能为空', en: 'LLM field code is required' },
  LLM_019: { zh: '需要分配 ID 或提交 ID', en: 'Assignment ID or submission ID is required' },
  LLM_020: { zh: '分配 ID 与提交不匹配', en: 'Assignment ID does not match submission' },
  LLM_021: { zh: '任务 ID 与分配不匹配', en: 'Task ID does not match assignment' },
  LLM_022: { zh: '模板版本 ID 与提交不匹配', en: 'Template version ID does not match submission' },
  LLM_023: { zh: '模板版本 ID 不能为空', en: 'Template version ID is required' },
  LLM_024: { zh: 'LLM 建议任务项不存在', en: 'LLM suggest task item not found' },

  // ========== 审核队列 ==========
  RVW_001: { zh: '不支持的队列操作', en: 'Unsupported queue action' },
  RVW_002: { zh: '审核池队列需要 scopeIds', en: 'Scope IDs is required for audit pool queue' },
  RVW_003: { zh: 'ScopeIds 超过限制', en: 'Scope IDs exceeds limit' },
  RVW_004: { zh: '批次大小超过限制', en: 'Batch size exceeds limit' },
  RVW_005: { zh: '批次操作不存在', en: 'Batch operation not found' },
  RVW_006: { zh: '审核意见不能为空', en: 'Review comment is required' },
  RVW_007: {
    zh: '同模板下尚无已发布版本的人工复核样本。请先发布模板、运行任务，并完成带评语的人工审核后再试',
    en: 'No reviewed submissions with AI and human comments are available under published versions of this template. Publish the template, run the task, and complete manual reviews first.',
  },

  // ========== 配额 ==========
  QUOTA_001: { zh: '仅配额模式任务可放量', en: 'Only QUOTA strategy tasks can be released' },

  // ========== 低代码引擎 ==========
  ENG_001: { zh: '不支持的批量操作', en: 'Unsupported bulk action' },
  ENG_002: { zh: '不支持的操作', en: 'Unsupported action' },
  ENG_003: { zh: '缺少筛选条件', en: 'Filter is required' },
  ENG_004: { zh: '该资源不支持树形选项', en: 'Tree options are not supported for this resource' },

  // ========== 系统 ==========
  SYS_001: { zh: '数据库操作失败', en: 'Database operation failed' },
  SYS_002: { zh: '缓存操作失败', en: 'Cache operation failed' },
  SYS_003: { zh: '系统配置错误', en: 'System configuration error' },
  SYS_004: { zh: '系统错误，请稍后重试', en: 'System error, please retry later' },
};
