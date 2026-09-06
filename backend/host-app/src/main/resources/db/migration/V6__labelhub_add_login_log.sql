CREATE TABLE IF NOT EXISTS sys_login_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    username VARCHAR(64) NOT NULL DEFAULT '' COMMENT '用户名',
    user_id BIGINT NULL COMMENT '关联用户ID',
    login_ip VARCHAR(50) NULL COMMENT '登录IP',
    login_location VARCHAR(255) NULL COMMENT '登录地点',
    browser VARCHAR(100) NULL COMMENT '浏览器',
    os VARCHAR(100) NULL COMMENT '操作系统',
    device_info VARCHAR(255) NULL COMMENT '设备信息',
    login_status TINYINT NOT NULL DEFAULT 0 COMMENT '登录状态 0成功 1失败',
    msg VARCHAR(255) NULL COMMENT '提示消息',
    login_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '登录时间',
    logout_time DATETIME NULL COMMENT '登出时间',
    INDEX idx_username (username),
    INDEX idx_login_time (login_time),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统登录日志表';
