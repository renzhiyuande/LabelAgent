-- P0 白盒跨系统最小 fixture（在 Flyway 迁移后执行）
-- 密码均为 admin123（与 V2 admin 相同 bcrypt）

INSERT INTO users (id, tenant_id, created_by, updated_by, username, password_hash, display_name, email, phone, status, register_source)
VALUES (11001, 1, 0, 0, 'labeler_001', '$2y$10$1RfoZFIzbXcHyq0LBGbloeddaFT.RswgBtOWxROPvGN4cdAL4ToTi', 'Labeler One', 'labeler@labelhub.local', '13800000001', 'ACTIVE', 'WEB')
ON DUPLICATE KEY UPDATE username = VALUES(username);

INSERT INTO user_roles (id, tenant_id, created_by, updated_by, user_id, role_id)
VALUES (31001, 1, 0, 0, 11001, 2003)
ON DUPLICATE KEY UPDATE user_id = VALUES(user_id);

INSERT INTO users (id, tenant_id, created_by, updated_by, username, password_hash, display_name, email, phone, status, register_source)
VALUES (11002, 1, 0, 0, 'lock_test_001', '$2y$10$1RfoZFIzbXcHyq0LBGbloeddaFT.RswgBtOWxROPvGN4cdAL4ToTi', 'Lock Test', 'lock@labelhub.local', '13800000002', 'ACTIVE', 'WEB')
ON DUPLICATE KEY UPDATE username = VALUES(username);

INSERT INTO user_roles (id, tenant_id, created_by, updated_by, user_id, role_id)
VALUES (31002, 1, 0, 0, 11002, 2003)
ON DUPLICATE KEY UPDATE user_id = VALUES(user_id);

INSERT INTO tasks (id, tenant_id, created_by, updated_by, task_code, owner_id, title, scene_code, status, distribute_strategy, quota, settings_json, published_at)
VALUES (15001, 1, 0, 0, 'P0_WB_TASK', 1001, 'P0 Whitebox Task', 'GENERAL', 'PUBLISHED', 'FIRST_COME', 10,
        '{"review":{"aiEnabled":true,"workflow":{"levels":[{"key":"L1","label":"初审","actions":["approve","reject","return"]}]}}}',
        CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO template_versions (id, tenant_id, created_by, updated_by, task_id, version_no, template_name, status, is_current, schema_json, schema_checksum, published_at)
VALUES (13001, 1, 0, 0, 15001, 1, 'P0 Whitebox Template v1', 'PUBLISHED', 1,
        '{"fields":[{"key":"label_text","label":"Label","type":"text","required":true}]}',
        'p0wbschemachecksum0000000000000000000000000000000000000001',
        CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE status = VALUES(status);

UPDATE tasks SET current_template_version_id = 13001 WHERE id = 15001;

INSERT INTO template_version_fields (id, tenant_id, created_by, updated_by, template_version_id, field_code, field_path, field_title, widget_type, value_type, is_required, sort_no)
VALUES (14001, 1, 0, 0, 13001, 'label_text', 'label_text', 'Label', 'text', 'string', 1, 1)
ON DUPLICATE KEY UPDATE field_code = VALUES(field_code);

INSERT INTO task_items (id, tenant_id, created_by, updated_by, task_id, seq_no, source_item_key, payload_json, item_status)
VALUES (16001, 1, 0, 0, 15001, 1, 'item-1', '{"prompt":"Choose A or B"}', 'ACTIVE')
ON DUPLICATE KEY UPDATE task_id = VALUES(task_id);

INSERT INTO task_members (id, tenant_id, created_by, updated_by, task_id, user_id, member_role, permission_set_json, status, joined_at)
VALUES (17001, 1, 0, 0, 15001, 11001, 'LABELER', '[]', 'ACTIVE', CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE task_id = VALUES(task_id);

INSERT INTO assignments (id, tenant_id, created_by, updated_by, task_id, item_id, slot_no, labeler_id, assign_type, claim_source, status, current_round_no, assigned_at, claimed_at)
VALUES (18001, 1, 0, 0, 15001, 16001, 1, 11001, 'MANUAL', 'MANUAL', 'CLAIMED', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO submissions (id, tenant_id, created_by, updated_by, assignment_id, task_id, item_id, labeler_id, current_template_version_id, current_round_no, current_status, is_current, version_no, draft_data_json)
VALUES (19001, 1, 0, 0, 18001, 15001, 16001, 11001, 13001, 1, 'DRAFT', 1, 1, '{"label_text":"draft"}')
ON DUPLICATE KEY UPDATE current_status = VALUES(current_status);

-- WB-XSYS-002: 终审奖励（人工审核中 → approve → reward_detail）
UPDATE tasks SET reward_rule_json = '{"base_amount":5.0,"currency":"CNY","mode":"PER_APPROVED","settle_unit":"SUBMISSION"}'
WHERE id = 15001;

INSERT INTO templates (id, tenant_id, created_by, updated_by, task_id, template_code, template_name, scene_code, current_template_version_id, latest_version_no, status)
VALUES (12001, 1, 0, 0, 15001, 'P0_WB_TPL', 'P0 Whitebox Template', 'GENERAL', 13001, 1, 'ACTIVE')
ON DUPLICATE KEY UPDATE task_id = VALUES(task_id);

UPDATE template_versions SET template_id = 12001 WHERE id = 13001;

INSERT INTO task_items (id, tenant_id, created_by, updated_by, task_id, seq_no, source_item_key, payload_json, item_status)
VALUES (16002, 1, 0, 0, 15001, 2, 'item-2', '{"prompt":"Reward path"}', 'ACTIVE')
ON DUPLICATE KEY UPDATE task_id = VALUES(task_id);

INSERT INTO assignments (id, tenant_id, created_by, updated_by, task_id, item_id, slot_no, labeler_id, assign_type, claim_source, status, current_round_no, assigned_at, claimed_at, closed_at)
VALUES (18002, 1, 0, 0, 15001, 16002, 1, 11001, 'MANUAL', 'MANUAL', 'SUBMITTED', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO submission_versions (id, tenant_id, created_by, updated_by, submission_id, assignment_id, task_id, item_id, labeler_id, round_no, template_version_id, submit_source, submit_data_json, submit_data_hash, submitted_at)
VALUES (19501, 1, 0, 0, 19002, 18002, 15001, 16002, 11001, 1, 13001, 'MANUAL', '{"label_text":"ready for approve"}', 'p0wbrewardpathsubmitdatahash00000000000000000000000000000001', CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE submission_id = VALUES(submission_id);

INSERT INTO submissions (id, tenant_id, created_by, updated_by, assignment_id, task_id, item_id, labeler_id, current_template_version_id, current_version_id, current_round_no, current_status, current_review_level, submit_count, last_submitted_at, is_current, version_no)
VALUES (19002, 1, 0, 0, 18002, 15001, 16002, 11001, 13001, 19501, 1, 'HUMAN_REVIEWING', 'L1', 1, CURRENT_TIMESTAMP(3), 1, 1)
ON DUPLICATE KEY UPDATE current_status = VALUES(current_status);

-- WB-XSYS-004: 申诉批准 → assignment 打回
INSERT INTO tasks (id, tenant_id, created_by, updated_by, task_code, owner_id, title, scene_code, status, distribute_strategy, quota, settings_json, published_at, current_template_version_id)
VALUES (15003, 1, 0, 0, 'P0_WB_APPEAL', 1001, 'P0 Appeal Task', 'GENERAL', 'PUBLISHED', 'FIRST_COME', 5,
        '{"review":{"aiEnabled":false,"workflow":{"levels":[{"key":"L1","label":"初审","actions":["approve","reject","return"]}]}},"submission":{"appeal":{"enabled":true,"maxAppealsPerSubmission":1,"appealWindowHours":72}}}',
        CURRENT_TIMESTAMP(3), 13001)
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO task_items (id, tenant_id, created_by, updated_by, task_id, seq_no, source_item_key, payload_json, item_status)
VALUES (16003, 1, 0, 0, 15003, 1, 'appeal-item-1', '{"prompt":"Appeal case"}', 'ACTIVE')
ON DUPLICATE KEY UPDATE task_id = VALUES(task_id);

INSERT INTO task_members (id, tenant_id, created_by, updated_by, task_id, user_id, member_role, permission_set_json, status, joined_at)
VALUES (17003, 1, 0, 0, 15003, 11001, 'LABELER', '[]', 'ACTIVE', CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE task_id = VALUES(task_id);

INSERT INTO assignments (id, tenant_id, created_by, updated_by, task_id, item_id, slot_no, labeler_id, assign_type, claim_source, status, current_round_no, assigned_at, claimed_at, closed_at)
VALUES (18003, 1, 0, 0, 15003, 16003, 1, 11001, 'MANUAL', 'MANUAL', 'SUBMITTED', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO submission_versions (id, tenant_id, created_by, updated_by, submission_id, assignment_id, task_id, item_id, labeler_id, round_no, template_version_id, submit_source, submit_data_json, submit_data_hash, submitted_at)
VALUES (19503, 1, 0, 0, 19003, 18003, 15003, 16003, 11001, 1, 13001, 'MANUAL', '{"label_text":"rejected work"}', 'p0wbappealpathsubmitdatahash00000000000000000000000000000001', CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE submission_id = VALUES(submission_id);

INSERT INTO submissions (id, tenant_id, created_by, updated_by, assignment_id, task_id, item_id, labeler_id, current_template_version_id, current_version_id, current_round_no, current_status, current_review_level, submit_count, last_submitted_at, finalized_at, last_action_code, is_current, version_no)
VALUES (19003, 1, 0, 0, 18003, 15003, 16003, 11001, 13001, 19503, 1, 'REJECTED', 'L1', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), 'REJECT', 1, 1)
ON DUPLICATE KEY UPDATE current_status = VALUES(current_status);

-- WB-CC-022: 凭证兑换（UNCLAIMED 槽位供 redeem 消费）
INSERT INTO task_items (id, tenant_id, created_by, updated_by, task_id, seq_no, source_item_key, payload_json, item_status)
VALUES (16004, 1, 0, 0, 15001, 3, 'item-claim-token', '{"prompt":"Claim token redeem"}', 'ACTIVE')
ON DUPLICATE KEY UPDATE task_id = VALUES(task_id);

INSERT INTO assignments (id, tenant_id, created_by, updated_by, task_id, item_id, slot_no, assign_type, claim_source, status, current_round_no, assigned_at)
VALUES (18004, 1, 0, 0, 15001, 16004, 1, 'AUTO_CLAIM', 'MARKET', 'UNCLAIMED', 1, CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- WB-QTA / WB-XSYS-007: QUOTA 任务（初始 quota=0，靠 release 放量）
INSERT INTO tasks (id, tenant_id, created_by, updated_by, task_code, owner_id, title, scene_code, status, distribute_strategy, quota, settings_json, published_at, current_template_version_id)
VALUES (15005, 1, 0, 0, 'P0_WB_QUOTA', 1001, 'P0 Quota Task', 'GENERAL', 'PUBLISHED', 'QUOTA', 0,
        '{"review":{"aiEnabled":false,"workflow":{"levels":[{"key":"L1","label":"初审","actions":["approve","reject","return"]}]}}}',
        CURRENT_TIMESTAMP(3), 13001)
ON DUPLICATE KEY UPDATE distribute_strategy = VALUES(distribute_strategy);

INSERT INTO task_items (id, tenant_id, created_by, updated_by, task_id, seq_no, source_item_key, payload_json, item_status)
VALUES (16005, 1, 0, 0, 15005, 1, 'quota-item-1', '{"prompt":"Quota claim"}', 'ACTIVE')
ON DUPLICATE KEY UPDATE task_id = VALUES(task_id);

INSERT INTO task_members (id, tenant_id, created_by, updated_by, task_id, user_id, member_role, permission_set_json, status, joined_at)
VALUES (17005, 1, 0, 0, 15005, 11001, 'LABELER', '[]', 'ACTIVE', CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE task_id = VALUES(task_id);

INSERT INTO assignments (id, tenant_id, created_by, updated_by, task_id, item_id, slot_no, assign_type, claim_source, status, current_round_no, assigned_at)
VALUES (18005, 1, 0, 0, 15005, 16005, 1, 'AUTO_CLAIM', 'MARKET', 'UNCLAIMED', 1, CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- WB-STS-003 / WB-XSYS-008: 状态历史（按日 backfill）
INSERT INTO submission_status_histories (id, tenant_id, created_by, updated_by, submission_id, task_id, assignment_id, round_no, from_status, to_status, action_code, operator_type, operator_id, occurred_at, idempotency_key)
VALUES (19601, 1, 0, 0, 19001, 15001, 18001, 1, 'DRAFT', 'SUBMITTED', 'SUBMIT', 'LABELER', 11001, '2026-06-01 08:00:00.000', 'p0wb-stats-submit-001')
ON DUPLICATE KEY UPDATE to_status = VALUES(to_status);

INSERT INTO submission_status_histories (id, tenant_id, created_by, updated_by, submission_id, task_id, assignment_id, round_no, from_status, to_status, action_code, operator_type, operator_id, occurred_at, idempotency_key)
VALUES (19602, 1, 0, 0, 19002, 15001, 18002, 1, 'SUBMITTED', 'HUMAN_REVIEWING', 'SUBMIT', 'LABELER', 11001, '2026-06-02 09:00:00.000', 'p0wb-stats-submit-002')
ON DUPLICATE KEY UPDATE to_status = VALUES(to_status);

INSERT INTO submission_status_histories (id, tenant_id, created_by, updated_by, submission_id, task_id, assignment_id, round_no, from_status, to_status, action_code, operator_type, operator_id, occurred_at, idempotency_key)
VALUES (19603, 1, 0, 0, 19002, 15001, 18002, 1, 'HUMAN_REVIEWING', 'APPROVED', 'APPROVE', 'REVIEWER', 1001, '2026-06-02 15:00:00.000', 'p0wb-stats-approve-001')
ON DUPLICATE KEY UPDATE to_status = VALUES(to_status);

INSERT INTO submission_status_histories (id, tenant_id, created_by, updated_by, submission_id, task_id, assignment_id, round_no, from_status, to_status, action_code, operator_type, operator_id, occurred_at, idempotency_key)
VALUES (19604, 1, 0, 0, 19001, 15001, 18001, 1, 'SUBMITTED', 'REJECTED', 'REJECT', 'REVIEWER', 1001, '2026-06-03 10:00:00.000', 'p0wb-stats-reject-001')
ON DUPLICATE KEY UPDATE to_status = VALUES(to_status);

-- WB-CC-042: 混合抢单（3 UNCLAIMED + 5 labeler）
INSERT INTO users (id, tenant_id, created_by, updated_by, username, password_hash, display_name, email, phone, status, register_source)
VALUES
  (11003, 1, 0, 0, 'labeler_002', '$2y$10$1RfoZFIzbXcHyq0LBGbloeddaFT.RswgBtOWxROPvGN4cdAL4ToTi', 'Labeler Two', 'labeler2@labelhub.local', '13800000003', 'ACTIVE', 'WEB'),
  (11004, 1, 0, 0, 'labeler_003', '$2y$10$1RfoZFIzbXcHyq0LBGbloeddaFT.RswgBtOWxROPvGN4cdAL4ToTi', 'Labeler Three', 'labeler3@labelhub.local', '13800000004', 'ACTIVE', 'WEB'),
  (11005, 1, 0, 0, 'labeler_004', '$2y$10$1RfoZFIzbXcHyq0LBGbloeddaFT.RswgBtOWxROPvGN4cdAL4ToTi', 'Labeler Four', 'labeler4@labelhub.local', '13800000005', 'ACTIVE', 'WEB'),
  (11006, 1, 0, 0, 'labeler_005', '$2y$10$1RfoZFIzbXcHyq0LBGbloeddaFT.RswgBtOWxROPvGN4cdAL4ToTi', 'Labeler Five', 'labeler5@labelhub.local', '13800000006', 'ACTIVE', 'WEB')
ON DUPLICATE KEY UPDATE username = VALUES(username);

INSERT INTO user_roles (id, tenant_id, created_by, updated_by, user_id, role_id)
VALUES
  (31003, 1, 0, 0, 11003, 2003),
  (31004, 1, 0, 0, 11004, 2003),
  (31005, 1, 0, 0, 11005, 2003),
  (31006, 1, 0, 0, 11006, 2003)
ON DUPLICATE KEY UPDATE user_id = VALUES(user_id);

INSERT INTO tasks (id, tenant_id, created_by, updated_by, task_code, owner_id, title, scene_code, status, distribute_strategy, quota, settings_json, published_at, current_template_version_id)
VALUES (15006, 1, 0, 0, 'P2_WB_MIXED_CLAIM', 1001, 'P2 Mixed Claim Task', 'GENERAL', 'PUBLISHED', 'FIRST_COME', 3,
        '{"review":{"aiEnabled":false,"workflow":{"levels":[{"key":"L1","label":"初审","actions":["approve","reject","return"]}]}}}',
        CURRENT_TIMESTAMP(3), 13001)
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO task_members (id, tenant_id, created_by, updated_by, task_id, user_id, member_role, permission_set_json, status, joined_at)
VALUES
  (17006, 1, 0, 0, 15006, 11001, 'LABELER', '[]', 'ACTIVE', CURRENT_TIMESTAMP(3)),
  (17007, 1, 0, 0, 15006, 11003, 'LABELER', '[]', 'ACTIVE', CURRENT_TIMESTAMP(3)),
  (17008, 1, 0, 0, 15006, 11004, 'LABELER', '[]', 'ACTIVE', CURRENT_TIMESTAMP(3)),
  (17009, 1, 0, 0, 15006, 11005, 'LABELER', '[]', 'ACTIVE', CURRENT_TIMESTAMP(3)),
  (17010, 1, 0, 0, 15006, 11006, 'LABELER', '[]', 'ACTIVE', CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE task_id = VALUES(task_id);

INSERT INTO task_items (id, tenant_id, created_by, updated_by, task_id, seq_no, source_item_key, payload_json, item_status)
VALUES
  (16006, 1, 0, 0, 15006, 1, 'mixed-item-1', '{"prompt":"Mixed claim 1"}', 'ACTIVE'),
  (16007, 1, 0, 0, 15006, 2, 'mixed-item-2', '{"prompt":"Mixed claim 2"}', 'ACTIVE'),
  (16008, 1, 0, 0, 15006, 3, 'mixed-item-3', '{"prompt":"Mixed claim 3"}', 'ACTIVE')
ON DUPLICATE KEY UPDATE task_id = VALUES(task_id);

INSERT INTO assignments (id, tenant_id, created_by, updated_by, task_id, item_id, slot_no, assign_type, claim_source, status, current_round_no, assigned_at)
VALUES
  (18006, 1, 0, 0, 15006, 16006, 1, 'AUTO_CLAIM', 'MARKET', 'UNCLAIMED', 1, CURRENT_TIMESTAMP(3)),
  (18007, 1, 0, 0, 15006, 16007, 1, 'AUTO_CLAIM', 'MARKET', 'UNCLAIMED', 1, CURRENT_TIMESTAMP(3)),
  (18008, 1, 0, 0, 15006, 16008, 1, 'AUTO_CLAIM', 'MARKET', 'UNCLAIMED', 1, CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE status = 'UNCLAIMED', labeler_id = NULL;
