-- 回填演示 seed 中缺失的 submission_appeals 记录（submissions 已有申诉态但无申诉主记录）

INSERT INTO submission_appeals (
  id, tenant_id, created_by, updated_by,
  submission_id, assignment_id, task_id, labeler_id, owner_id,
  appeal_no, status, reason_text, decision_reason_text, decided_by, decided_at,
  created_at, updated_at
)
SELECT
  910252000001, 1, 910100000101, 910100000101,
  910238000019, 910237000020, 910230000009, 910100000101, 910100000001,
  1, 'PENDING', '终审驳回理由不充分，申请复核', NULL, NULL, NULL,
  '2026-06-03 10:11:00.000', '2026-06-03 10:11:00.000'
FROM DUAL
WHERE EXISTS (
  SELECT 1 FROM submissions s
  WHERE s.id = 910238000019 AND s.deleted_flag = 0 AND s.appeal_count > 0
)
AND NOT EXISTS (
  SELECT 1 FROM submission_appeals a
  WHERE a.submission_id = 910238000019 AND a.deleted_flag = 0
);

INSERT INTO submission_appeals (
  id, tenant_id, created_by, updated_by,
  submission_id, assignment_id, task_id, labeler_id, owner_id,
  appeal_no, status, reason_text, decision_reason_text, decided_by, decided_at,
  created_at, updated_at
)
SELECT
  910252000002, 1, 910100000101, 910100000101,
  910238000020, 910237000021, 910230000009, 910100000101, 910100000001,
  1, 'APPROVED', '标注标准理解有偏差', '同意申诉，请按指引修改后重提', 910100000001, '2026-06-03 10:12:00.000',
  '2026-06-03 10:11:00.000', '2026-06-03 10:12:00.000'
FROM DUAL
WHERE EXISTS (
  SELECT 1 FROM submissions s
  WHERE s.id = 910238000020 AND s.deleted_flag = 0
)
AND NOT EXISTS (
  SELECT 1 FROM submission_appeals a
  WHERE a.submission_id = 910238000020 AND a.deleted_flag = 0
);

INSERT INTO submission_appeals (
  id, tenant_id, created_by, updated_by,
  submission_id, assignment_id, task_id, labeler_id, owner_id,
  appeal_no, status, reason_text, decision_reason_text, decided_by, decided_at,
  created_at, updated_at
)
SELECT
  910252000003, 1, 910100000101, 910100000101,
  910238000021, 910237000022, 910230000009, 910100000101, 910100000001,
  1, 'REJECTED', '对驳回结论不认可', '经复核维持原判', 910100000001, '2026-06-03 10:13:00.000',
  '2026-06-03 10:11:00.000', '2026-06-03 10:13:00.000'
FROM DUAL
WHERE EXISTS (
  SELECT 1 FROM submissions s
  WHERE s.id = 910238000021 AND s.deleted_flag = 0
)
AND NOT EXISTS (
  SELECT 1 FROM submission_appeals a
  WHERE a.submission_id = 910238000021 AND a.deleted_flag = 0
);
